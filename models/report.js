import { model, Schema } from "mongoose";

const reportSchema = new Schema({
  totalFiles: {
    type: Number,
    required: [true, "Please provide a total files"],
  },
  totalSmells: {
    type: Number,
    required: [true, "Please provide a total smells"],
  },

  AffectedFiles: {
    type: Number,
    required: [true, "Please provide a affected files"],
  },

  smells: [
    {
      smellType: {
        type: String,
        required: [true, "Please provide a smell type"],
      },
      fileName: {
        type: String,
        required: [true, "Please provide a file name"],
      },
      filePath: {
        type: String,
        required: [true, "Please provide a file path"],
      },
      lineNumber: {
        type: Number,
        required: [true, "Please provide a line number"],
      },
    },
  ],
  generatedAt: {
    type: Date,
    default: Date.now(),
  },

  chartData: {
    type: [
      {
        codeSmellName: {
          type: String,
          required: [true, "Please provide a name"],
          default: "No Code Smell",
        },
        value: {
          type: Number,
          required: [true, "Please provide a value"],
          default: 1,
        },
        color: {
          type: String,
          required: [true, "Please provide a color"],
          default: "#143111",
        },
      },
    ],
  },
});
const Report = model("Report", reportSchema);
export default Report;
