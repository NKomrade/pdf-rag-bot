import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, conversationHistory = [] } = body;

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json({ 
        error: 'Hugging Face API key not configured' 
      }, { status: 500 });
    }

    // Build a single prompt with conversation context
    let prompt = 'You are a helpful AI assistant that can answer questions about uploaded PDF documents.\n\n';
    
    // Add conversation history
    conversationHistory.forEach((msg: any) => {
      if (msg.role === 'user') {
        prompt += `Human: ${msg.content}\n`;
      } else {
        prompt += `Assistant: ${msg.content}\n`;
      }
    });
    
    prompt += `Human: ${query}\nAssistant:`;

    // Use Hugging Face Inference API directly
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
            max_new_tokens: 500,
            temperature: 0.7,
            return_full_text: false
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error('HF API Error:', response.status, errorData);
      return NextResponse.json({ 
        error: 'Failed to get response from AI',
        details: errorData
      }, { status: 500 });
    }

    const result = await response.json();
    
    let aiResponse = '';
    if (Array.isArray(result) && result[0]?.generated_text) {
      aiResponse = result[0].generated_text.trim();
    } else if (result.generated_text) {
      aiResponse = result.generated_text.trim();
    } else {
      aiResponse = 'Sorry, I could not generate a response.';
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Query error:', error);
    console.error('Error details:', error.message);
    
    return NextResponse.json({ 
      error: 'Failed to process query',
      details: error.message
    }, { status: 500 });
  }
}
