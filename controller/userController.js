import catchAsync from "../utils/catchAsync.js";
import fs from "fs";
import User from "../models/user.js";
import path from "path";
import { fileURLToPath } from "url"; // Import fileURLToPath for ESM

const getUserProfile = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  // Define __dirname for ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Construct the path to the profiles folder
  const profilesFolder = path.join(__dirname, "..", "profiles");

  try {
    // Check if the profiles folder exists
    if (!fs.existsSync(profilesFolder)) {
      return res.status(500).json({ message: "Profiles directory not found" });
    }

    // Read the files in the profiles folder
    const files = fs.readdirSync(profilesFolder);

    // Find the profile photo that starts with the username
    const profilePhoto = files.find((file) => file.startsWith(username));

    if (!profilePhoto) {
      return res.status(404).json({ message: "Profile photo not found" });
    }

    // Construct the full path to the profile photo
    const photoPath = path.join(profilesFolder, profilePhoto);

    // Verify the file exists before sending
    if (!fs.existsSync(photoPath)) {
      return res.status(404).json({ message: "Profile photo file not found" });
    }

    // Send the file
    res.sendFile(photoPath, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error sending profile photo" });
      }
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

const checkUserNameAvailablity = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  // Check if the username is already taken
  const user = await User.find({ username });
  if (user.length > 0) {
    return res
      .status(200)
      .json({ message: "Username already taken", available: false });
  }

  return res
    .status(200)
    .json({ message: "Username is available", available: true });
});

const getUserByUsername = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  // Check if the username is already taken
  const user = (await User.find({ username, _id: { $ne: req.user._id } })).at(
    0
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  console.log(user, "user");
  const userResponse = {
    id: user._id,
    name: user.name,
    ...(user.photo && { photo: user.photo }), // Include photo only if it exists
  };

  return res.status(200).json({ user: userResponse });
});

export { getUserProfile, checkUserNameAvailablity, getUserByUsername };
