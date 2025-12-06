import Project from "../models/project.js";
import Version from "../models/version.js";
import Report from "../models/report.js";
import catchAsync from "../utils/catchAsync.js";
import { extractJavaFilesFromZip } from "../utils/zip.js";
import { getCodeSmellData, getSmellyJavaFiles } from "../utils/getCodeSmell.js";
import {
  calculateAffectedFiles,
  calculateChartData,
  calculateCodeQuality,
  calculateDashboardChartData,
  calculateTotalSmellsInProjects,
  calculateDashboardCodeQualityScore,
} from "../utils/helper.js";
import AppError from "../utils/appError.js";

const createProject = catchAsync(async (req, res, next) => {
  const { name, description } = req.body;
  const newMembers = req.body?.members ? JSON.parse(req.body.members) : [];
  const zipFile = req.file;

  if (!zipFile) {
    return next(new AppError("Zip file is required.", 400));
  }

  const javaFiles = extractJavaFilesFromZip(zipFile.buffer);

  if (javaFiles.length === 0) {
    return next(new AppError("No java files found in the zip.", 400));
  }

  const smells = await getCodeSmellData(zipFile);
  const affectedFiles = calculateAffectedFiles(smells);
  const chartData = calculateChartData(smells);
  const codeQuality = calculateCodeQuality(smells, javaFiles.length).toFixed(2);
  const smellyFiles = getSmellyJavaFiles(javaFiles, smells);
  const report = await Report.create({
    smells: smells,
    totalFiles: javaFiles.length,
    totalSmells: smells.length,
    AffectedFiles: affectedFiles.length,
    chartData,
  });

  const version = await Version.create({
    version: 1,
    projectFiles: smellyFiles,
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
    qualityScore: codeQuality,
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
    return next(new AppError("Project not found", 404));
  }

  if (project.owner.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to view this project", 403)
    );
  }

  res.status(200).json({ status: "success", project });
});

const updateProject = catchAsync(async (req, res, next) => {
  const { projectId } = req.params;
  const zipFile = req.file;

  if (!zipFile) {
    return next(new AppError("Zip file is required.", 400));
  }

  // Step 1: Find and populate the project with latestVersion
  const project = await Project.findById(projectId).populate("latestVersion");
  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  const javaFiles = extractJavaFilesFromZip(zipFile.buffer);
  if (javaFiles.length === 0) {
    return next(new AppError("No java files found in the zip.", 400));
  }

  const smells = await getCodeSmellData(zipFile);

  // Step 3: Generate report data
  const affectedFiles = calculateAffectedFiles(smells);
  const chartData = calculateChartData(smells);
  const codeQuality = calculateCodeQuality(smells, javaFiles.length).toFixed(2);

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
  project.qualityScore = codeQuality;
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

  console.log(project);
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

const dashboardStats = catchAsync(async (req, res, next) => {
  const user = req.user;
  const projects = await Project.find({
    $or: [{ owner: user._id }, { members: user._id }],
  }).populate([
    {
      path: "latestVersion",
      populate: {
        path: "report",
      },
    },
  ]);
  const totalProjects = projects.length;
  const totalSmells = calculateTotalSmellsInProjects(projects);
  const rawScore = calculateDashboardCodeQualityScore(projects);
  const codeQuality = isNaN(rawScore) ? "0.00" : rawScore.toFixed(2);
  const chartData = calculateDashboardChartData(projects);

  res.status(200).json({
    status: "success",
    data: {
      totalProjects,
      totalSmells,
      codeQuality,
      chartData,
    },
  });
});

const getCodeInformation = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const project = await Project.findById(id)
    .populate({
      path: "latestVersion",
      select: "+projectFiles",
      populate: {
        path: "report",
      },
    })
    .select("+latestVersion.projectFiles");

  if (!project) {
    return next(new AppError("No Project Found ", 400));
  }
  const fileData = project.latestVersion.projectFiles;
  console.log(fileData);
  const smells = project.latestVersion.report.smells;

  res.status(200).json({
    title: project.title,
    fileData,
    smells,
  });
});

const getProjectMembers = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate("members", "name username email photo")
    .populate("owner", "name username email photo");

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      owner: project.owner,
      members: project.members,
      totalMembers: project.members.length,
    },
  });
});

const addMember = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { memberId } = req.body;

  if (!memberId) {
    return next(new AppError("Member ID is required", 400));
  }

  const project = await Project.findById(id);

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  // Check if the user is the owner
  if (project.owner.toString() !== req.user._id.toString()) {
    return next(new AppError("Only the project owner can add members", 403));
  }

  // Check if member is already in the project
  if (project.members.includes(memberId)) {
    return next(new AppError("User is already a member of this project", 400));
  }

  // Check if trying to add the owner as a member
  if (project.owner.toString() === memberId) {
    return next(new AppError("Owner cannot be added as a member", 400));
  }

  project.members.push(memberId);
  await project.save();

  const updatedProject = await Project.findById(id)
    .populate("members", "name username email photo")
    .populate("owner", "name username email photo");

  res.status(200).json({
    status: "success",
    message: "Member added successfully",
    data: {
      owner: updatedProject.owner,
      members: updatedProject.members,
      totalMembers: updatedProject.members.length,
    },
  });
});

const removeMember = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { memberId } = req.body;

  if (!memberId) {
    return next(new AppError("Member ID is required", 400));
  }

  const project = await Project.findById(id);

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  // Check if the user is the owner
  if (project.owner.toString() !== req.user._id.toString()) {
    return next(new AppError("Only the project owner can remove members", 403));
  }

  // Check if member exists in the project
  const memberIndex = project.members.findIndex(
    (member) => member.toString() === memberId
  );

  if (memberIndex === -1) {
    return next(new AppError("User is not a member of this project", 400));
  }

  project.members.splice(memberIndex, 1);
  await project.save();

  const updatedProject = await Project.findById(id)
    .populate("members", "name username email photo")
    .populate("owner", "name username email photo");

  res.status(200).json({
    status: "success",
    message: "Member removed successfully",
    data: {
      owner: updatedProject.owner,
      members: updatedProject.members,
      totalMembers: updatedProject.members.length,
    },
  });
});

const deleteProject = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find the project
  const project = await Project.findById(id);

  if (!project) {
    return next(new AppError("Project not found", 404));
  }

  // Check if the user is the owner
  if (project.owner.toString() !== req.user._id.toString()) {
    return next(
      new AppError("You are not authorized to delete this project", 403)
    );
  }

  // Collect all version IDs (latest + previous)
  const versionIds = [];
  if (project.latestVersion) {
    versionIds.push(project.latestVersion);
  }
  if (project.previousVersions && project.previousVersions.length > 0) {
    versionIds.push(...project.previousVersions);
  }

  // Get all versions to find their reports
  const versions = await Version.find({ _id: { $in: versionIds } });
  const reportIds = versions.map((version) => version.report).filter(Boolean);

  // Delete all reports
  if (reportIds.length > 0) {
    await Report.deleteMany({ _id: { $in: reportIds } });
  }

  // Delete all versions
  if (versionIds.length > 0) {
    await Version.deleteMany({ _id: { $in: versionIds } });
  }

  // Delete the project
  await Project.findByIdAndDelete(id);

  res.status(200).json({
    status: "success",
    message: "Project deleted successfully",
  });
});

export {
  createProject,
  getProjectDetails,
  updateProject,
  getProjectSettings,
  getAllProjects,
  dashboardStats,
  getCodeInformation,
  getProjectMembers,
  addMember,
  removeMember,
  deleteProject,
};
