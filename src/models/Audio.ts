import mongoose, { Schema, model, models } from "mongoose";

const AudioSchema = new Schema(
  {
    name: { type: String, required: true },
    src: { type: String, required: true },
  },
  { timestamps: true }
);

const Audio = models.Audio || model("Audio", AudioSchema);
export default Audio;
