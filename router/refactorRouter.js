import express from "express";
import { protectedRoute } from "../controller/authController.js";
import { refactorCode } from "../controller/refactorController.js";

const router = express.Router();

// POST endpoint to refactor code based on detected smells
router.route("/refactor").post(protectedRoute, refactorCode);

export default router;
