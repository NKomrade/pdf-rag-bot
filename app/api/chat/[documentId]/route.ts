import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { HuggingFaceEmbeddings } from '@/lib/embeddings';

const STORAGE_FILE = path.join(process.cwd(), 'temp', 'chunks.json');

interface ChunkMetadata {
  documentId?: string;
  page?: number;
  [key: string]: unknown;
}

interface DocumentChunk {
  text?: string;
  pageContent?: string;
  metadata?: ChunkMetadata;
  embedding: number[];
  documentId?: string;
}

interface SimilarityResult {
  index: number;
  text: string;
  metadata?: ChunkMetadata;
  similarity: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

async function getDocumentChunks(documentId: string) {
  console.log(`🔍 Fetching chunks for document ID: ${documentId}`);
  
  // Try MongoDB first
  if (process.env.MONGODB_URI) {
    try {
      console.log('🔄 Connecting to MongoDB...');
      const client = new MongoClient(process.env.MONGODB_URI!, {
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 10000,
      });
      
      await client.connect();
      const db = client.db('rag_chatbot');
      const collection = db.collection('document_chunks');
      
      const document = await collection.findOne({ documentId });
      await client.close();
      
      if (document) {
        console.log(`✅ Found document in MongoDB with ${document.totalChunks} chunks`);
        return document.chunks;
      }
      
    } catch (mongoError) {
      console.error('❌ MongoDB query failed:', mongoError);
      console.log('⚠️ Falling back to local storage...');
    }
  }
    // Fallback to local storage
  if (fs.existsSync(STORAGE_FILE)) {
    console.log('🔄 Checking local storage...');
    const localContent = await readFile(STORAGE_FILE, 'utf-8');
    const localChunks: DocumentChunk[] = JSON.parse(localContent);
    
    const documentChunks = localChunks.filter((chunk: DocumentChunk) => 
      chunk.documentId === documentId || chunk.metadata?.documentId === documentId
    );
    
    if (documentChunks.length > 0) {
      console.log(`✅ Found ${documentChunks.length} chunks in local storage`);
      return documentChunks;
    }
  }
  
  throw new Error(`Document with ID ${documentId} not found`);
}

async function retrieveRelevantChunks(query: string, documentId: string, topK: number = 3) {
  console.log(`🔍 Retrieving relevant chunks for query: "${query}" from document: ${documentId}`);
  
  // Get embeddings service
  const embeddingService = new HuggingFaceEmbeddings();
  
  // Create embedding for the query
  console.log('🔄 Creating query embedding...');
  const queryEmbedding = await embeddingService.createEmbeddings([query]);
  
  // Get document chunks
  const chunks = await getDocumentChunks(documentId);
    // Calculate similarities
  console.log(`🔄 Calculating similarities with ${chunks.length} chunks...`);
  const similarities: SimilarityResult[] = chunks.map((chunk: DocumentChunk, index: number) => ({
    index,
    text: chunk.text || chunk.pageContent || '',
    metadata: chunk.metadata,
    similarity: cosineSimilarity(queryEmbedding[0], chunk.embedding)
  }));
  
  // Sort by similarity and get top K
  similarities.sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity);
  const topChunks = similarities.slice(0, topK);  
  console.log(`✅ Found ${topChunks.length} relevant chunks`);
  topChunks.forEach((chunk: SimilarityResult, i: number) => {
    console.log(`   ${i + 1}. Similarity: ${chunk.similarity.toFixed(4)} - ${chunk.text.substring(0, 100)}...`);
  });
  
  return topChunks;
}

export async function POST(req: Request) {
  console.log('=== RAG CHAT REQUEST ===');
  
  try {
    const { query, documentId, maxTokens = 1000 } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
    console.log(`📝 Query: ${query}`);
    console.log(`📄 Document ID: ${documentId}`);
    
    // Check for required environment variables
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: 'Hugging Face API key not configured' }, { status: 500 });
    }
    
    // Retrieve relevant chunks
    const relevantChunks = await retrieveRelevantChunks(query, documentId);
    
    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find relevant information in the specified document to answer your question.",
        sources: [],
        documentId
      });
    }
      // Prepare context from relevant chunks
    const context = relevantChunks
      .map((chunk: SimilarityResult) => chunk.text)
      .join('\n\n');
    
    // Create prompt for the LLM
    const prompt = `Context from the document:
${context}

Question: ${query}

Based ONLY on the context provided above from the uploaded document, please provide a comprehensive answer. If the information is not available in the context, clearly state that the information is not found in the document.

Answer:`;
    
    console.log('🤖 Sending request to Hugging Face API...');
    
    // Call Hugging Face API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Received response from Hugging Face API');
    
    const answer = result[0]?.generated_text || "I couldn't generate a response. Please try again.";
    
    return NextResponse.json({
      answer,      sources: relevantChunks.map((chunk: SimilarityResult) => ({
        text: chunk.text.substring(0, 200) + '...',
        similarity: chunk.similarity,
        metadata: chunk.metadata
      })),
      documentId,
      chunksUsed: relevantChunks.length,
      note: 'Answer is based only on the specified document content.'
    });
    
  } catch (error) {
    console.error('❌ RAG Chat error:', error);
    return NextResponse.json({
      error: 'Failed to process chat request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}