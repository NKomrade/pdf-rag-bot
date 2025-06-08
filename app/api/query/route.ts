import { NextRequest, NextResponse } from 'next/server';
import { queryVectors } from '@/lib/vectorStore';
import { callFlanT5 } from '@/lib/llm';

// Simple local responses for testing when no documents are available
const generateLocalResponse = (query: string): string => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
    return "Hello! I'm your AI assistant. I can help you with questions about your uploaded documents.";
  } else if (lowerQuery.includes('how are you')) {
    return "I'm doing well, thank you! I'm here to help you analyze and understand your PDF documents.";
  } else {
    return `I'd be happy to help you with "${query}". Please upload a PDF document first, and I'll be able to provide detailed answers based on its content.`;
  }
};

export async function POST(req: NextRequest) {
  let query = '';
  try {
    const body = await req.json();
    const { query: userQuery, conversationHistory = [] } = body;
    query = userQuery;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    console.log('🔍 Processing query:', query);

    // Try to use RAG with stored documents first
    if (process.env.HUGGINGFACE_API_KEY && process.env.MONGODB_URI) {
      try {
        console.log('🔍 Searching for relevant documents...');
        
        // Query vector store for relevant documents
        const relevantDocs = await queryVectors(query, 3);
        console.log('📄 Vector search results:', relevantDocs?.length || 0);
        
        if (relevantDocs && relevantDocs.length > 0) {
          console.log(`✅ Found ${relevantDocs.length} relevant document chunks`);
          console.log('Sample chunk:', relevantDocs[0]?.pageContent?.substring(0, 200) + '...');
          console.log('Similarity scores:', relevantDocs.map((doc: any) => doc.similarity?.toFixed(3)));
          
          // Build context from relevant documents
          const context = relevantDocs
            .map((doc: any) => doc.pageContent)
            .join('\n\n');

          // Build prompt for Hugging Face model
          const prompt = `Based on the following document context, please answer the user's question. If the answer is not in the context, say so clearly.

Context from documents:
${context}

Question: ${query}

Answer:`;

          console.log('🤖 Sending to Hugging Face Flan-T5 model...');
          // Use Hugging Face model for response generation
          const response = await callFlanT5(prompt);
          console.log('✅ Got response from Flan-T5 model:', response?.substring(0, 100) + '...');
          
          if (response && response.trim().length > 0) {
            return NextResponse.json({ response });
          } else {
            console.log('⚠️ Empty response from Flan-T5, falling back to context summary');
            return NextResponse.json({ 
              response: `Based on the document content, here's what I found relevant to your question: ${context.substring(0, 500)}...` 
            });
          }
        } else {
          console.log('❌ No relevant documents found in vector store');
          return NextResponse.json({ 
            response: `I couldn't find any relevant information in the uploaded documents for "${query}". Please make sure you've uploaded a PDF that contains information related to your question.` 
          });
        }
      } catch (error) {
        console.error('❌ Error in RAG pipeline:', error);
        return NextResponse.json({ 
          response: `I encountered an error while searching the documents: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question.` 
        });
      }
    } else {
      console.log('⚠️ Missing environment variables for RAG');
      console.log('HF Key:', !!process.env.HUGGINGFACE_API_KEY);
      console.log('MongoDB URI:', !!process.env.MONGODB_URI);
      
      return NextResponse.json({ 
        response: 'The document search system is not properly configured. Please check the environment variables.' 
      });
    }
    
  } catch (error: any) {
    console.error('Query error:', error);
    console.error('Error details:', error.message);
    
    return NextResponse.json({ 
      response: `I apologize, but I'm currently experiencing technical difficulties. I received your question "${query}" but couldn't process it properly. Please try again later.`
    });
  }
}
