const DEFAULT_APP_CONFIG = {
  githubUsername: "mikaeldmts",
  refreshSeconds: 300,
  profileCacheMinutes: 15,
  reposCacheMinutes: 30
};

export function resolveAppConfig(overrideConfig) {
  const globalOverride =
    overrideConfig !== undefined
      ? overrideConfig
      : typeof globalThis !== "undefined" && globalThis.APP_CONFIG
        ? globalThis.APP_CONFIG
        : {};

  const githubUsername =
    typeof globalOverride?.githubUsername === "string" && globalOverride.githubUsername.trim()
      ? globalOverride.githubUsername.trim()
      : DEFAULT_APP_CONFIG.githubUsername;

  const rawRefreshSeconds = Number(globalOverride?.refreshSeconds ?? DEFAULT_APP_CONFIG.refreshSeconds);
  const rawProfileCacheMinutes = Number(
    globalOverride?.profileCacheMinutes ?? DEFAULT_APP_CONFIG.profileCacheMinutes
  );
  const rawReposCacheMinutes = Number(
    globalOverride?.reposCacheMinutes ?? DEFAULT_APP_CONFIG.reposCacheMinutes
  );

  const safeRefreshSeconds = Number.isFinite(rawRefreshSeconds)
    ? rawRefreshSeconds
    : DEFAULT_APP_CONFIG.refreshSeconds;
  const safeProfileMinutes = Number.isFinite(rawProfileCacheMinutes)
    ? rawProfileCacheMinutes
    : DEFAULT_APP_CONFIG.profileCacheMinutes;
  const safeReposMinutes = Number.isFinite(rawReposCacheMinutes)
    ? rawReposCacheMinutes
    : DEFAULT_APP_CONFIG.reposCacheMinutes;

  const refreshMs = Math.max(safeRefreshSeconds * 1000, 60 * 1000);
  const profileCacheTtlMs = Math.max(safeProfileMinutes * 60 * 1000, 60 * 1000);
  const reposCacheTtlMs = Math.max(safeReposMinutes * 60 * 1000, 60 * 1000);

  return {
    githubUsername,
    refreshSeconds: refreshMs / 1000,
    profileCacheMinutes: profileCacheTtlMs / (60 * 1000),
    reposCacheMinutes: reposCacheTtlMs / (60 * 1000),
    refreshMs,
    profileCacheTtlMs,
    reposCacheTtlMs
  };
}

export const APP_CONFIG = resolveAppConfig();

export function CACHE_KEYS(username = APP_CONFIG.githubUsername) {
  const safeUser = username || DEFAULT_APP_CONFIG.githubUsername;
  return {
    profile: `gh_profile_${safeUser}`,
    repos: `gh_repos_${safeUser}`,
    rateLimitReset: `gh_rate_limit_reset_${safeUser}`
  };
}

export const CHAT_STORAGE_KEYS = {
  chatId: "current_chat_id",
  chatName: "current_chat_name",
  submitted: "chat_widget_submitted",
  seenAdminIds: "chat_seen_admin_ids"
};

export const SKILL_COLORS = {
  JavaScript: "#f7df1e",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#264de4",
  Python: "#3572a5",
  Java: "#b07219",
  PHP: "#777bb4",
  "C#": "#178600",
  React: "#61dafb",
  "Node.js": "#3c873a",
  Firebase: "#ffca28",
  Git: "#f1502f",
  GitHub: "#8b949e",
  "API REST": "#38bdf8",
  "Express.js": "#a3a3a3",
  Bootstrap: "#7952b3",
  "Vue.js": "#42b883",
  Angular: "#dd1b16",
  Docker: "#2496ed",
  SQL: "#e38c00",
  JSON: "#94a3b8",
  Markdown: "#9ca3af"
};

export const OTHER_LANGUAGE_COLOR = "#4b5563";

export const TECH_BASE_SCORES = {
  Git: 12,
  GitHub: 10,
  "API REST": 6
};

export const SKILL_DESCRIPTIONS = {
  JavaScript: "Linguagem principal para interfaces dinamicas e aplicacoes web completas.",
  TypeScript: "Tipagem estatica para bases robustas e manutencao de longo prazo.",
  HTML: "Estruturacao semantica para paginas acessiveis e bem organizadas.",
  CSS: "Estilizacao e responsividade com foco em experiencia visual.",
  Python: "Automacao e backend para tarefas de dados e produtividade.",
  Java: "Base solida para aplicacoes empresariais e APIs robustas.",
  PHP: "Desenvolvimento web server-side com integracao de banco de dados.",
  "C#": "Desenvolvimento orientado a objetos no ecossistema .NET para APIs e sistemas corporativos.",
  React: "Componentizacao de UI para frontends modernos e reativos.",
  "Node.js": "Runtime para APIs e servicos backend em JavaScript.",
  Firebase: "Backend as a Service para dados e integracoes em tempo real.",
  Git: "Versionamento e colaboracao de codigo em equipe.",
  GitHub: "Plataforma de hospedagem, revisao e gestao de projetos.",
  "API REST": "Arquitetura de servicos para integracao entre sistemas.",
  "Express.js": "Framework minimalista para APIs em Node.js.",
  Bootstrap: "Framework CSS para construcao rapida de interfaces responsivas.",
  "Vue.js": "Framework progressivo para interfaces web interativas.",
  Angular: "Framework completo para aplicacoes front-end de grande escala.",
  Docker: "Containerizacao para padronizar ambientes de desenvolvimento e deploy.",
  SQL: "Consultas e modelagem de dados em bancos relacionais.",
  JSON: "Formato de troca de dados usado em integracoes de API.",
  Markdown: "Documentacao tecnica clara para projetos e repositorios."
};

export const SKILL_META = {
  JavaScript: { icon: "js", label: "JS", color: SKILL_COLORS.JavaScript },
  TypeScript: { icon: "ts", label: "TS", color: SKILL_COLORS.TypeScript },
  HTML: { icon: "html", label: "HTML", color: SKILL_COLORS.HTML },
  CSS: { icon: "css", label: "CSS", color: SKILL_COLORS.CSS },
  Python: { icon: "python", label: "PY", color: SKILL_COLORS.Python },
  Java: { icon: "java", label: "Java", color: SKILL_COLORS.Java },
  PHP: { icon: "php", label: "PHP", color: SKILL_COLORS.PHP },
  "C#": { icon: "csharp", label: "C#", color: SKILL_COLORS["C#"] },
  React: { icon: "react", label: "React", color: SKILL_COLORS.React },
  "Node.js": { icon: "nodejs", label: "Node", color: SKILL_COLORS["Node.js"] },
  Firebase: { icon: "firebase", label: "FB", color: SKILL_COLORS.Firebase },
  Git: { icon: "git", label: "Git", color: SKILL_COLORS.Git },
  GitHub: { icon: "github", label: "GH", color: SKILL_COLORS.GitHub },
  "API REST": { icon: "api", label: "REST", color: SKILL_COLORS["API REST"] },
  "Express.js": { icon: "express", label: "Express", color: SKILL_COLORS["Express.js"] },
  Bootstrap: { icon: "bootstrap", label: "BS", color: SKILL_COLORS.Bootstrap },
  "Vue.js": { icon: "vue", label: "Vue", color: SKILL_COLORS["Vue.js"] },
  Angular: { icon: "angular", label: "NG", color: SKILL_COLORS.Angular },
  Docker: { icon: "docker", label: "Docker", color: SKILL_COLORS.Docker },
  SQL: { icon: "sql", label: "SQL", color: SKILL_COLORS.SQL },
  JSON: { icon: "json", label: "{}", color: SKILL_COLORS.JSON },
  Markdown: { icon: "markdown", label: "MD", color: SKILL_COLORS.Markdown }
};

export const FALLBACK_REPOS = [
  {
    name: "eu",
    html_url: "https://github.com/mikaeldmts/eu",
    description: "Portfolio profissional moderno com dashboards integrados.",
    language: "JavaScript",
    stargazers_count: 1,
    size: 2995,
    fork: false
  },
  {
    name: "agentminerva",
    html_url: "https://github.com/mikaeldmts/agentminerva",
    description: "Assistente IA personalizada com interface web moderna.",
    language: "PHP",
    stargazers_count: 0,
    size: 243,
    fork: false
  },
  {
    name: "checkstock",
    html_url: "https://github.com/mikaeldmts/checkstock",
    description: "Sistema para apoio a decisoes de compras com IA.",
    language: "PHP",
    stargazers_count: 0,
    size: 83,
    fork: false
  },
  {
    name: "lojinhadasister",
    html_url: "https://github.com/mikaeldmts/lojinhadasister",
    description: "Sistema web para loja com painel administrativo.",
    language: "PHP",
    stargazers_count: 0,
    size: 202,
    fork: false
  }
];

export const FALLBACK_PROFILE = {
  login: "mikaeldmts",
  name: "Mikael F. de Matos",
  bio: "Perfil em modo de contingencia local por limite temporario da API.",
  avatar_url: "https://avatars.githubusercontent.com/u/142128917?v=4",
  html_url: "https://github.com/mikaeldmts",
  public_repos: FALLBACK_REPOS.length,
  updated_at: "2026-01-28T19:12:14Z"
};

export const SPOKEN_LANGUAGES = [
  { flag: "🇧🇷", name: "Português", level: "Nativo", native: true },
  { flag: "🇺🇸", name: "Inglês", level: "Fluente", native: false },
  { flag: "🇫🇷", name: "Francês", level: "Intermediário", native: false },
  { flag: "🇨🇳", name: "Mandarim", level: "Básico", native: false },
  { flag: "🇮🇱", name: "Hebraico", level: "Básico", native: false }
];
