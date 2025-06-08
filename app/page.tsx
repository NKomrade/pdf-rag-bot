"use client";
import React, { useState } from 'react';
import PdfUploader from '@/components/PdfUploader';
import ChatWindow from '@/components/ChatWindow';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  
  const handleUploadComplete = (message: string) => {
    const systemMessage: Message = {
      id: Date.now().toString(),
      content: message,
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, systemMessage]);
  };
  
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            RAG Chatbot
          </h1>
          <p className="text-white text-lg">
            Upload PDFs and chat with your documents using AI
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* PDF Uploader Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-black rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Documents
              </h2>
              <PdfUploader onUploadComplete={handleUploadComplete} />
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-black p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat with your documents
                </h2>
              </div>
              <ChatWindow 
                messages={messages} 
                setMessages={setMessages}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}