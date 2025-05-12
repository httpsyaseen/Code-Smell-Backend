import express from "express";
import { upload } from "../utils/multerUpload.js";
import {
  signUp,
  login,
  protectedRoute,
  verifyUser,
} from "../controller/authController.js";
import {
  getUserProfile,
  checkUserNameAvailablity,
  getUserByUsername,
} from "../controller/userController.js";
const router = express.Router();

router.route("/signup").post(upload.single("photo"), signUp);
router.route("/login").post(login);
router.route("/profile/:username").get(getUserProfile);
router.route("/check-username/:username").get(checkUserNameAvailablity);
router.route("/userinfo/:username").get(protectedRoute, getUserByUsername);
router.route("/verify").get(verifyUser);

export default router;
