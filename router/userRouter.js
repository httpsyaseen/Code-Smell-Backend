import express from "express";
import { upload } from "../utils/multerUpload.js";
import {
  signUp,
  login,
  protectedRoute,
  verifyUser,
  forgotPassword,
  resetPassword,
} from "../controller/authController.js";
import {
  getUserProfile,
  checkUserNameAvailablity,
  getUserByUsername,
  changeUsername,
  changeProfileName,
  changePassword,
  changePhoto,
} from "../controller/userController.js";
const router = express.Router();

router.route("/signup").post(upload.single("photo"), signUp);
router.route("/login").post(login);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password/:token").post(resetPassword);
router.route("/profile/:username").get(getUserProfile);
router.route("/check-username/:username").get(checkUserNameAvailablity);
router.route("/userinfo/:username").get(protectedRoute, getUserByUsername);
router.route("/verify").get(verifyUser);

// Protected routes for user profile management
router.route("/change-username").patch(protectedRoute, changeUsername);
router.route("/change-name").patch(protectedRoute, changeProfileName);
router.route("/change-password").patch(protectedRoute, changePassword);
router
  .route("/change-photo")
  .patch(protectedRoute, upload.single("photo"), changePhoto);

export default router;
