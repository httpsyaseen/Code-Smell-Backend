import { Schema, model } from "mongoose";

const projectSchema = new Schema({
  title: {
    type: String,
    required: [true, "Please provide a title"],
  },
  description: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide a owner"],
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  latestVersion: {
    type: Schema.Types.ObjectId,
    ref: "Version",
  },

  previousVersions: [
    {
      type: Schema.Types.ObjectId,
      ref: "Version",
    },
  ],
  totalSmells: {
    type: Number,
    default: 0,
    required: [true, "Please provide a totalSmells"],
  },
  lastUpdated: {
    type: Date,
    default: Date.now(),
  },
  qualityScore: {
    type: Number,
    required: [true, "Code Quality must be provided"],
  },
});

const Project = model("Project", projectSchema);
export default Project;
