# 🧠 PDF RAG Chatbot with Multi-User Support

A **RAG (Retrieval-Augmented Generation)** chatbot built with **Next.js**, which allows multiple users to simultaneously upload PDF files and ask questions about their content using AI-powered language models and vector search. Features **session-based isolation** for privacy and security.

## 📦 Features

- **📄 PDF Upload & Processing** - Upload and parse PDF files with automatic text extraction
- **🔍 Smart Document Chunking** - Intelligent text splitting for optimal retrieval
- **🧠 AI-Powered Embeddings** - Generate vector embeddings using Hugging Face Transformers
- **💾 Flexible Storage** - MongoDB primary storage with local file fallback
- **🤖 Advanced LLM Integration** - Answer questions using OpenAI/OpenRouter with context
- **👥 Multi-User Support** - Session-based isolation for concurrent users
- **🔒 Privacy & Security** - Each user's documents are completely isolated
- **⚡ Real-time Chat** - Interactive chat interface with loading states
- **🧹 Auto-Cleanup** - Automatic session expiration after 24 hours

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/NKomrade/pdf-rag-bot.git
cd pdf-rag-bot
```

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
# === MongoDB Atlas (Primary Storage) ===
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority

# === Hugging Face Transformers (Required for Embeddings) ===
HUGGINGFACE_API_KEY=your-huggingface-api-key

# === OpenAI/OpenRouter (Required for LLM Responses) ===
OPENAI_API_KEY=your-openai-or-openrouter-api-key

# === App Configuration ===
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Note**: The system no longer uses Pinecone or Grok. MongoDB handles vector storage with built-in similarity search.

---

## 🧠 Tech Stack

| Tech             | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| **Next.js 14**   | React framework for frontend + API routes     |
| **TypeScript**   | Type-safe development                         |
| **LangChain**    | Document loaders and text splitting           |
| **Hugging Face** | Text embeddings with Transformers API         |
| **OpenAI/OpenRouter** | Language model inference for responses    |
| **MongoDB Atlas** | Vector storage + document metadata           |
| **TailwindCSS**  | Modern styling and responsive design          |
| **PDF-Parse**    | PDF text extraction and processing           |

---

## 📸 Screenshot

![Rag Bot Preview](/public/ragnarok.png)

---

## 📂 Project Structure

```
.
├── app/
│   ├── layout.tsx                 # App layout and metadata
│   ├── page.tsx                   # Main chat interface
│   ├── test-session/             # Session testing page
│   │   └── page.tsx
│   └── api/
│       ├── upload/               # PDF upload and processing
│       │   └── route.ts
│       ├── query/                # Chat queries and responses
│       │   └── route.ts
│       └── debug/                # System debugging info
│           └── route.ts
├── components/
│   ├── ChatWindow.tsx            # Main chat interface
│   ├── MessageBubble.tsx         # Individual message display
│   └── PdfUploader.tsx           # PDF upload component
├── lib/
│   ├── embeddings.ts             # Hugging Face embeddings
│   ├── llm.ts                    # OpenAI/OpenRouter LLM calls
│   ├── vectorStore.ts            # Vector similarity search
│   └── sessionManager.ts         # Multi-user session handling
├── temp/                         # Temporary file storage
│   └── chunks.json               # Local storage fallback
├── .env.local                    # Environment variables
├── package.json
└── README.md
```

---

## 💬 How It Works

### 🔄 Multi-User Session Flow:
1. **User visits** → Gets unique session ID (stored in cookies)
2. **Upload PDF** → Document chunks stored with session isolation
3. **Ask questions** → Vector search within user's documents only
4. **AI responses** → Generated using relevant context from user's PDFs
5. **Privacy ensured** → Each user only sees their own documents

### 🏗️ RAG Architecture:
```
PDF Upload → Text Extraction → Chunking → Embeddings → MongoDB Storage
     ↓
User Query → Embedding → Vector Search → Context Retrieval → LLM Response
```

### 📱 Example Usage:
1. Upload a PDF file using the uploader
2. Wait for processing completion (chunks + embeddings created)
3. Ask questions like: *"What is the main idea of Chapter 2?"*
4. Get AI-powered responses based on your document content

---

## 🛠 To Do

- [ ] Add user authentication system
- [ ] Implement persistent chat history storage
- [ ] Support multiple PDF uploads per session  
- [ ] Add document management (list, delete, switch)
- [ ] Implement conversation memory across sessions
- [ ] Add support for other file formats (DOCX, TXT)
- [ ] Optimize embedding model for better accuracy
- [ ] Add real-time collaboration features

---

## 🙌 Acknowledgements

* [LangChain](https://www.langchain.com/) - Document processing and text splitting
* [Hugging Face](https://huggingface.co/) - Text embeddings and transformers
* [OpenAI](https://openai.com/) - Language model inference  
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Vector storage and database
* [Next.js](https://nextjs.org/) - React framework and API routes
* [TailwindCSS](https://tailwindcss.com/) - Styling and design system

---

## ✨ Author

Made by Nitin Kumar Singh — contributions welcome!

