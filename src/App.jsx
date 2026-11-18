import { useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Background } from "./components/Background.jsx";
import { ChatWidget } from "./components/ChatWidget.jsx";
import { GitHubDashboardView } from "./components/GitHubDashboardView.jsx";
import { OverthinkerChat } from "./components/OverthinkerChat.jsx";
import { Topbar } from "./components/Topbar.jsx";
import { WelcomePortal } from "./components/WelcomePortal.jsx";
import { WorldAnalysisView } from "./components/WorldAnalysisView.jsx";
import { useGithubData } from "./hooks/useGithubData.js";
import { useSkillsAnalysis } from "./hooks/useSkillsAnalysis.js";
import { useWorldIntel } from "./hooks/useWorldIntel.js";

export function App() {
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

  // Minimal world context snapshot passed to Overthinker (World view mode only)
  const worldSnapshot = useMemo(() => {
    if (activeView !== "world") return null;
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
  }, [activeIntel, globalData, selectedCountry, activeView]);

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
              <GitHubDashboardView
                profile={profile}
                repos={repos}
                syncedAt={syncedAt}
                error={ghError}
                isLoading={ghIsLoading}
                hasReposData={hasReposData}
                skills={isColdSkillsLoading ? [] : skills}
                skillsCountNote={isColdSkillsLoading ? "Aguardando análise..." : skillsCountNote}
                languages={languages}
                totalLanguagesCount={totalLanguagesCount}
                totalBytes={totalBytes}
                chartNote={chartNote}
                ghStatusText={ghStatusText}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overthinker: World mode = world analyst; GitHub mode = renders as inline chat in GitHubDashboardView */}
      {activeView === "world" && (
        <OverthinkerChat
          activeView="world"
          worldSnapshot={worldSnapshot}
          profile={null}
          skills={[]}
          languages={[]}
          totalLanguagesCount={0}
          syncedAt={null}
          statusText={worldStatusText}
        />
      )}

      <ChatWidget />
    </MotionConfig>
  );
}

export default App;
