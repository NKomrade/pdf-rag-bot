import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { readFile } from 'fs/promises';

interface ChunkData {
  pageContent?: string;
  metadata?: {
    filename?: string;
    uploadedAt?: string;
  };
}

const STORAGE_FILE = path.join(process.cwd(), 'temp', 'chunks.json');

async function checkMongoDB() {
  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI!, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    const db = client.db('rag_chatbot');
    const collection = db.collection('document_chunks');
      const count = await collection.countDocuments();
    const samples = await collection.find({}).limit(2).toArray();
    
    await client.close();
    
    return {
      available: true,
      count,
      totalChunks: samples.reduce((sum, doc) => sum + (doc.totalChunks || 0), 0),
      samples: samples.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        totalChunks: doc.totalChunks,
        textPreview: doc.chunks?.[0]?.text?.substring(0, 100) + '...',
        createdAt: doc.createdAt
      }))
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkLocalStorage() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const fileContent = await readFile(STORAGE_FILE, 'utf-8');
      const chunks: ChunkData[] = JSON.parse(fileContent);
      return {
        available: true,
        count: chunks.length,
        samples: chunks.slice(0, 2).map((chunk: ChunkData) => ({
          filename: chunk.metadata?.filename,
          textPreview: chunk.pageContent?.substring(0, 100) + '...',
          uploadedAt: chunk.metadata?.uploadedAt
        }))
      };
    } else {
      return {
        available: false,
        error: 'Storage file does not exist'
      };
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET() {
  try {
    console.log('🔍 Checking document storage status...');
    
    const mongoStatus = await checkMongoDB();
    const localStatus = await checkLocalStorage();
    
    const status = {
      timestamp: new Date().toISOString(),
      mongodb: mongoStatus,
      localStorage: localStatus,
      environment: {
        hasMongoUri: !!process.env.MONGODB_URI,
        hasHfKey: !!process.env.HUGGINGFACE_API_KEY,
      }
    };
    
    console.log('📊 Storage status:', status);
    
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('❌ Error checking storage status:', error);
    return NextResponse.json({ 
      error: 'Failed to check storage status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}