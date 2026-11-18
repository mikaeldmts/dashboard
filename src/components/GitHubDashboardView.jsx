import { motion } from "framer-motion";
import { DonutChart } from "./DonutChart.jsx";
import { Footer } from "./Footer.jsx";
import { HeroCard } from "./HeroCard.jsx";
import { LanguagesCard } from "./LanguagesCard.jsx";
import { OverthinkerGitHubPanel } from "./OverthinkerChat.jsx";
import { SkillsGrid } from "./SkillsGrid.jsx";
import { TelemetryCard } from "./TelemetryCard.jsx";

const layoutContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
  }
};

export function GitHubDashboardView({
  profile,
  repos,
  syncedAt,
  error,
  isLoading,
  hasReposData,
  skills,
  skillsCountNote,
  languages,
  totalLanguagesCount,
  totalBytes,
  chartNote,
  ghStatusText
}) {
  return (
    <motion.main
      className="github-dashboard-layout"
      variants={layoutContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Left column: original dashboard cards */}
      <div className="github-dashboard-cards">
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
          skills={skills}
          skillsCountNote={skillsCountNote}
          isLoading={isLoading}
          hasReposData={hasReposData}
          error={error}
          variants={cardVariants}
        />
      </div>

      {/* Right column: Overthinker chat panel (open by default, profile-focused) */}
      <aside className="github-dashboard-chat-col" aria-label="Assistente Overthinker — Perfil profissional">
        <OverthinkerGitHubPanel
          profile={profile}
          skills={skills}
          languages={languages}
          totalLanguagesCount={totalLanguagesCount}
          syncedAt={syncedAt}
          statusText={ghStatusText}
        />
      </aside>

      <Footer />
    </motion.main>
  );
}

export default GitHubDashboardView;
