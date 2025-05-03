import Project from "../models/project.js";
import Version from "../models/version.js";
import Report from "../models/report.js";
import catchAsync from "../utils/catchAsync.js";
import { extractJavaFilesFromZip } from "../utils/zip.js";
import axios from "axios";
import FormData from "form-data";

const createProject = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const newMembers = req.body?.members ? JSON.parse(req.body.members) : [];
  const zipFile = req.file;

  if (!zipFile) {
    return next("Zip file is required.", 400);
  }

  // Step 1: Extract java files from zip buffer
  const javaFiles = extractJavaFilesFromZip(zipFile.buffer);
  const formData = new FormData();
  formData.append("file", zipFile.buffer, {
    filename: zipFile.originalname,
    contentType: zipFile.mimetype,
  });

  const response = await axios.post("http://localhost:5000/upload", formData, {
    headers: formData.getHeaders(),
  });

  if (javaFiles.length === 0) {
    return next("No java files found in the zip.", 400);
  }
  const affectedFiles = smells.reduce((acc, curr) => {
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

  const chartData = smells.reduce((acc, curr) => {
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

  const smells = response.data;

  const report = await Report.create({
    smells: smells,
    totalFiles: javaFiles.length,
    totalSmells: smells.length,
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
    members: newMembers,
    totalSmells: report.totalSmells,
  });

  res.status(201).json({ status: "success", project });
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
    return next("Project not found", 404);
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return next("You are not authorized to view this project", 403);
  }

  res.status(200).json({ status: "success", project });
});

const updateProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const zipFile = req.file;

  if (!zipFile) {
    return next("Zip file is required.", 400);
  }
  const formData = new FormData();
  formData.append("file", zipFile.buffer, {
    filename: zipFile.originalname,
    contentType: zipFile.mimetype,
  });

  const response = await axios.post("http://localhost:5000/upload", formData, {
    headers: formData.getHeaders(),
  });

  const smells = response.data;

  // Step 1: Find and populate the project with latestVersion
  const project = await Project.findById(projectId).populate("latestVersion");
  if (!project) {
    return next("Project not found", 404);
  }

  // Step 2: Extract java files from zip
  const javaFiles = extractJavaFilesFromZip(zipFile.buffer);
  if (javaFiles.length === 0) {
    return next("No java files found in the zip.", 400);
  }

  // Step 3: Generate report data
  const affectedFiles = smells.reduce((acc, curr) => {
    const existingFile = acc.find((file) => file.fileName === curr.fileName);
    if (existingFile) {
      existingFile.totalOccurrences += 1;
    } else {
      acc.push({
        fileName: curr.fileName,
        totalOccurrences: 1,
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

  const chartData = smells.reduce((acc, curr) => {
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

  // Step 4: Create new report
  const report = await Report.create({
    smells: smells,
    totalFiles: javaFiles.length,
    totalSmells: smells.length,
    AffectedFiles: affectedFiles.length,
    chartData,
  });

  // Step 5: Get current latest version number
  const latestVersionNumber = project.latestVersion?.version || 0;

  // Step 6: Create new version with incremented version number
  const newVersion = await Version.create({
    version: latestVersionNumber + 1,
    projectFiles: javaFiles,
    report: report._id,
  });

  // Step 7: Update project: push previous latestVersion to previousVersions
  if (!project.previousVersions) project.previousVersions = [];
  if (project.latestVersion?._id) {
    project.previousVersions.push(project.latestVersion._id);
  }

  project.latestVersion = newVersion._id;
  project.totalSmells = report.totalSmells;
  await project.save();

  const updatedProject = await Project.findById(projectId).populate({
    path: "latestVersion",
    populate: {
      path: "report",
    },
  });

  res.status(200).json({
    status: "success",
    message: "Project updated successfully",
    project: updatedProject,
  });
});

const getProjectSettings = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const project = await Project.findById(id).populate(
    "members",
    "name username photo"
  );
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }
  res.status(200).json({ status: "success", project });
});

const getAllProjects = catchAsync(async (req, res, next) => {
  const user = req.user;
  const projects = await Project.find({
    $or: [{ owner: user._id }, { members: user._id }],
  }).populate("members", "name photo");

  if (!projects) {
    return res.status(404).json({ message: "No projects found" });
  }

  res.json({
    status: "success",
    totalProjects: projects.length,
    data: {
      projects,
    },
  });
});

export {
  createProject,
  getProjectDetails,
  updateProject,
  getProjectSettings,
  getAllProjects,
};
