import { Schema, model, models } from "mongoose";

const STATS_ID = "singleton";

const StatsSchema = new Schema(
  {
    _id: { type: String, default: STATS_ID },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Stats = models.Stats || model("Stats", StatsSchema);

export const getStatsId = () => STATS_ID;
export default Stats;
