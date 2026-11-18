import { motion, MotionConfig } from "framer-motion";
import { Background } from "./components/Background.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";
import { DonutChart } from "./components/DonutChart.jsx";
import { Footer } from "./components/Footer.jsx";
import { HeroCard } from "./components/HeroCard.jsx";
import { LanguagesCard } from "./components/LanguagesCard.jsx";
import { SkillsGrid } from "./components/SkillsGrid.jsx";
import { TelemetryCard } from "./components/TelemetryCard.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { useGithubData } from "./hooks/useGithubData.js";
import { useSkillsAnalysis } from "./hooks/useSkillsAnalysis.js";

const layoutContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export function App() {
  const {
    profile,
    repos,
    statusText,
    statusVariant,
    syncedAt,
    error,
    isLoading,
    isRateLimited,
    hasReposData,
    refresh
  } = useGithubData();

  const {
    skills,
    skillsCountNote,
    languages,
    totalLanguagesCount,
    totalBytes,
    chartNote
  } = useSkillsAnalysis(repos);

  const isColdSkillsLoading = isLoading && !hasReposData;

  return (
    <MotionConfig reducedMotion="user">
      <Background />

      <Topbar
        statusText={statusText}
        statusVariant={statusVariant}
        isLoading={isLoading}
        isRateLimited={isRateLimited}
        onRefresh={refresh}
      />

      <motion.main
        className="layout"
        variants={layoutContainerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="bento-top">
          <HeroCard profile={profile} variants={cardVariants} />
          <TelemetryCard profile={profile} syncedAt={syncedAt} variants={cardVariants} />
        </div>

        <div className="bento-mid">
          <DonutChart
            slices={languages}
            totalLanguages={totalLanguagesCount}
            totalBytes={totalBytes}
            chartNote={chartNote}
            variants={cardVariants}
          />
          <LanguagesCard variants={cardVariants} />
        </div>

        <SkillsGrid
          skills={isColdSkillsLoading ? [] : skills}
          skillsCountNote={isColdSkillsLoading ? "Aguardando análise..." : skillsCountNote}
          isLoading={isLoading}
          hasReposData={hasReposData}
          error={error}
          variants={cardVariants}
        />
      </motion.main>

      <Footer />

      <ChatWidget />
    </MotionConfig>
  );
}

export default App;
