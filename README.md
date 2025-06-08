Here's a `README.md` file for your **PDF RAG Chatbot** project using Next.js, Pinecone, Hugging Face, and MongoDB:

---

````markdown
# 🧠 PDF RAG Chatbot

A **RAG (Retrieval-Augmented Generation)** chatbot built with **Next.js**, which allows users to upload PDF files and ask questions about their content using AI-powered language models and vector search.

## 📦 Features

- Upload PDF files
- Parse and chunk content
- Generate embeddings with Hugging Face Transformers
- Store & query embeddings using Pinecone
- Answer user questions using Hugging Face or OpenAI LLMs
- Store metadata in MongoDB

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/pdf-rag-chatbot.git
cd pdf-rag-chatbot
````

### 2. Install dependencies

```bash
npm install
```

> If you get dependency issues, try:

```bash
npm install --legacy-peer-deps
```

### 3. Setup Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your own credentials:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=pdf-index

# Hugging Face
HUGGINGFACE_API_KEY=your-huggingface-api-key

# Optional (if using OpenAI/Grok)
OPENAI_API_KEY=your-openai-api-key
GROK_API_KEY=your-grok-api-key

# Next.js site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🧠 Tech Stack

| Tech             | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| **Next.js**      | React framework for frontend + API routes      |
| **LangChain**    | Document loaders and text splitting            |
| **Hugging Face** | Embedding + Language Model inference           |
| **Pinecone**     | Vector similarity search                       |
| **MongoDB**      | Store PDF metadata and chat history (optional) |
| **Formidable**   | For handling PDF uploads                       |
| **Axios**        | API communication between frontend and backend |

---

## 📂 Project Structure

```
.
├── components/
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   └── PdfUploader.tsx
├── lib/
│   ├── db.ts
│   ├── embeddings.ts
│   ├── llm.ts
│   ├── pdfProcessor.ts
│   └── vectorStore.ts
├── models/
│   ├── message.ts
│   └── pdfMetadata.ts
├── pages/
│   ├── index.tsx
│   └── api/
│       ├── upload.ts
│       └── query.ts
├── public/
├── styles/
├── .env.example
├── package.json
└── README.md
```

---

## 💬 Example Prompt

1. Upload a PDF file using the uploader.
2. Ask a question like:
   *"What is the main idea of Chapter 2?"*
3. The chatbot retrieves relevant chunks from the PDF and generates a response.

---

## 🛠 To Do

* [ ] Add authentication
* [ ] Display chat history from MongoDB
* [ ] Support multiple PDF uploads
* [ ] Add loading indicators
* [ ] Improve error handling

---

## 🙌 Acknowledgements

* [LangChain](https://www.langchain.com/)
* [Hugging Face](https://huggingface.co/)
* [Pinecone](https://www.pinecone.io/)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

---

## ✨ Author

Made by \Nitin Kumar Singh — contributions welcome!

