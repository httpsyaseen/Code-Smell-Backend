import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
const app = express();
import userRouter from "./router/userRouter.js";
import projectRouter from "./router/projectRouter.js";
import globalErrorHandler from "./controller/errorController.js";

//middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

//routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/project", projectRouter);

// app.get("*", (req, res, next) => {
//   next(new AppError("Route not found", 404));
// });

app.use(globalErrorHandler);

mongoose
  .connect(process.env.LOCAL_DB)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.log(err, "Server shut down"));

process.on("unhandledRejection", () => {
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", () => {
  server.close(() => {
    process.exit(1);
  });
});

const server = app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
