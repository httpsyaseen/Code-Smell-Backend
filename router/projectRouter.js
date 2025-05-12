import express from "express";
import {
  protectedRoute,
  recentProjects,
} from "../controller/authController.js";
import {
  createProject,
  getProjectDetails,
  updateProject,
  getProjectSettings,
  dashboardStats,
  getAllProjects,
} from "../controller/projectController.js";
import multer from "multer";

const storage = multer.memoryStorage(); // Don't store files on disk
const upload = multer({ storage });

const router = express.Router();

router
  .route("/create-project")
  .post(protectedRoute, upload.single("project"), createProject);

router.route("/get-project/:id").get(protectedRoute, getProjectDetails);

router
  .route("/update-project/:projectId")
  .patch(protectedRoute, upload.single("project"), updateProject);

router
  .route("/get-project-settings/:id")
  .get(protectedRoute, getProjectSettings);

router.route("/dashboard-stats").get(protectedRoute, dashboardStats);
router.route("/recent-projects").get(protectedRoute, recentProjects);
router.route("/get-all-projects").get(protectedRoute, getAllProjects);

export default router;
