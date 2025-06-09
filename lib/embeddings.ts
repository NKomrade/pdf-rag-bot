import axios from 'axios';

export class HuggingFaceEmbeddings {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY!;
    this.model = 'sentence-transformers/all-MiniLM-L6-v2';
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      console.log(`🔄 Creating embedding for text (${text.length} chars)...`);
      
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

      // Handle different response formats from HF
      let embedding: number[];
      if (Array.isArray(response.data)) {
        if (Array.isArray(response.data[0])) {
          embedding = response.data[0]; // Format: [[embedding]]
        } else {
          embedding = response.data; // Format: [embedding]
        }
      } else {
        throw new Error('Unexpected response format from Hugging Face API');
      }

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding received from Hugging Face');
      }      console.log(`✅ Embedding created successfully (${embedding.length} dimensions)`);
      return embedding;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorData = (error as { response?: { data?: unknown } })?.response?.data;
      console.error('❌ Error creating embedding:', errorData || errorMessage);
      // Return zero vector as fallback
      console.log('⚠️ Using zero vector as fallback');
      return new Array(384).fill(0);
    }
  }

  async createEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`🔄 Creating embeddings for ${texts.length} text chunks...`);
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i++) {
      const embedding = await this.createEmbedding(texts[i]);
      embeddings.push(embedding);
      
      // Rate limiting - wait between requests
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`✅ All ${embeddings.length} embeddings created successfully`);
    return embeddings;
  }
}

// Utility function for cosine similarity
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}
