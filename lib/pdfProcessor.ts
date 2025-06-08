import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

export const extractChunksFromPDF = async (filePath: string) => {
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  return splitter.splitDocuments(docs);
};