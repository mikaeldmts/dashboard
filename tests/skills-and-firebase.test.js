import { describe, expect, it, vi } from "vitest";
import { FALLBACK_REPOS } from "../src/lib/constants.js";
import {
  analyzeLanguagesForDonut,
  analyzeSkillsFromRepos,
  getStarRating
} from "../src/hooks/useSkillsAnalysis.js";
import { buildChatId, normalizeVisitorThread, sendVisitorMessage } from "../src/lib/firebase.js";
import { createParticlesOptions } from "../src/components/Background.jsx";

describe("skills analysis parity", () => {
  it("matches exact vanilla Top 4 skills percentages on FALLBACK_REPOS", () => {
    const top4 = analyzeSkillsFromRepos(FALLBACK_REPOS);
    expect(top4).toHaveLength(4);
    expect(top4.map((s) => [s.name, s.percentage, s.type])).toEqual([
      ["SQL", 92, "Tecnologia"],
      ["JavaScript", 73, "Linguagem"],
      ["Git", 61, "Tecnologia"],
      ["GitHub", 51, "Tecnologia"]
    ]);
    expect(top4[1].metric).toBe("2.9 MB");
    expect(top4[0].stars).toBe(5);
  });

  it("ignores fork repositories and seeds baseline technologies when repos array is empty", () => {
    const emptySkills = analyzeSkillsFromRepos([]);
    expect(emptySkills.map((s) => [s.name, s.percentage])).toEqual([
      ["Git", 92],
      ["GitHub", 77],
      ["API REST", 46]
    ]);

    const forkOnly = analyzeSkillsFromRepos([
      { name: "forked-docker-firebase", description: "api express", language: "Python", size: 5000, fork: true }
    ]);
    expect(forkOnly.map((s) => s.name)).toEqual(["Git", "GitHub", "API REST"]);
  });

  it("computes star rating within 1..5 bounds", () => {
    expect(getStarRating(0)).toBe(1);
    expect(getStarRating(20)).toBe(1);
    expect(getStarRating(50)).toBe(3);
    expect(getStarRating(92)).toBe(5);
    expect(getStarRating(100)).toBe(5);
  });
});

describe("donut language distribution", () => {
  it("groups >6 languages into Outros and adjusts rounding so sum equals 100%", () => {
    const repos = [
      { language: "TypeScript", size: 400, fork: false },
      { language: "JavaScript", size: 300, fork: false },
      { language: "Python", size: 150, fork: false },
      { language: "PHP", size: 60, fork: false },
      { language: "HTML", size: 40, fork: false },
      { language: "CSS", size: 25, fork: false },
      { language: "C#", size: 15, fork: false },
      { language: "JSON", size: 10, fork: false },
      { language: "Rust", size: 9999, fork: true }
    ];

    const donut = analyzeLanguagesForDonut(repos);
    expect(donut.totalLanguages).toBe(8);
    expect(donut.slices).toHaveLength(7);
    expect(donut.slices[6].name).toBe("Outros");
    expect(donut.slices[6].color).toBe("#4b5563");

    const percentSum = donut.slices.reduce((sum, s) => sum + s.percent, 0);
    expect(percentSum).toBe(100);
  });

  it("returns empty slices and zero count when no non-fork repos have language", () => {
    expect(analyzeLanguagesForDonut([])).toEqual({
      slices: [],
      totalLanguages: 0,
      totalBytes: 0
    });
  });
});

describe("firebase visitor chat normalization & send timeout", () => {
  it("builds deterministic lowercase underscore chat_id and sorts case-insensitive thread chronologically", () => {
    expect(buildChatId("Mikael Matos", 1700000000000)).toBe("mikael_matos_1700000000000");

    const thread = normalizeVisitorThread(
      [
        {
          id: "doc2",
          chat_id: "ana_2",
          nome: "ANA",
          mensagem: "Segunda msg",
          hora: { toDate: () => new Date(2000) },
          respondido: false,
          resposta: null
        },
        {
          id: "doc1",
          chat_id: "ana_1",
          nome: "ana",
          mensagem: "Primeira msg",
          hora: { toDate: () => new Date(1000) },
          respondido: true,
          resposta: "Olá Ana!",
          horaResposta: { toDate: () => new Date(1500) }
        },
        {
          id: "doc3",
          chat_id: "outro_1",
          nome: "Outro",
          mensagem: "Ignorar",
          hora: { toDate: () => new Date(500) },
          respondido: false
        }
      ],
      "Ana"
    );

    expect(thread.map((m) => [m.type, m.text])).toEqual([
      ["user", "Primeira msg"],
      ["admin", "Olá Ana!"],
      ["user", "Segunda msg"]
    ]);
  });

  it("sorts pending serverTimestamp (hora: null) chronologically last, deduplicates doc IDs, and ignores whitespace replies", () => {
    const thread = normalizeVisitorThread(
      [
        {
          id: "pending_no_epoch",
          chat_id: "ana_manual",
          nome: "Ana",
          mensagem: "Sem timestamp ainda",
          hora: null,
          respondido: false
        },
        {
          id: "pending_with_epoch",
          chat_id: "ana_1700000002000",
          nome: "Ana",
          mensagem: "Segunda com chat_id",
          hora: null,
          respondido: false
        },
        {
          id: "old1",
          chat_id: "ana_1700000001000",
          nome: "Ana",
          mensagem: "Antiga",
          hora: { toMillis: () => 1700000001000 },
          respondido: true,
          resposta: "   \n  "
        },
        {
          id: "old1",
          chat_id: "ana_1700000001000",
          nome: "Ana",
          mensagem: "Antiga duplicada",
          hora: { toMillis: () => 1700000001000 },
          respondido: false
        }
      ],
      "Ana"
    );

    expect(thread.map((m) => [m.id, m.text])).toEqual([
      ["old1:user", "Antiga"],
      ["pending_with_epoch:user", "Segunda com chat_id"],
      ["pending_no_epoch:user", "Sem timestamp ainda"]
    ]);
  });

  it("rejects sendVisitorMessage cleanly when Firestore write exceeds timeout", async () => {
    const res = await sendVisitorMessage("Ana", "Teste offline", {
      timeoutMs: 25,
      writeMessageFn: () => new Promise(() => {})
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Tempo esgotado/i);
  });

  it("configures @tsparticles v4 options with valid fill.opacity, opacity range, and top-level resize", async () => {
    const { Options, tsParticles } = await import("@tsparticles/engine");
    const { loadSlim } = await import("@tsparticles/slim");

    await loadSlim(tsParticles);
    const options = createParticlesOptions(false);

    expect(options.resize).toEqual({ enable: true });
    expect(options.interactivity.events.resize).toBeUndefined();
    expect(options.particles.paint.fill.opacity).toBe(1);
    expect(options.particles.opacity.value).toEqual({ min: 0.25, max: 0.65 });

    const parsed = new Options(tsParticles.pluginManager);
    parsed.load(options);
    expect(parsed.resize.enable).toBe(true);
    expect(parsed.particles.paint.fill.opacity).toBe(1);
  });
});
