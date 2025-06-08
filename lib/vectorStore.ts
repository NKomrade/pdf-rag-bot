import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME!);

// Optional helper function
export const upsertVectors = async (vectors: any[]) => {
  await pineconeIndex.upsert(vectors);
};
