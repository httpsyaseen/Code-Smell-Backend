import Project from "../models/project.js";
import Version from "../models/version.js";
import Report from "../models/report.js";
import catchAsync from "../utils/catchAsync.js";
import { extractJavaFilesFromZip } from "../utils/zip.js";

const DUMMY_REPORT = [
  {
    smellType: "Long Method",
    fileName: "Example.java",
    filePath: "/path/to/Example.java",
    lineNumber: 42,
  },
  {
    smellType: "Long Method",
    fileName: "Example.java",
    filePath: "/path/to/Example.java",
    lineNumber: 42,
  },
  {
    smellType: "Feature Envy",
    fileName: "AnotherExample.java",
    filePath: "/path/to/AnotherExample.java",
    lineNumber: 15,
  },
  {
    smellType: "Feature Envy",
    fileName: "AnotherExample.java",
    filePath: "/path/to/AnotherExample.java",
    lineNumber: 15,
  },
  {
    smellType: "Feature Envy",
    fileName: "AnotherExample.java",
    filePath: "/path/to/AnotherExample.java",
    lineNumber: 15,
  },
];

const createProject = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const zipFile = req.file;

  if (!zipFile) {
    return res.status(400).json({ message: "Zip file is required." });
  }

  // Step 1: Extract java files from zip buffer
  const javaFiles = extractJavaFilesFromZip(zipFile.buffer);

  if (javaFiles.length === 0) {
    return res
      .status(400)
      .json({ message: "No .java files found in the zip." });
  }
  const affectedFiles = DUMMY_REPORT.reduce((acc, curr) => {
    const existingFile = acc.find((file) => file.fileName === curr.fileName);
    if (existingFile) {
      existingFile.totalOccurrences += 1;
    } else {
      acc.push({
        fileName: curr.fileName,
      });
    }
    return acc;
  }, []);

  const getRandomColor = () => {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  };

  const chartData = DUMMY_REPORT.reduce((acc, curr) => {
    const existingSmell = acc.find(
      (item) => item.codeSmellName === curr.smellType
    );
    if (existingSmell) {
      existingSmell.value += 1;
    } else {
      acc.push({
        codeSmellName: curr.smellType,
        value: 1,
        color: getRandomColor(),
      });
    }
    return acc;
  }, []);

  const report = await Report.create({
    smells: DUMMY_REPORT,
    totalFiles: javaFiles.length,
    totalSmells: DUMMY_REPORT.length,
    AffectedFiles: affectedFiles.length,
    chartData,
  });

  const version = await Version.create({
    version: 1,
    projectFiles: javaFiles,
    report: report._id,
  });

  const project = await Project.create({
    title: name,
    description,
    owner: req.user._id,
    version: [version._id],
    latestVersion: version._id,
  });

  res.status(201).json({ status: "success", report });
});

const getProjectDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const project = await Project.findById(id).populate({
    path: "latestVersion",
    populate: {
      path: "report",
    },
  });
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return res
      .status(403)
      .json({ message: "You are not authorized to view this project" });
  }

  res.status(200).json({ status: "success", project });
});

export { createProject, getProjectDetails };
