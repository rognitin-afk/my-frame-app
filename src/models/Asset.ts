import mongoose, { Schema, model, models } from "mongoose";

const AssetSchema = new Schema(
  {
    name: { type: String, required: true },
    src: { type: String, required: true },
  },
  { timestamps: true }
);

const Asset = models.Asset || model("Asset", AssetSchema);
export default Asset;
