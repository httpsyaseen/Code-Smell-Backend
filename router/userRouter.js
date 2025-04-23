import express from "express";
import { upload } from "../utils/multerUpload.js";
import { signUp, login } from "../controller/authController.js";
import {
  getUserProfile,
  checkUserNameAvailablity,
} from "../controller/userController.js";
const router = express.Router();

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, "profiles/"),
//   filename: (req, file, cb) =>
//     cb(null, req.body.username + "." + file.mimetype.split(/\//)[1]),
// });

// const upload = multer({ storage });

router.route("/signup").post(upload.single("photo"), signUp);
router.route("/login").post(login);
router.route("/profile/:username").get(getUserProfile);
router.route("/check-username/:username").get(checkUserNameAvailablity);

export default router;
