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
      startLine: {
        type: Number,
        required: [true, "Please provide a start line number"],
      },
      endLine: {
        type: Number,
        required: [true, "Please provide a end line number"],
      },
      category: {
        type: String,
        required: [true, "Please provide category"],
      },
      weight: {
        type: Number,
        required: [true, "please procide weight of the smell"],
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
        category: {
          type: String,
          required: [true, "Please provide a category"],
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
