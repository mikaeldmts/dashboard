import { useMemo } from "react";
import { OTHER_LANGUAGE_COLOR, TECH_BASE_SCORES } from "../lib/constants.js";
import { formatBytes, getSkillColor, getSkillDescription } from "../lib/github.js";

export function getStarRating(percentage) {
  const totalStars = 5;
  return Math.max(1, Math.min(totalStars, Math.round((percentage / 100) * totalStars)));
}

export function analyzeSkillsFromRepos(repos = []) {
  const safeRepos = Array.isArray(repos) ? repos : [];
  const languageStats = {};
  const languageRepoCount = {};
  const technologyStats = { ...TECH_BASE_SCORES };
  let totalLanguageBytes = 0;

  safeRepos
    .filter((repo) => repo && !repo.fork)
    .forEach((repo) => {
      const repoBytes = Math.max(Number(repo.size || 0), 1) * 1024;
      const repoText = `${repo.name || ""} ${repo.description || ""}`.toLowerCase();
      const language = repo.language;

      if (language) {
        languageStats[language] = (languageStats[language] || 0) + repoBytes;
        languageRepoCount[language] = (languageRepoCount[language] || 0) + 1;
        totalLanguageBytes += repoBytes;

        if (language === "JavaScript" || language === "TypeScript") {
          technologyStats["Node.js"] = (technologyStats["Node.js"] || 0) + 9;
          technologyStats.React = (technologyStats.React || 0) + 5;
        }
        if (language === "HTML") {
          technologyStats.CSS = (technologyStats.CSS || 0) + 8;
          technologyStats.Bootstrap = (technologyStats.Bootstrap || 0) + 4;
        }
        if (language === "CSS") {
          technologyStats.HTML = (technologyStats.HTML || 0) + 7;
        }
        if (language === "PHP") {
          technologyStats.SQL = (technologyStats.SQL || 0) + 6;
        }
      }

      if (repoText.includes("firebase")) {
        technologyStats.Firebase = (technologyStats.Firebase || 0) + 11;
      }
      if (repoText.includes("api")) {
        technologyStats["API REST"] = (technologyStats["API REST"] || 0) + 8;
      }
      if (repoText.includes("express")) {
        technologyStats["Express.js"] = (technologyStats["Express.js"] || 0) + 7;
      }
      if (repoText.includes("docker")) {
        technologyStats.Docker = (technologyStats.Docker || 0) + 8;
      }
    });

  const mergedSkills = [];

  Object.entries(languageStats).forEach(([language, bytes]) => {
    const distributionPercent = totalLanguageBytes > 0 ? (bytes / totalLanguageBytes) * 100 : 0;
    const diversityBonus = Math.min((languageRepoCount[language] || 1) * 5, 20);
    const finalPercent = Math.min(Math.round(distributionPercent * 0.8 + diversityBonus), 100);

    if (finalPercent < 4) return;

    const percentage = Math.max(8, finalPercent);
    mergedSkills.push({
      name: language,
      percentage,
      type: "Linguagem",
      metric: formatBytes(bytes),
      color: getSkillColor(language),
      description: getSkillDescription(language),
      stars: getStarRating(percentage)
    });
  });

  const maxTechScore = Math.max(...Object.values(technologyStats), 1);
  Object.entries(technologyStats).forEach(([tech, score]) => {
    const techPercent = Math.min(Math.max(Math.round((score / maxTechScore) * 92), 10), 96);
    mergedSkills.push({
      name: tech,
      percentage: techPercent,
      type: "Tecnologia",
      metric: `Score ${score}`,
      color: getSkillColor(tech),
      description: getSkillDescription(tech),
      stars: getStarRating(techPercent)
    });
  });

  return mergedSkills.sort((a, b) => b.percentage - a.percentage).slice(0, 4);
}

export function analyzeLanguagesForDonut(repos = []) {
  const safeRepos = Array.isArray(repos) ? repos : [];
  const langBytes = {};
  let totalBytes = 0;

  safeRepos
    .filter((r) => r && !r.fork)
    .forEach((repo) => {
      const lang = repo.language;
      if (!lang) return;
      const bytes = Math.max(Number(repo.size || 0), 1) * 1024;
      langBytes[lang] = (langBytes[lang] || 0) + bytes;
      totalBytes += bytes;
    });

  if (totalBytes === 0) {
    return {
      slices: [],
      totalLanguages: 0,
      totalBytes: 0
    };
  }

  const sorted = Object.entries(langBytes).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 6);
  const otherBytes = sorted.slice(6).reduce((sum, [, b]) => sum + b, 0);
  if (otherBytes > 0) {
    top.push(["Outros", otherBytes]);
  }

  const slices = top.map(([name, bytes]) => ({
    name,
    bytes,
    percent: Math.round((bytes / totalBytes) * 100),
    color: name === "Outros" ? OTHER_LANGUAGE_COLOR : getSkillColor(name)
  }));

  const sumPercent = slices.reduce((s, d) => s + d.percent, 0);
  if (sumPercent !== 100 && slices.length > 0) {
    slices[0].percent += 100 - sumPercent;
  }

  return {
    slices,
    totalLanguages: sorted.length,
    totalBytes
  };
}

export function useSkillsAnalysis(repos) {
  return useMemo(() => {
    const skills = analyzeSkillsFromRepos(repos);
    const donut = analyzeLanguagesForDonut(repos);

    return {
      skills,
      skillsCountNote: skills.length > 0 ? `${skills.length} skill(s) mapeadas` : "Sem skills detectadas",
      languages: donut.slices,
      totalLanguagesCount: donut.totalLanguages,
      totalBytes: donut.totalBytes,
      chartNote: donut.totalLanguages > 0 ? `${donut.totalLanguages} linguagem(ns)` : "Sem dados"
    };
  }, [repos]);
}
