import mongoose from 'mongoose';

const PdfMetadataSchema = new mongoose.Schema({
  name: String,
  uploadDate: Date,
});

export default mongoose.models.PdfMetadata || mongoose.model('PdfMetadata', PdfMetadataSchema);
