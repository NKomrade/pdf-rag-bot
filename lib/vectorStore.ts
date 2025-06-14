import path from 'path';
import fs from 'fs';
import { readFile } from 'fs/promises';
import { HuggingFaceEmbeddings, cosineSimilarity } from '@/lib/embeddings';
import { MongoClient } from 'mongodb';

interface DocumentChunk {
  text?: string;
  pageContent?: string;
  embedding?: number[];
  metadata?: {
    filename?: string;
    [key: string]: unknown;
  };
  id?: string;
  createdAt?: Date;
}

// File-based storage path
const STORAGE_FILE = path.join(process.cwd(), 'temp', 'chunks.json');

async function loadChunksFromFile(): Promise<DocumentChunk[]> {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const fileContent = await readFile(STORAGE_FILE, 'utf-8');
      return JSON.parse(fileContent);
    }
    return [];
  } catch (error) {
    console.error('Error loading chunks from file:', error);
    return [];
  }
}

async function queryMongoDB(): Promise<DocumentChunk[]> {
  try {
    console.log('🔄 Attempting MongoDB connection...');
    const client = new MongoClient(process.env.MONGODB_URI!, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    const db = client.db('rag_chatbot');
    const collection = db.collection('document_chunks');
    
    console.log('📊 Fetching document chunks from MongoDB...');
    const documents = await collection.find({}).toArray();
    await client.close();
    
    // Flatten all chunks from all documents
    const allChunks: DocumentChunk[] = [];
    documents.forEach(doc => {
      if (doc.chunks && Array.isArray(doc.chunks)) {
        doc.chunks.forEach((chunk: any) => {
          allChunks.push({
            text: chunk.text,
            pageContent: chunk.text,
            embedding: chunk.embedding,
            metadata: chunk.metadata,
            id: `${doc.id}-chunk-${chunk.chunkIndex}`,
            createdAt: doc.createdAt
          });
        });
      }
    });
    
    return allChunks;
  } catch (error) {
    console.error('❌ MongoDB query failed:', error);
    throw error;
  }
}

// Function to query vectors for RAG using semantic similarity
export const queryVectors = async (query: string, topK: number = 5) => {
  try {    console.log('🔍 Querying for relevant documents using vector similarity...');
    console.log('Query:', query);

    let allChunks: DocumentChunk[] = [];
    let sourceMethod = '';

    // Try MongoDB first
    if (process.env.MONGODB_URI) {
      try {
        allChunks = await queryMongoDB();
        sourceMethod = 'MongoDB';
        console.log(`📄 Found ${allChunks.length} chunks in MongoDB`);
      } catch {
        console.log('⚠️ MongoDB failed, trying local storage...');
        allChunks = await loadChunksFromFile();
        sourceMethod = 'Local File';
        console.log(`📄 Found ${allChunks.length} chunks in local file`);
      }
    } else {
      allChunks = await loadChunksFromFile();
      sourceMethod = 'Local File';
      console.log(`📄 Found ${allChunks.length} chunks in local file`);
    }
    
    if (allChunks.length === 0) {
      console.log('❌ No document chunks found in any storage');
      return [];
    }

    // Check if chunks have embeddings
    const hasEmbeddings = allChunks.some(chunk => chunk.embedding && Array.isArray(chunk.embedding));
    
    if (hasEmbeddings && process.env.HUGGINGFACE_API_KEY) {
      console.log('🔄 Creating query embedding for semantic search...');
      const embeddingService = new HuggingFaceEmbeddings();
      const queryEmbedding = await embeddingService.createEmbedding(query);
        console.log('🔍 Calculating cosine similarities...');
      const similarities = allChunks
        .filter(chunk => chunk.embedding && Array.isArray(chunk.embedding))
        .map(chunk => ({
          ...chunk,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding!)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      const results = similarities.map(result => ({
        pageContent: result.text || result.pageContent,
        metadata: result.metadata || {},
        similarity: result.similarity
      }));

      console.log(`✅ Found ${results.length} relevant chunks using semantic search (${sourceMethod})`);
      console.log('Similarity scores:', results.map(r => r.similarity.toFixed(3)));
      console.log('Sample chunk:', results[0]?.pageContent?.substring(0, 150) + '...');
      
      return results;
      
    } else {
      // Fallback to text-based search
      console.log('⚠️ No embeddings found, falling back to text-based search...');
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
      
      const matchingChunks = allChunks
        .map(chunk => {
          const text = chunk.text || chunk.pageContent || '';
          const textLower = text.toLowerCase();
          const wordMatches = queryWords.filter(word => textLower.includes(word)).length;
          
          return {
            text: text,
            metadata: chunk.metadata || {},
            similarity: wordMatches / Math.max(queryWords.length, 1)
          };
        })
        .filter(chunk => chunk.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      const results = matchingChunks.map(result => ({
        pageContent: result.text,
        metadata: result.metadata,
        similarity: result.similarity
      }));

      console.log(`✅ Found ${results.length} relevant chunks using text search (${sourceMethod})`);
      console.log('Text similarity scores:', results.map(r => r.similarity.toFixed(3)));
      
      return results;
    }
    
  } catch (error) {
    console.error('❌ Error querying vectors:', error);
    throw error;
  }
};
