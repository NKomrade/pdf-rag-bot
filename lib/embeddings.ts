import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';

export const embedder = new HuggingFaceTransformersEmbeddings({
  modelName: 'sentence-transformers/all-MiniLM-L6-v2',
});
