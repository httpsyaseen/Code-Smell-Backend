import axios from "axios";
import FormData from "form-data";

async function getCodeSmellData(zipFile) {
  const formData = new FormData();

  formData.append("file", zipFile.buffer, {
    filename: zipFile.originalname,
    contentType: zipFile.mimetype,
  });

  const response = await axios.post("http://localhost:5000/upload", formData, {
    headers: formData.getHeaders(),
  });
  console.log("Code Smell Response:", response.data);

  return response?.data?.codeSmells;
}

export const getSmellyJavaFiles = (javaFiles, codeSmells) => {
  const targetFileNames = new Set(codeSmells.map((smell) => smell.fileName));

  const smellyFiles = javaFiles.filter((file) =>
    targetFileNames.has(file.fileName)
  );

  return smellyFiles;
};

export { getCodeSmellData };
