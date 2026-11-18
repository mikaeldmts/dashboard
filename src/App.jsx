import { useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Background } from "./components/Background.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";
import { DonutChart } from "./components/DonutChart.jsx";
import { Footer } from "./components/Footer.jsx";
import { HeroCard } from "./components/HeroCard.jsx";
import { LanguagesCard } from "./components/LanguagesCard.jsx";
import { OverthinkerChat } from "./components/OverthinkerChat.jsx";
import { SkillsGrid } from "./components/SkillsGrid.jsx";
import { TelemetryCard } from "./components/TelemetryCard.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { WelcomePortal } from "./components/WelcomePortal.jsx";
import { WorldAnalysisView } from "./components/WorldAnalysisView.jsx";
import { useGithubData } from "./hooks/useGithubData.js";
import { useSkillsAnalysis } from "./hooks/useSkillsAnalysis.js";
import { useWorldIntel } from "./hooks/useWorldIntel.js";

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
  // Visitor starts on the bespoke Welcome Portal; clicking "Ir para o Dashboard" enters Realtime World Analysis ("world")
  const [activeView, setActiveView] = useState("welcome");

  const {
    profile,
    repos,
    statusText: ghStatusText,
    statusVariant: ghStatusVariant,
    syncedAt,
    error: ghError,
    isLoading: ghIsLoading,
    isRateLimited: ghIsRateLimited,
    hasReposData,
    refresh: refreshGithub
  } = useGithubData();

  const {
    skills,
    skillsCountNote,
    languages,
    totalLanguagesCount,
    totalBytes,
    chartNote
  } = useSkillsAnalysis(repos);

  // Pre-warm planetary intelligence right away so entering from Welcome is instantaneous
  const {
    globalData,
    selectedCountry,
    countryData,
    activeIntel,
    isLoadingGlobal,
    isLoadingCountry,
    isBusy: worldIsBusy,
    error: worldError,
    selectCountry,
    clearCountry,
    refreshActive: refreshWorld
  } = useWorldIntel({ enabled: true });

  const isColdSkillsLoading = ghIsLoading && !hasReposData;

  const worldStatusText = worldIsBusy
    ? "Sincronizando..."
    : worldError
      ? "Sinal parcial"
      : selectedCountry
        ? `${selectedCountry.iso2 || "PAÍS"} · Ao vivo`
        : "Planeta · Online";

  const worldStatusVariant = worldIsBusy
    ? "updating"
    : worldError
      ? "offline"
      : "online";

  const worldSnapshot = useMemo(() => {
    const src = activeIntel || globalData;
    if (!src) return null;
    return {
      scope: selectedCountry ? selectedCountry.namePt : "Global",
      tensionIndex: src.tensionIndex,
      statusLabel: src.statusLabel,
      executiveBrief: src.executiveBrief,
      topPredictions: (src.predictions || []).map((p) => ({
        horizon: p.horizon,
        title: p.title,
        probability: p.probability
      }))
    };
  }, [activeIntel, globalData, selectedCountry]);

  function handleNavigate(nextView) {
    setActiveView(nextView);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <Background />

      <AnimatePresence mode="wait">
        {activeView === "welcome" ? (
          <motion.div
            key="welcome-portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <WelcomePortal
              onEnterWorld={() => handleNavigate("world")}
              onEnterGithub={() => handleNavigate("github")}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`suite-${activeView}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
          >
            <Topbar
              activeView={activeView}
              onSelectView={handleNavigate}
              statusText={activeView === "world" ? worldStatusText : ghStatusText}
              statusVariant={activeView === "world" ? worldStatusVariant : ghStatusVariant}
              isLoading={activeView === "world" ? worldIsBusy : ghIsLoading}
              isRateLimited={activeView === "world" ? false : ghIsRateLimited}
              onRefresh={activeView === "world" ? refreshWorld : refreshGithub}
            />

            {activeView === "world" ? (
              <WorldAnalysisView
                globalData={globalData}
                selectedCountry={selectedCountry}
                countryData={countryData}
                activeIntel={activeIntel}
                isLoadingGlobal={isLoadingGlobal}
                isLoadingCountry={isLoadingCountry}
                error={worldError}
                onSelectCountry={selectCountry}
                onClearCountry={clearCountry}
              />
            ) : (
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
                  isLoading={ghIsLoading}
                  hasReposData={hasReposData}
                  error={ghError}
                  variants={cardVariants}
                />
              </motion.main>
            )}

            <Footer />
          </motion.div>
        )}
      </AnimatePresence>

      <OverthinkerChat
        activeView={activeView}
        worldSnapshot={worldSnapshot}
        profile={profile}
        skills={skills}
        languages={languages}
        totalLanguagesCount={totalLanguagesCount}
        syncedAt={syncedAt}
        statusText={activeView === "world" ? worldStatusText : ghStatusText}
      />

      <ChatWidget />
    </MotionConfig>
  );
}

export default App;
