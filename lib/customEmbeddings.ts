import axios from 'axios';

export class CustomHuggingFaceEmbeddings {
  private apiKey: string;
  private model: string;

  constructor(config: { apiKey: string; model?: string }) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      console.log(`🔄 Creating embeddings for ${texts.length} texts...`);
      const embeddings: number[][] = [];
      
      // Process texts one by one to avoid rate limits and handle errors better
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        console.log(`Processing chunk ${i + 1}/${texts.length} (${text.length} chars)`);
        
        try {
          // Clean and truncate text
          const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 512);
          
          const response = await axios.post(
            `https://api-inference.huggingface.co/models/${this.model}`,
            {
              inputs: cleanText,
              options: {
                wait_for_model: true,
                use_cache: false
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000,
            }
          );

          console.log(`✅ Embedding ${i + 1} created successfully`);
          
          // Handle the response - HF returns different formats
          let embedding: number[];
          if (Array.isArray(response.data)) {
            if (Array.isArray(response.data[0])) {
              embedding = response.data[0]; // Format: [[embedding]]
            } else {
              embedding = response.data; // Format: [embedding]
            }
          } else {
            throw new Error('Unexpected response format from Hugging Face');
          }

          if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Invalid embedding received');
          }

          embeddings.push(embedding);
          
          // Wait between requests to avoid rate limiting
          if (i < texts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error: any) {
          console.error(`❌ Error creating embedding for chunk ${i + 1}:`, error.response?.data || error.message);
          
          // Create a fallback zero vector with standard dimension
          console.log('⚠️ Using zero vector as fallback');
          embeddings.push(new Array(384).fill(0));
        }
      }
      
      console.log(`✅ Completed embeddings creation: ${embeddings.length} embeddings`);
      return embeddings;
      
    } catch (error: any) {
      console.error('❌ Fatal error in embeddings creation:', error);
      throw error;
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    console.log('🔄 Creating query embedding...');
    const embeddings = await this.embedDocuments([text]);
    return embeddings[0];
  }
}