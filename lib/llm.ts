// import { ChatOpenAI } from 'langchain/chat_models/openai';

// export const llm = new ChatOpenAI({
//   openAIApiKey: process.env.OPENAI_API_KEY,
//   temperature: 0.7,
// });

import { ChatOpenAI } from '@langchain/openai';

export const llm = new ChatOpenAI({
  openAIApiKey: process.env.GROK_API_KEY || process.env.OPENAI_API_KEY,
  temperature: 0.7,
});