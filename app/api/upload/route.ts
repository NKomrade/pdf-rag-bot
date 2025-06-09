import { NextResponse } from 'next/server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { HuggingFaceEmbeddings } from '@/lib/embeddings';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { MongoClient } from 'mongodb';

interface ChunkData {
  pageContent: string;
  metadata: {
    filename: string;
    chunkIndex: number;
    uploadedAt: string;
    [key: string]: unknown;
  };
}

// File-based storage as backup
const STORAGE_FILE = path.join(process.cwd(), 'temp', 'chunks.json');

async function ensureStorageDir() {
  const tempDir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }
}

async function storeChunksWithEmbeddings(chunks: ChunkData[], embeddings: number[][]) {
  console.log('🔄 Storing chunks with embeddings...');
  
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
      
      // Clear previous documents before inserting new ones
      console.log('🧹 Clearing previous document chunks...');
      await collection.deleteMany({});
      console.log('✅ Previous chunks cleared from MongoDB');
      
      const documents = chunks.map((chunk, index) => ({
        id: `${chunk.metadata.filename}-${index}-${Date.now()}`,
        text: chunk.pageContent,
        embedding: embeddings[index],
        metadata: chunk.metadata,
        createdAt: new Date()
      }));
      
      await collection.insertMany(documents);
      await client.close();
      
      console.log(`✅ Stored ${documents.length} chunks with embeddings in MongoDB`);
      return { method: 'MongoDB', count: documents.length };
      
    } catch (mongoError) {
      console.error('❌ MongoDB storage failed:', mongoError);
      console.log('⚠️ Falling back to local storage...');
    }
  }
    // Fallback to local storage
  try {
    await ensureStorageDir();
    
    // Clear previous local storage before adding new chunks
    console.log('🧹 Clearing previous local chunks...');
    if (fs.existsSync(STORAGE_FILE)) {
      await writeFile(STORAGE_FILE, JSON.stringify([], null, 2));
    }
    console.log('✅ Previous chunks cleared from local storage');
    
    const documents = chunks.map((chunk, index) => ({
      id: `${chunk.metadata.filename}-${index}-${Date.now()}`,
      text: chunk.pageContent,
      pageContent: chunk.pageContent, // For compatibility
      embedding: embeddings[index],
      metadata: chunk.metadata,
      createdAt: new Date()
    }));
    
    // Store only new chunks (no appending)
    await writeFile(STORAGE_FILE, JSON.stringify(documents, null, 2));
    
    console.log(`✅ Stored ${documents.length} chunks with embeddings in local file`);
    return { method: 'Local File', count: documents.length };
    
  } catch (error) {
    console.error('❌ Local storage also failed:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  console.log('=== PDF UPLOAD WITH EMBEDDINGS ===');
  
  try {
    console.log('1. Parsing form data...');
    const data = await req.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    console.log(`📄 Processing new document: "${file.name}"`);
    console.log('🔄 This will replace any previously uploaded document');

    console.log('2. Checking environment variables...');
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ error: 'Hugging Face API key not configured' }, { status: 500 });
    }

  console.log('3. Setting up temp directory...');
  // Use /tmp for serverless environments, temp for local
  const tempDir = process.env.NODE_ENV === 'production' 
    ? '/tmp' 
    : path.join(process.cwd(), 'temp');
    
  if (!fs.existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }    console.log('4. Saving file temporarily...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    await writeFile(tempPath, buffer);

    try {
      console.log('5. Loading PDF...');
      const loader = new PDFLoader(tempPath);
      const docs = await loader.load();
      console.log(`✅ Loaded ${docs.length} pages from PDF`);

      console.log('6. Splitting documents into chunks...');
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const splitDocs = await textSplitter.splitDocuments(docs);
      console.log(`✅ Split into ${splitDocs.length} chunks`);

      console.log('7. Adding metadata to chunks...');
      const docsWithMetadata = splitDocs.map((doc, index) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          filename: file.name,
          chunkIndex: index,
          uploadedAt: new Date().toISOString(),
        },
      }));

      console.log('8. Creating embeddings using Hugging Face...');
      const embeddingService = new HuggingFaceEmbeddings();
      const texts = docsWithMetadata.map(doc => doc.pageContent);
      const embeddings = await embeddingService.createEmbeddings(texts);

      console.log('9. Storing chunks with embeddings...');
      const storageResult = await storeChunksWithEmbeddings(docsWithMetadata, embeddings);

      // Check final storage status
      console.log('\n📊 === FINAL STORAGE STATUS ===');      if (process.env.MONGODB_URI) {
        try {
          const client = new MongoClient(process.env.MONGODB_URI!, { connectTimeoutMS: 5000 });
          await client.connect();
          const db = client.db('rag_chatbot');
          const collection = db.collection('document_chunks');
          const mongoCount = await collection.countDocuments();
          await client.close();
          console.log(`MongoDB: ✅ ${mongoCount} total chunks`);
        } catch {
          console.log(`MongoDB: ❌ Connection failed`);
        }
      }
        if (fs.existsSync(STORAGE_FILE)) {
        const localContent = await readFile(STORAGE_FILE, 'utf-8');
        const localChunks: ChunkData[] = JSON.parse(localContent);
        console.log(`Local File: ✅ ${localChunks.length} total chunks`);
      }
      console.log('=== END STORAGE STATUS ===\n');      return NextResponse.json({ 
        message: `New PDF "${file.name}" uploaded and processed successfully using ${storageResult.method}. Previous document data has been replaced.`,
        filename: file.name,
        size: file.size,
        chunks: docsWithMetadata.length,
        pages: docs.length,
        stored: storageResult.count,
        storageMethod: storageResult.method,
        embeddingsCreated: true,
        note: 'Document chunks with vector embeddings are ready for semantic search. Previous document has been replaced.'
      });

    } finally {
      console.log('10. Cleaning up temp file...');
      try {
        await unlink(tempPath);
      } catch (error) {
        console.error('❌ Error deleting temp file:', error);
      }
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}