import User from "../models/user.js";
import catchAsync from "../utils/catchAsync.js";
import Project from "../models/project.js";
import jwt from "jsonwebtoken";
import { promisify } from "util";
import AppError from "../utils/appError.js";
import sendEmail from "../utils/email.js";
import { createHash } from "crypto";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });

const signUp = catchAsync(async (req, res) => {
  const { username, name, email, password, passwordConfirm } = req.body;
  const newUser = {
    username,
    name,
    email,
    password,
    passwordConfirm,
  };

  if (req?.file?.fieldname === "photo") {
    newUser.photo = `http://localhost:3000/api/v1/user/profile/${username}`;
  }

  const user = await User.create(newUser);

  const token = signToken(user._id);
  const responseUser = {
    username: user.username,
    name: user.name,
    email: user.email,
    photo: user.photo,
  };
  res.status(201).json({
    status: "success",
    data: {
      user: responseUser,
      token,
    },
  });
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) check if email and password exist
  if (!email || !password) {
    return res.status(400).json({
      status: "fail",
      message: "Please provide email and password!",
    });
  }
  //2) check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.isPasswordCorrect(password, user.password))) {
    return next(new AppError("Invalid username or password", 401));
  }
  //3) if everything ok, send token to client
  const token = signToken(user._id);
  const responseUser = {
    username: user.username,
    name: user.name,
    email: user.email,
    photo: user.photo,
  };
  res.status(200).json({
    status: "success",
    data: {
      user: responseUser,
      token,
    },
  });
});

const protectedRoute = catchAsync(async (req, res, next) => {
  //1. Get token and check if it exists
  let token;
  if (req.headers?.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    next(new AppError("Authorized Users Only", 401));
  }

  //2.Verify token and handle 2 Errors
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  //3. Check if user exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError("User does not exist", 401));
  }
  //4. is Pasword Changed After the jwt issues
  const changed = currentUser.isPasswordChangedAfterTokenExpires(decoded.iat);
  if (changed) {
    return next(new AppError("User recently changed password", 401));
  }

  req.user = currentUser;

  next();
});

const verifyUser = catchAsync(async (req, res, next) => {
  //1. Get token and check if it exists
  let token;
  if (req.headers?.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    next(new AppError("Authorized Users Only", 401));
  }

  //2.Verify token and handle 2 Errors
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  //3. Check if user exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError("User does not exist", 401));
  }
  //4. is Pasword Changed After the jwt issues
  const changed = currentUser.isPasswordChangedAfterTokenExpires(decoded.iat);
  if (changed) {
    return next(new AppError("User recently changed password", 401));
  }

  res.status(200).json({
    status: "success",
    user: currentUser,
  });
});

const recentProjects = catchAsync(async (req, res, next) => {
  const user = req.user;
  const projects = await Project.find({
    $or: [{ owner: user._id }, { members: user._id }],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate({
      path: "latestVersion",
      populate: {
        path: "report",
        select: "totalSmells",
      },
    })
    .select("title latestVersion createdAt");

  res.status(200).json({
    status: "success",
    projects,
  });
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError("Please provide your email", 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("No user found with this email", 404));
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const clientBase = process.env.CLIENT_URL; // e.g., https://app.example.com
  const apiBase = `${req.protocol}://${req.get("host")}`; // e.g., http://localhost:3000

  const frontendLink = clientBase
    ? `${clientBase.replace(/\/$/, "")}/reset-password/${resetToken}`
    : null;
  const apiLink = `${apiBase}/api/v1/user/reset-password/${resetToken}`;

  const linkToUse = frontendLink || apiLink;

  const subject = "Reset Your Password - Code Smell Detection";
  const text = `Hi ${user.name},\n\nWe received a request to reset the password for your account.\n\nClick the link below to reset your password:\n${linkToUse}\n\nThis link will expire in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\nThanks,\nCode Smell Detection Team`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f8fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; background-color: #24292f; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">🔐 Password Reset</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #24292f; font-size: 16px; line-height: 1.5;">Hi <strong>${
                user.name
              }</strong>,</p>
              <p style="margin: 0 0 24px; color: #57606a; font-size: 15px; line-height: 1.6;">We received a request to reset the password for your account. Click the button below to create a new password:</p>
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 16px 0 32px;">
                    <a href="${linkToUse}" style="display: inline-block; padding: 14px 32px; background-color: #2da44e; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; color: #57606a; font-size: 14px; line-height: 1.5;">Or copy and paste this link into your browser:</p>
              <p style="margin: 0 0 24px; padding: 12px; background-color: #f6f8fa; border-radius: 6px; word-break: break-all;">
                <a href="${linkToUse}" style="color: #0969da; font-size: 13px; text-decoration: none;">${linkToUse}</a>
              </p>
              <div style="padding: 16px; background-color: #fff8c5; border-radius: 6px; border-left: 4px solid #d4a72c;">
                <p style="margin: 0; color: #57606a; font-size: 14px;">⏱️ This link will expire in <strong>10 minutes</strong>.</p>
              </div>
              <p style="margin: 24px 0 0; color: #57606a; font-size: 14px; line-height: 1.5;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f6f8fa; border-radius: 0 0 8px 8px; border-top: 1px solid #d0d7de;">
              <p style="margin: 0 0 8px; color: #57606a; font-size: 13px; text-align: center;">This email was sent by Code Smell Detection & Refactoring System</p>
              <p style="margin: 0; color: #8c959f; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Code Smell Detection. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await sendEmail({ to: user.email, subject, text, html });
  } catch (err) {
    user.passwordResetLink = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("There was an error sending the email", 500));
  }

  res.status(200).json({
    status: "success",
    message: "Reset link sent to email",
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm) {
    return next(new AppError("Please provide password and confirm it", 400));
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetLink: hashedToken,
    passwordResetExpiresAt: { $gt: Date.now() },
  }).select("+password");

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetLink = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  const newToken = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password reset successful",
    data: { token: newToken },
  });
});

export {
  signUp,
  login,
  protectedRoute,
  recentProjects,
  verifyUser,
  forgotPassword,
  resetPassword,
};
