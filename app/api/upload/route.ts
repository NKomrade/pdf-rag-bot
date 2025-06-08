import { NextResponse } from 'next/server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { MongoClient } from 'mongodb';

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);

async function storeChunksInMongoDB(chunks: any[]) {
  try {
    await client.connect();
    const db = client.db('rag_chatbot');
    const collection = db.collection('document_chunks');
    
    // Create dummy embeddings for now (384-dimensional zero vectors)
    const documents = chunks.map((chunk, index) => ({
      id: `${chunk.metadata.filename}-${index}-${Date.now()}`,
      text: chunk.pageContent,
      embedding: new Array(384).fill(0), // Dummy embedding for testing
      metadata: chunk.metadata,
      createdAt: new Date()
    }));
    
    await collection.insertMany(documents);
    await client.close();
    
    console.log(`✅ Stored ${documents.length} chunks in MongoDB (with dummy embeddings)`);
    return documents.length;
  } catch (error) {
    console.error('❌ Error storing in MongoDB:', error);
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    throw error;
  }
}

export async function POST(req: Request) {
  console.log('=== UPLOAD API CALLED ===');
  
  try {
    console.log('1. Parsing form data...');
    const data = await req.formData();
    const file = data.get('file') as File;
    
    console.log('2. File received:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });
    
    if (!file) {
      console.log('❌ No file uploaded');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      console.log('❌ Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    console.log('3. Checking environment variables...');
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB URI not configured' }, { status: 500 });
    }

    console.log('4. ✅ Starting PDF processing...');
    
    // Create temp directory if it doesn't exist
    console.log('5. Setting up temp directory...');
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    // Save file temporarily
    console.log('6. Saving file temporarily...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tempPath = path.join(tempDir, `${Date.now()}-${file.name}`);
    
    await writeFile(tempPath, buffer);
    console.log('✅ File saved to:', tempPath);

    try {
      // Load and split PDF
      console.log('7. Loading PDF...');
      const loader = new PDFLoader(tempPath);
      const docs = await loader.load();
      
      console.log(`✅ Loaded ${docs.length} pages from PDF`);
      console.log('Sample content:', docs[0]?.pageContent?.substring(0, 200) + '...');

      // Split documents into chunks
      console.log('8. Splitting documents...');
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      
      const splitDocs = await textSplitter.splitDocuments(docs);
      console.log(`✅ Split into ${splitDocs.length} chunks`);

      // Add metadata to chunks
      console.log('9. Adding metadata...');
      const docsWithMetadata = splitDocs.map((doc, index) => ({
        ...doc,
        metadata: {
          ...doc.metadata,
          filename: file.name,
          chunkIndex: index,
          uploadedAt: new Date().toISOString(),
        },
      }));

      // Store in MongoDB (without real embeddings for now)
      console.log('10. Storing chunks in MongoDB...');
      const storedCount = await storeChunksInMongoDB(docsWithMetadata);

      console.log(`✅ Successfully processed and stored ${storedCount} chunks`);

      return NextResponse.json({ 
        message: 'PDF uploaded and processed successfully (using dummy embeddings for testing).',
        filename: file.name,
        size: file.size,
        chunks: docsWithMetadata.length,
        pages: docs.length,
        stored: storedCount,
        note: 'Embeddings are temporarily disabled for testing. Text chunks are stored and searchable.'
      });

    } finally {
      // Clean up temporary file
      console.log('11. Cleaning up temp file...');
      try {
        await unlink(tempPath);
        console.log('✅ Temp file deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting temp file:', error);
      }
    }

  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json({ 
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: typeof error,
      errorName: error instanceof Error ? error.name : 'Unknown'
    }, { status: 500 });
  }
}