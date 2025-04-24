import express from "express";
import { protectedRoute } from "../controller/authController.js";
import {
  createProject,
  getProjectDetails,
} from "../controller/projectController.js";
import multer from "multer";

const storage = multer.memoryStorage(); // Don't store files on disk
const upload = multer({ storage });

const router = express.Router();

router
  .route("/create-project")
  .post(protectedRoute, upload.single("project"), createProject);

router.route("/get-project/:id").get(protectedRoute, getProjectDetails);

export default router;
