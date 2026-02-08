import mongoose, { Schema, model, models } from 'mongoose';

// 1. Define what a "Frame" looks like
const FrameSchema = new Schema({
  name: { type: String, required: true },
  src: { type: String, required: true }, // This will be the image path
  category: { type: String, default: 'General' },
}, { 
  timestamps: true // This automatically adds 'createdAt' and 'updatedAt'
});

// 2. Export the model
// We use 'models.Frame || ...' because Next.js reloads code often. 
// This check prevents "OverwriteModelError".
const Frame = models.Frame || model('Frame', FrameSchema);

export default Frame;