import AdmZip from "adm-zip";

export const extractJavaFilesFromZip = (zipBuffer) => {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  const javaFiles = zipEntries
    .filter(
      (entry) =>
        !entry.isDirectory &&
        entry.entryName.endsWith(".java") &&
        !/\/?test\//i.test(entry.entryName) // exclude any path containing /test/
    )
    .map((entry) => ({
      fileName: entry.entryName.split("/").pop(),
      content: entry.getData().toString("utf-8"),
    }));

  return javaFiles;
};
