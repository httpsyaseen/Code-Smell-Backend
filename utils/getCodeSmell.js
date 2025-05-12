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

  return response?.data?.codeSmells;
}

export { getCodeSmellData };
