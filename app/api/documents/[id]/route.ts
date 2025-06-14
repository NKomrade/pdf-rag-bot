import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

const STORAGE_FILE = path.join(process.cwd(), 'temp', 'chunks.json');

export async function GET(req: Request, { params }: { params: { id: string } }) {
  console.log(`🔍 Fetching document chunks for ID: ${params.id}`);
  
  try {
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
        
        const document = await collection.findOne({ documentId: params.id });
        await client.close();
        
        if (document) {
          console.log(`✅ Found document in MongoDB with ${document.totalChunks} chunks`);
          return NextResponse.json({
            success: true,
            documentId: document.documentId,
            filename: document.filename,
            chunks: document.chunks,
            totalChunks: document.totalChunks,
            source: 'MongoDB'
          });
        } else {
          console.log(`❌ Document not found in MongoDB`);
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
      const localChunks = JSON.parse(localContent);
      
      // Filter chunks by documentId
      const documentChunks = localChunks.filter((chunk: any) => 
        chunk.documentId === params.id || chunk.metadata?.documentId === params.id
      );
      
      if (documentChunks.length > 0) {
        console.log(`✅ Found ${documentChunks.length} chunks in local storage`);
        return NextResponse.json({
          success: true,
          documentId: params.id,
          filename: documentChunks[0].metadata?.filename || 'Unknown',
          chunks: documentChunks,
          totalChunks: documentChunks.length,
          source: 'Local File'
        });
      }
    }
    
    console.log(`❌ Document with ID ${params.id} not found`);
    return NextResponse.json({
      success: false,
      error: 'Document not found',
      documentId: params.id
    }, { status: 404 });
    
  } catch (error) {
    console.error('❌ Error fetching document:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch document',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get all available documents
export async function POST(req: Request) {
  console.log('🔍 Fetching all available documents...');
  
  try {
    const documents: any[] = [];
    
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
        
        const mongoDocs = await collection.find({}, {
          projection: { documentId: 1, filename: 1, totalChunks: 1, createdAt: 1, uploadTimestamp: 1 }
        }).toArray();
        
        await client.close();
        
        documents.push(...mongoDocs.map(doc => ({
          documentId: doc.documentId,
          filename: doc.filename,
          totalChunks: doc.totalChunks,
          createdAt: doc.createdAt,
          uploadTimestamp: doc.uploadTimestamp,
          source: 'MongoDB'
        })));
        
        console.log(`✅ Found ${mongoDocs.length} documents in MongoDB`);
        
      } catch (mongoError) {
        console.error('❌ MongoDB query failed:', mongoError);
        console.log('⚠️ Falling back to local storage...');
      }
    }
    
    // Check local storage
    if (fs.existsSync(STORAGE_FILE)) {
      console.log('🔄 Checking local storage...');
      const localContent = await readFile(STORAGE_FILE, 'utf-8');
      const localChunks = JSON.parse(localContent);
      
      // Group chunks by documentId
      const documentGroups = localChunks.reduce((groups: any, chunk: any) => {
        const docId = chunk.documentId || chunk.metadata?.documentId;
        if (docId) {
          if (!groups[docId]) {
            groups[docId] = {
              documentId: docId,
              filename: chunk.metadata?.filename || 'Unknown',
              chunks: [],
              createdAt: chunk.createdAt,
              source: 'Local File'
            };
          }
          groups[docId].chunks.push(chunk);
        }
        return groups;
      }, {});
      
      const localDocs = Object.values(documentGroups).map((group: any) => ({
        documentId: group.documentId,
        filename: group.filename,
        totalChunks: group.chunks.length,
        createdAt: group.createdAt,
        source: group.source
      }));
      
      documents.push(...localDocs);
      console.log(`✅ Found ${localDocs.length} documents in local storage`);
    }
    
    return NextResponse.json({
      success: true,
      documents: documents,
      total: documents.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching documents:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}