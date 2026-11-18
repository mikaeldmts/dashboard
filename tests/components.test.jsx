import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_PROFILE, FALLBACK_REPOS } from "../src/lib/constants.js";
import * as firebaseLib from "../src/lib/firebase.js";
import { ChatWidget } from "../src/components/ChatWidget.jsx";
import { DonutChart } from "../src/components/DonutChart.jsx";
import { Footer } from "../src/components/Footer.jsx";
import { HeroCard } from "../src/components/HeroCard.jsx";
import { LanguagesCard } from "../src/components/LanguagesCard.jsx";
import { SkillsGrid } from "../src/components/SkillsGrid.jsx";
import { TelemetryCard } from "../src/components/TelemetryCard.jsx";
import { Topbar } from "../src/components/Topbar.jsx";
import { analyzeLanguagesForDonut, analyzeSkillsFromRepos } from "../src/hooks/useSkillsAnalysis.js";

function renderWithMotion(ui) {
  return render(<MotionConfig reducedMotion="always">{ui}</MotionConfig>);
}

describe("Dashboard React components", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Topbar status chip and triggers manual refresh when enabled", () => {
    const onRefresh = vi.fn();
    renderWithMotion(
      <Topbar
        statusText="Online"
        statusVariant="online"
        isLoading={false}
        isRateLimited={false}
        onRefresh={onRefresh}
      />
    );

    expect(screen.getByText("GitHub Intelligence")).toBeInTheDocument();
    expect(screen.getByText("Online")).toBeInTheDocument();
    const refreshButton = screen.getByRole("button", { name: /Atualizar dados do GitHub/i });
    fireEvent.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("disables Topbar refresh button during rate limit", () => {
    renderWithMotion(
      <Topbar
        statusText="Rate limit"
        statusVariant="ratelimit"
        isLoading={false}
        isRateLimited={true}
        onRefresh={() => {}}
      />
    );

    const refreshButton = screen.getByRole("button", { name: /rate limit/i });
    expect(refreshButton).toBeDisabled();
  });

  it("renders HeroCard and TelemetryCard with profile data", () => {
    renderWithMotion(
      <>
        <HeroCard profile={FALLBACK_PROFILE} />
        <TelemetryCard profile={FALLBACK_PROFILE} syncedAt="28/01/2026, 16:12" />
      </>
    );

    expect(screen.getByRole("heading", { name: "GitHub Profile: mikaeldmts" })).toBeInTheDocument();
    expect(screen.getByText("Mikael F. de Matos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "@mikaeldmts" })).toHaveAttribute(
      "href",
      "https://github.com/mikaeldmts"
    );
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("28/01/2026, 16:12")).toBeInTheDocument();
  });

  it("renders DonutChart slices and updates center readout on legend hover", () => {
    const donut = analyzeLanguagesForDonut(FALLBACK_REPOS);
    renderWithMotion(
      <DonutChart
        slices={donut.slices}
        totalLanguages={donut.totalLanguages}
        totalBytes={donut.totalBytes}
        chartNote={`${donut.totalLanguages} linguagem(ns)`}
      />
    );

    expect(screen.getByText("2 linguagem(ns)")).toBeInTheDocument();
    const phpLegendBtn = screen.getByRole("button", { name: /PHP/i });
    fireEvent.mouseEnter(phpLegendBtn);
    expect(phpLegendBtn).toHaveClass("active");
  });

  it("renders LanguagesCard with all 5 spoken languages and Footer without admin links", () => {
    renderWithMotion(
      <>
        <LanguagesCard />
        <Footer />
      </>
    );

    expect(screen.getByText("Português")).toBeInTheDocument();
    expect(screen.getByText("Nativo")).toBeInTheDocument();
    expect(screen.getByText("Inglês")).toBeInTheDocument();
    expect(screen.getByText("Francês")).toBeInTheDocument();
    expect(screen.getByText("Mandarim")).toBeInTheDocument();
    expect(screen.getByText("Hebraico")).toBeInTheDocument();
    expect(
      screen.getByText("GitHub Realtime Dashboard · Sincronizado via GitHub REST API")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders SkillsGrid Top 4 skills including C# and JSON cleanly", () => {
    const skills = analyzeSkillsFromRepos(FALLBACK_REPOS);
    const customSkills = [
      ...skills.slice(0, 2),
      {
        name: "C#",
        percentage: 55,
        type: "Linguagem",
        metric: "120 KB",
        color: "#178600",
        description: "Desc C#",
        stars: 3
      },
      {
        name: "JSON",
        percentage: 42,
        type: "Tecnologia",
        metric: "Score 8",
        color: "#94a3b8",
        description: "Desc JSON",
        stars: 2
      }
    ];

    renderWithMotion(
      <SkillsGrid
        skills={customSkills}
        skillsCountNote="4 skill(s) mapeadas"
        isLoading={false}
      />
    );

    expect(screen.getByRole("heading", { name: "SQL" })).toBeInTheDocument();
    expect(screen.getByText("92%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "C#" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "JSON" })).toBeInTheDocument();
    expect(screen.getByText("4 skill(s) mapeadas")).toBeInTheDocument();
  });

  it("supports ChatWidget toggle, char counter, validation, Firestore submit, and unread badge", async () => {
    let snapshotCallback = null;
    const unsubscribeMock = vi.fn();

    vi.spyOn(firebaseLib, "subscribeVisitorMessages").mockImplementation((_name, cb) => {
      snapshotCallback = cb;
      return unsubscribeMock;
    });
    vi.spyOn(firebaseLib, "sendVisitorMessage").mockResolvedValue({
      success: true,
      messageId: "msg-123",
      chatId: "joao_1700000000"
    });

    renderWithMotion(<ChatWidget />);

    const toggleBtn = screen.getByRole("button", { name: /Abrir chat/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const form = document.getElementById("chat-form");
    fireEvent.submit(form);
    expect(screen.getByText(/Preencha todos os campos/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Joao" } });
    fireEvent.change(screen.getByPlaceholderText("Sua mensagem..."), {
      target: { value: "Olá Mikael!" }
    });
    expect(screen.getByText("11/500")).toBeInTheDocument();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Mensagem enviada")).toBeInTheDocument();
    });

    expect(localStorage.getItem("chat_widget_submitted")).toBe("1");
    expect(localStorage.getItem("current_chat_name")).toBe("Joao");
    expect(localStorage.getItem("current_chat_id")).toBe("joao_1700000000");

    // Close widget and simulate incoming admin reply to verify unread badge activates
    fireEvent.click(screen.getByRole("button", { name: /Fechar janela de chat/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    snapshotCallback?.([
      { id: "msg-123:user", docId: "msg-123", type: "user", text: "Olá Mikael!" },
      { id: "msg-123:admin", docId: "msg-123", type: "admin", text: "Oi Joao!" }
    ]);

    await waitFor(() => {
      expect(screen.getByLabelText("Nova resposta recebida")).toBeInTheDocument();
    });

    // Re-open clears unread badge and displays restored history
    fireEvent.click(screen.getByRole("button", { name: /Abrir chat/i }));
    await waitFor(() => {
      expect(screen.getByText("Oi Joao!")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Nova resposta recebida")).not.toBeInTheDocument();
  });

  it("closes ChatWidget on Escape key and outside click", async () => {
    renderWithMotion(<ChatWidget />);

    fireEvent.click(screen.getByRole("button", { name: /Abrir chat/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Abrir chat/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renders Background ambient glows without blocking UI when reduced motion is enabled", async () => {
    const { Background } = await import("../src/components/Background.jsx");
    const { container } = renderWithMotion(<Background />);
    const stage = container.querySelector(".bg-stage");
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".ambient-glow")).toHaveLength(3);
  });

  it("renders '-' in TelemetryCard when profile is null and updates cleanly without resetting to 0", async () => {
    const { rerender } = renderWithMotion(<TelemetryCard profile={null} syncedAt="-" />);
    expect(document.getElementById("repos").textContent).toBe("-");

    rerender(
      <MotionConfig reducedMotion="always">
        <TelemetryCard profile={{ ...FALLBACK_PROFILE, public_repos: 12 }} syncedAt="18/11/2026" />
      </MotionConfig>
    );
    await waitFor(() => {
      expect(document.getElementById("repos").textContent).toBe("12");
    });

    rerender(
      <MotionConfig reducedMotion="always">
        <TelemetryCard profile={{ ...FALLBACK_PROFILE, public_repos: 15 }} syncedAt="18/11/2026" />
      </MotionConfig>
    );
    await waitFor(() => {
      expect(document.getElementById("repos").textContent).toBe("15");
    });
  });

  it("displays #skillsLoading during cold uncached load when hasReposData is false", () => {
    renderWithMotion(
      <SkillsGrid
        skills={[]}
        skillsCountNote="Aguardando análise..."
        isLoading={true}
        hasReposData={false}
      />
    );

    expect(document.getElementById("skillsLoading")).toBeInTheDocument();
    expect(document.getElementById("skillsCountNote").textContent).toBe("Aguardando análise...");
    expect(document.querySelectorAll(".skill-card")).toHaveLength(0);
  });

  it("handles 100%+0% donut slices with round cap & no gap, 99%+1% seam gap, and instant rapid hover updates", () => {
    const { container, rerender } = renderWithMotion(
      <DonutChart
        slices={[
          { name: "JavaScript", bytes: 100000, percent: 100, color: "#f7df1e" },
          { name: "Ruby", bytes: 10, percent: 0, color: "#7dd3fc" }
        ]}
        totalLanguages={2}
        totalBytes={100010}
        chartNote="2 linguagem(ns)"
      />
    );

    const circles100 = container.querySelectorAll("svg.donut-svg circle");
    // Background ring + 2 slice circles
    expect(circles100).toHaveLength(3);
    expect(circles100[1].getAttribute("stroke-linecap")).toBe("round");
    expect(circles100[1].getAttribute("stroke-dasharray")).toContain("0");
    expect(circles100[2].getAttribute("stroke-dasharray")).toMatch(/^0 /);

    rerender(
      <MotionConfig reducedMotion="always">
        <DonutChart
          slices={[
            { name: "TypeScript", bytes: 99000, percent: 99, color: "#3178c6" },
            { name: "CSS", bytes: 1000, percent: 1, color: "#264de4" }
          ]}
          totalLanguages={2}
          totalBytes={100000}
          chartNote="2 linguagem(ns)"
        />
      </MotionConfig>
    );

    const circles99 = container.querySelectorAll("svg.donut-svg circle");
    expect(circles99[1].getAttribute("stroke-linecap")).toBe("butt");
    expect(circles99[2].getAttribute("stroke-linecap")).toBe("butt");

    const tsBtn = screen.getByRole("button", { name: /TypeScript/i });
    const cssBtn = screen.getByRole("button", { name: /CSS/i });
    fireEvent.mouseEnter(tsBtn);
    expect(container.querySelector(".donut-center-name").textContent).toBe("TypeScript");
    fireEvent.mouseEnter(cssBtn);
    expect(container.querySelector(".donut-center-name").textContent).toBe("CSS");
  });

  it("persists seen admin reply IDs across reloads and focuses close button when opening post-submit chat", async () => {
    localStorage.setItem("chat_widget_submitted", "1");
    localStorage.setItem("current_chat_name", "Ana");
    localStorage.setItem("chat_seen_admin_ids", JSON.stringify(["msg-1:admin"]));

    let snapshotCb = null;
    vi.spyOn(firebaseLib, "subscribeVisitorMessages").mockImplementation((_name, cb) => {
      snapshotCb = cb;
      return () => {};
    });

    renderWithMotion(<ChatWidget />);

    // Previously seen reply should NOT trigger unread badge on reload
    snapshotCb?.([
      { id: "msg-1:user", docId: "msg-1", type: "user", text: "Oi" },
      { id: "msg-1:admin", docId: "msg-1", type: "admin", text: "Olá de antes" }
    ]);
    expect(screen.queryByLabelText("Nova resposta recebida")).not.toBeInTheDocument();

    // Unseen admin reply arriving while closed DOES trigger unread badge
    snapshotCb?.([
      { id: "msg-1:user", docId: "msg-1", type: "user", text: "Oi" },
      { id: "msg-1:admin", docId: "msg-1", type: "admin", text: "Olá de antes" },
      { id: "msg-2:admin", docId: "msg-2", type: "admin", text: "Nova resposta!" }
    ]);
    await waitFor(() => {
      expect(screen.getByLabelText("Nova resposta recebida")).toBeInTheDocument();
    });

    // Opening post-submit dialog persists newly seen admin ID and moves focus to close button
    fireEvent.click(screen.getByRole("button", { name: /Abrir chat/i }));
    await waitFor(() => {
      expect(document.activeElement).toBe(document.getElementById("chat-widget-close"));
    });
    const storedSeen = JSON.parse(localStorage.getItem("chat_seen_admin_ids"));
    expect(storedSeen).toContain("msg-2:admin");
  });
});

