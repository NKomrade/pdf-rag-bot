// import { ChatOpenAI } from 'langchain/chat_models/openai';

// export const llm = new ChatOpenAI({
//   openAIApiKey: process.env.OPENAI_API_KEY,
//   temperature: 0.7,
// });

import axios from 'axios';
import OpenAI from 'openai';

// Initialize OpenAI client with OpenRouter
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to call OpenAI compatible LLM via OpenRouter
export const callOpenAILLM = async (prompt: string): Promise<string> => {
  try {
    console.log('🤖 Calling OpenAI LLM via OpenRouter...');
    console.log('Prompt length:', prompt.length);
    
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3.1-8b-instruct:free", // Free model on OpenRouter
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant that answers questions based on the provided document context. Be concise and accurate."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '';
    console.log('✅ Got response from OpenAI LLM:', response.substring(0, 100) + '...');
    return response;
    
  } catch (error: any) {
    console.error('❌ Error calling OpenAI LLM:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

// Backup function using Hugging Face Flan-T5 (if OpenAI fails)
export const callFlanT5 = async (prompt: string): Promise<string> => {
  try {
    console.log('🤖 Calling Hugging Face Flan-T5 as backup...');
    
    const response = await fetch('https://api-inference.huggingface.co/models/google/flan-t5-large', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt.substring(0, 1000), // Limit input size
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
          do_sample: true,
        },
        options: {
          wait_for_model: true,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`);
    }

    const data = await response.json();
    const result = Array.isArray(data) ? data[0]?.generated_text || '' : data.generated_text || '';
    
    console.log('✅ Got response from Flan-T5:', result.substring(0, 100) + '...');
    return result;
    
  } catch (error) {
    console.error('❌ Error calling Flan-T5:', error);
    throw error;
  }
};

// Main LLM function with fallback
export const callLLM = async (prompt: string): Promise<string> => {
  // Try OpenAI first
  if (process.env.OPENAI_API_KEY) {
    try {
      return await callOpenAILLM(prompt);
    } catch (error) {
      console.log('⚠️ OpenAI failed, trying Hugging Face...');
    }
  }
  
  // Fallback to Hugging Face
  if (process.env.HUGGINGFACE_API_KEY) {
    return await callFlanT5(prompt);
  }
  
  throw new Error('No LLM API keys available');
};
