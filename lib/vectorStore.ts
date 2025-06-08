import { MongoClient } from 'mongodb';

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI!);

// Function to query vectors for RAG
export const queryVectors = async (query: string, topK: number = 5) => {
  try {
    console.log('🔍 Querying MongoDB for relevant documents...');
    console.log('Query:', query);

    // Connect to MongoDB and get all chunks
    await client.connect();
    const db = client.db('rag_chatbot');
    const collection = db.collection('document_chunks');
    
    console.log('📊 Fetching document chunks from MongoDB...');
    const allChunks = await collection.find({}).toArray();
    console.log(`📄 Found ${allChunks.length} chunks in database`);
    
    if (allChunks.length === 0) {
      console.log('❌ No document chunks found in database');
      await client.close();
      return [];
    }

    // For now, do simple text matching instead of vector similarity
    console.log('🔍 Performing text-based search...');
    const queryLower = query.toLowerCase();
    const matchingChunks = allChunks
      .map((chunk: any) => {
        const textLower = chunk.text?.toLowerCase() || '';
        const wordMatches = queryLower.split(' ').filter(word => 
          word.length > 2 && textLower.includes(word)
        ).length;
        
        return {
          text: chunk.text,
          metadata: chunk.metadata,
          similarity: wordMatches / Math.max(queryLower.split(' ').length, 1)
        };
      })
      .filter((chunk: any) => chunk.similarity > 0)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, topK);

    await client.close();
    
    const results = matchingChunks.map((result: any) => ({
      pageContent: result.text,
      metadata: result.metadata,
      similarity: result.similarity
    }));

    console.log(`✅ Found ${results.length} relevant chunks with text similarity scores:`, 
      results.map((r: any) => r.similarity.toFixed(3)));
    
    return results;
    
  } catch (error) {
    console.error('❌ Error querying vectors:', error);
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    throw error;
  }
};
