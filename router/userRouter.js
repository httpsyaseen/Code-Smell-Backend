import express from "express";
import { upload } from "../utils/multerUpload.js";
import { signUp, login } from "../controller/authController.js";
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
router.route("/userinfo/:username").get(getUserByUsername);

export default router;
