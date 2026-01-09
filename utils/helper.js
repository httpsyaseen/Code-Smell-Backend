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

function calculateChartData(smells) {
  const countMap = {};

  smells.forEach((item) => {
    const category = item.category;
    countMap[category] = (countMap[category] || 0) + 1;
  });

  return Object.entries(countMap).map(([category, value]) => {
    const color =
      category === "Design"
        ? "#2ea043"
        : category === "Best Practices"
        ? "#0366d6"
        : "#8250df";
    return {
      category,
      value,
      color,
    };
  });
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
  if (totalFiles === 0) return 100; // perfect score for empty project

  // Constants for quality calculation
  const PERFECT_SCORE = 100;
  const SMELL_DENSITY_THRESHOLD = 2; // smells per file threshold for healthy code

  // Category-based severity multipliers
  const SEVERITY_MULTIPLIERS = {
    design: 1.2, // Design issues have higher impact
    "best practices": 0.8, // Best practices are important but less critical
    semantic: 1.0, // Semantic issues have standard impact on code correctness
    default: 1.0,
  };

  // Calculate smell statistics
  const totalSmells = codeSmells.length;
  const smellDensity = totalSmells / totalFiles; // smells per file

  // Calculate category-weighted impact
  let weightedImpact = 0;
  const categoryDistribution = {};

  for (const smell of codeSmells) {
    const category = smell.category?.toLowerCase() || "default";
    const multiplier =
      SEVERITY_MULTIPLIERS[category] || SEVERITY_MULTIPLIERS.default;
    weightedImpact += (smell.weight || 3) * multiplier;

    // Track category distribution
    categoryDistribution[category] = (categoryDistribution[category] || 0) + 1;
  }

  // Calculate category diversity penalty (0-15 points)
  // Projects with diverse smell types indicate broader quality issues
  const uniqueCategories = Object.keys(categoryDistribution).length;
  const diversityPenalty = Math.min(15, uniqueCategories * 5);

  // Calculate density penalty with non-linear curve
  // Penalize projects with high smell concentration
  const densityRatio = smellDensity / SMELL_DENSITY_THRESHOLD;
  const densityPenalty =
    densityRatio > 1 ? Math.min(25, 15 * Math.log(densityRatio + 1)) : 0;

  // Calculate base deduction from weighted impact
  // Normalize by file count to make scores comparable across projects
  const impactPerFile = weightedImpact / totalFiles;
  const baseDeduction = Math.min(50, impactPerFile * 8); // cap at 50 points

  // Calculate final quality score
  let qualityScore =
    PERFECT_SCORE - baseDeduction - densityPenalty - diversityPenalty;

  // Apply floor (minimum score of 0)
  qualityScore = Math.max(0, qualityScore);

  // Round to 2 decimal places for readability
  qualityScore = Math.round(qualityScore * 100) / 100;

  console.log({
    totalFiles,
    totalSmells,
    smellDensity: smellDensity.toFixed(2),
    weightedImpact,
    baseDeduction: baseDeduction.toFixed(2),
    densityPenalty: densityPenalty.toFixed(2),
    diversityPenalty,
    finalScore: qualityScore,
  });

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
