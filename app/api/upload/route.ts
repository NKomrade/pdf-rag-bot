import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file = data.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Process PDF here (e.g., save and call extractChunksFromPDF)
    // For now, we'll just return a success message
    console.log('Processing PDF:', file.name);
    
    return NextResponse.json({ 
      message: 'File uploaded and processed successfully.',
      filename: file.name,
      size: file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 });
  }
}