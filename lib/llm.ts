// import { ChatOpenAI } from 'langchain/chat_models/openai';

// export const llm = new ChatOpenAI({
//   openAIApiKey: process.env.OPENAI_API_KEY,
//   temperature: 0.7,
// });

import axios from 'axios';

export async function callFlanT5(prompt: string) {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error('HUGGINGFACE_API_KEY is not configured');
    }

    const model = 'google/flan-t5-small';
    console.log('Calling Hugging Face API with model:', model);
    console.log('Prompt length:', prompt.length);
    
    const res = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { 
        inputs: prompt,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );
    
    console.log('HF Response status:', res.status);
    console.log('HF Response data:', res.data);
    
    if (Array.isArray(res.data) && res.data[0]?.generated_text) {
      return res.data[0].generated_text.trim();
    } else if (res.data?.generated_text) {
      return res.data.generated_text.trim();
    } else if (res.data?.error) {
      throw new Error(`Hugging Face API error: ${res.data.error}`);
    } else {
      console.log('Unexpected response format:', res.data);
      return 'Sorry, I received an unexpected response format from the AI service.';
    }
  } catch (error: any) {
    console.error('Error calling Flan-T5:', error);
    
    if (error.response?.status === 403) {
      console.error('403 Forbidden - Check your Hugging Face API key permissions');
      throw new Error('API key does not have sufficient permissions. Please check your Hugging Face token.');
    } else if (error.response?.status === 429) {
      console.error('429 Rate Limited - Too many requests');
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.response?.status === 503) {
      console.error('503 Service Unavailable - Model is loading');
      throw new Error('AI model is currently loading. Please try again in a few moments.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw error;
  }
}
