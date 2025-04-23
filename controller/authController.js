import User from "../models/user.js";
import catchAsync from "../utils/catchAsync.js";
import jwt from "jsonwebtoken";

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
  console.log(req.file, "req.file");
  if (req?.file?.fieldname === "photo") {
    newUser.photo = `http://localhost:3000/api/v1/profile/${username}`;
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

const login = catchAsync(async (req, res) => {
  console.log(req.body, "login body");
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
    return res.status(401).json({
      status: "fail",
      message: "Incorrect email or password",
    });
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

export { signUp, login };
