import mongoose, { Schema, model, models } from "mongoose";

const DistrictSchema = new Schema(
  {
    name: { type: String, required: true },
    province: { type: String, required: true },
    headquarters: { type: String, required: true },
    area: { type: Number, required: true }, // in km²
    population: { type: Number, required: true },
  },
  { timestamps: true }
);

const District = models.District || model("District", DistrictSchema);
export default District;