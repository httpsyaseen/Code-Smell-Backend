import { Schema, model, version } from "mongoose";

const versionSchema = new Schema({
  version: {
    type: Number,
    required: [true, "Please provide a version"],
  },
  projectFiles: {
    type: [
      {
        fileName: {
          type: String,
          required: [true, "Please provide a file name"],
        },
        content: {
          type: String,
          required: [true, "Please provide a content"],
        },
      },
    ],
    select: false,
  },
  report: {
    type: Schema.Types.ObjectId,
    ref: "Report",
    required: [true, "Please provide a report"],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Version = model("Version", versionSchema);
export default Version;
