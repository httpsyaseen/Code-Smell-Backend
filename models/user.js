import { Schema, model } from "mongoose";
import pkg from "validator";
const { isEmail } = pkg;
import { hash, compare } from "bcrypt";
import { randomBytes, createHash } from "crypto";

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, "Please provide a username"],
    unique: true,
    trim: true,
    lowercase: true,
    set: (value) => value.trim(), // Auto trim the username
  },
  name: {
    type: String,
    required: [true, "Please provide a name"],
  },
  email: {
    type: String,
    unique: true,
    low: true,
    required: [true, "Pleae provide an Email"],
    validate: [isEmail, "Please Provide a valid email"],
  },
  role: {
    type: String,
    enum: ["user", "owner"],
    default: "user",
  },

  password: {
    type: String,
    minlength: [8, "Password must be more than or equal to 8 characters"],
    required: [true, "Please provide a password"],
    select: false,
  },
  photo: String,
  passwordConfirm: {
    type: String,
    min: [8, "Password must be more than or equal to 8 characters"],
    required: [true, "Please Confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Password Doesnot Match",
    },
  },

  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordChangedAt: Date,
  passwordResetExpiresAt: Date,
  passwordResetLink: String,
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: true });
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) next();
  this.password = await hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.methods.isPasswordCorrect = async function (
  candiatePassword,
  userPassword
) {
  return await compare(candiatePassword, userPassword);
};

userSchema.methods.isPasswordChangedAfterTokenExpires = function (
  JWTTimestamp
) {
  if (this.passwordChangedAt) {
    const passChangedTime = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < passChangedTime;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = randomBytes(32).toString("hex");

  this.passwordResetLink = createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpiresAt = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = model("User", userSchema);

export default User;
