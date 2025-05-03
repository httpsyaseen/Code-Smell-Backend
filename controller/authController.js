import User from "../models/user.js";
import catchAsync from "../utils/catchAsync.js";
import Project from "../models/project.js";
import jwt from "jsonwebtoken";
import { promisify } from "util";

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
    next("Invalid username or password", 401);
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

const dashboardStats = catchAsync(async (req, res, next) => {
  const user = req.user;
  const projects = await Project.find({
    $or: [{ owner: user._id }, { members: user._id }],
  }).populate([
    {
      path: "latestVersion",
      populate: {
        path: "report",
      },
    },
  ]);
  const totalProjects = projects.length;
  const totalSmells = projects.reduce((acc, project) => {
    if (project.latestVersion && project.latestVersion.report) {
      return acc + project.latestVersion.report.totalSmells;
    }
    return acc;
  }, 0);

  const codeQuality = 100 - (totalSmells / totalProjects) * 100;
  console.log(projects, "projects");

  const chartData = projects.reduce((acc, project) => {
    if (project.latestVersion && project.latestVersion.report) {
      const report = project.latestVersion.report;
      report.chartData.forEach((smell) => {
        const existingSmell = acc.find(
          (item) => item.codeSmellName === smell.codeSmellName
        );
        if (existingSmell) {
          existingSmell.value += smell.value;
        } else {
          acc.push({
            codeSmellName: smell.codeSmellName,
            value: smell.value,
            color: smell.color,
          });
        }
      });
    }
    return acc;
  }, []);

  res.status(200).json({
    status: "success",
    data: {
      totalProjects,
      totalSmells,
      codeQuality,
      chartData,
    },
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

export { signUp, login, protectedRoute, dashboardStats, recentProjects };
