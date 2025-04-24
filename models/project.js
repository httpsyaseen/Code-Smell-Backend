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
  version: [
    {
      type: Schema.Types.ObjectId,
      ref: "Version",
    },
  ],
  latestVersion: {
    type: Schema.Types.ObjectId,
    ref: "Version",
  },
});

const Project = model("Project", projectSchema);
export default Project;
