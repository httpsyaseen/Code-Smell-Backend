import catchAsync from "../utils/catchAsync.js";
import fs from "fs";
import User from "../models/user.js";
import path from "path";
import { fileURLToPath } from "url"; // Import fileURLToPath for ESM
import AppError from "../utils/appError.js";

// Define __dirname for ESM (reusable)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getUserProfile = catchAsync(async (req, res, next) => {
  const { username } = req.params;

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
    username: user.username,
    ...(user.photo && { photo: user.photo }), // Include photo only if it exists
  };

  return res.status(200).json({ user: userResponse });
});

// Change Username API
const changeUsername = catchAsync(async (req, res, next) => {
  const { newUsername } = req.body;
  const userId = req.user._id;

  if (!newUsername) {
    return next(new AppError("Please provide a new username", 400));
  }

  // Check if the new username is already taken
  const existingUser = await User.findOne({
    username: newUsername.toLowerCase().trim(),
  });
  if (existingUser) {
    return next(new AppError("Username is already taken", 400));
  }

  const oldUsername = req.user.username;

  // Update the user's username
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { username: newUsername.toLowerCase().trim() },
    { new: true, runValidators: true }
  );

  // Rename profile photo if it exists
  const profilesFolder = path.join(__dirname, "..", "profiles");
  const files = fs.readdirSync(profilesFolder);
  const oldPhoto = files.find((file) => file.startsWith(oldUsername));

  if (oldPhoto) {
    const ext = path.extname(oldPhoto);
    const oldPath = path.join(profilesFolder, oldPhoto);
    const newPath = path.join(
      profilesFolder,
      `${newUsername.toLowerCase().trim()}${ext}`
    );
    fs.renameSync(oldPath, newPath);

    // Update photo URL in database
    await User.findByIdAndUpdate(userId, {
      photo: `http://localhost:3000/api/v1/user/profile/${newUsername
        .toLowerCase()
        .trim()}`,
    });
  }

  res.status(200).json({
    status: "success",
    message: "Username updated successfully",
    data: {
      username: updatedUser.username,
    },
  });
});

// Change Profile Name API
const changeProfileName = catchAsync(async (req, res, next) => {
  const { newName } = req.body;
  const userId = req.user._id;

  if (!newName) {
    return next(new AppError("Please provide a new name", 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { name: newName.trim() },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    message: "Profile name updated successfully",
    data: {
      name: updatedUser.name,
    },
  });
});

// Change Password API
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;
  const userId = req.user._id;

  // Validate input
  if (!currentPassword || !newPassword || !newPasswordConfirm) {
    return next(
      new AppError(
        "Please provide current password, new password and confirmation",
        400
      )
    );
  }

  if (newPassword !== newPasswordConfirm) {
    return next(
      new AppError("New password and confirmation do not match", 400)
    );
  }

  if (newPassword.length < 8) {
    return next(
      new AppError("Password must be at least 8 characters long", 400)
    );
  }

  // Get user with password
  const user = await User.findById(userId).select("+password");

  // Check if current password is correct
  if (!(await user.isPasswordCorrect(currentPassword, user.password))) {
    return next(new AppError("Current password is incorrect", 401));
  }

  // Update password
  user.password = newPassword;
  user.passwordConfirm = newPassword;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password updated successfully",
  });
});

// Change Photo API
const changePhoto = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const username = req.user.username;

  if (!req.file) {
    return next(new AppError("Please upload a photo", 400));
  }

  // Delete old photo if exists
  const profilesFolder = path.join(__dirname, "..", "profiles");
  const files = fs.readdirSync(profilesFolder);
  const oldPhoto = files.find(
    (file) => file.startsWith(username) && file !== req.file.filename
  );

  if (oldPhoto) {
    const oldPath = path.join(profilesFolder, oldPhoto);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  // Update photo URL in database
  const photoUrl = `http://localhost:3000/api/v1/user/profile/${username}`;
  await User.findByIdAndUpdate(userId, { photo: photoUrl });

  res.status(200).json({
    status: "success",
    message: "Photo updated successfully",
    data: {
      photo: photoUrl,
    },
  });
});

export {
  getUserProfile,
  checkUserNameAvailablity,
  getUserByUsername,
  changeUsername,
  changeProfileName,
  changePassword,
  changePhoto,
};
