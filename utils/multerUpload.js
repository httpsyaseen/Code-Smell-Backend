import multer from "multer";

// Configure storage (e.g., save files to a folder)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "profiles/"); // Folder to save files
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, req.body.username + "." + file.mimetype.split(/\//)[1]);
  },
});

// Optional: Filter to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image file!"), false);
  }
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
});

export { upload };
