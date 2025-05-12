import { Smells } from "../constants/codeSmellInfo.js";

function calculateAffectedFiles(smells) {
  const affectedFiles = smells.reduce((acc, curr) => {
    const existingFile = acc.find((file) => file.fileName === curr.fileName);
    if (existingFile) {
      existingFile.totalOccurrences += 1;
    } else {
      acc.push({
        fileName: curr.fileName,
      });
    }
    return acc;
  }, []);

  return affectedFiles;
}

const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};
function calculateChartData(smells) {
  const countMap = {};

  smells.forEach((item) => {
    const category = item.category;
    countMap[category] = (countMap[category] || 0) + 1;
  });

  return Object.entries(countMap).map(([category, value]) => ({
    category,
    value,
    color: getRandomColor(),
  }));
}

function calculateTotalSmellsInProjects(projects) {
  const totalSmells = projects.reduce((acc, project) => {
    if (project.latestVersion && project.latestVersion.report) {
      return acc + project.latestVersion.report.totalSmells;
    }
    return acc;
  }, 0);
  return totalSmells;
}

function calculateDashboardCodeQualityScore(projects) {
  const totalScore = projects.length * 100;
  const codeQuality = projects.reduce((acc, projects) => {
    return acc + projects.qualityScore;
  }, 0);
  return (codeQuality / totalScore) * 100;
}

function calculateDashboardChartData(projects) {
  const chartDataMap = new Map();

  for (const project of projects) {
    const report = project.latestVersion?.report;
    console.log(report);
    if (!report || !Array.isArray(report.chartData)) continue;

    for (const { category, value, color } of report.chartData) {
      if (!category) continue; // skip if category is not present

      if (chartDataMap.has(category)) {
        chartDataMap.get(category).value += value;
      } else {
        chartDataMap.set(category, { category, value, color });
      }
    }
  }

  return Array.from(chartDataMap.values());
}

function calculateCodeQuality(codeSmells, totalFiles) {
  const baseScore = totalFiles * 3;
  let totalImpact = 0;

  for (const smell of codeSmells) {
    totalImpact += smell.weight;
  }

  const qualityScore =
    totalImpact > baseScore ? 1 : (totalImpact / baseScore) * 100;
  return qualityScore;
}

export {
  calculateAffectedFiles,
  calculateChartData,
  calculateTotalSmellsInProjects,
  calculateDashboardCodeQualityScore,
  calculateDashboardChartData,
  calculateCodeQuality,
};
