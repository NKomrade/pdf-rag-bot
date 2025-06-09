"use client";
import React, { useState } from 'react';

interface PdfUploaderProps {
  onUploadComplete: (message: string) => void;
}

export default function PdfUploader({ onUploadComplete }: PdfUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setUploadStatus('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading and processing PDF...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload API Error:', errorText);
        setUploadStatus(`Upload failed: ${response.status} - ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('Upload response data:', data);

      if (response.ok) {
        setUploadStatus('PDF uploaded and processed successfully!');
        onUploadComplete(`PDF "${data.filename}" has been uploaded and processed with ${data.chunks} chunks. You can now ask questions about it.`);
      } else {
        setUploadStatus(data.error || 'Failed to upload PDF');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
            <div>
            <label htmlFor="pdf-upload" className="cursor-pointer">
              {isUploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span className="text-sm text-gray-400">Processing PDF...</span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-white font-medium">Choose PDF file</span>
                  <span className="block text-sm text-gray-400 mt-1">Maximum file size: 10MB</span>
                </div>
              )}
            </label>
            <input
              id="pdf-upload"
              name="pdf-upload"
              type="file"
              accept=".pdf"
              className="sr-only"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>        </div>
      </div>
      
      {uploadStatus && (
        <div className={`text-sm p-3 rounded ${
          uploadStatus.includes('successfully') 
            ? 'bg-black text-green-300 border border-green-600' 
            : 'bg-black text-white'
        }`}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
}