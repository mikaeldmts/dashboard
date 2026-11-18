const GITHUB_USERNAME = process.env.GH_USERNAME || "mikaeldmts";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS_ENDPOINT = "https://api.groq.com/openai/v1/models";
const PREFERRED_MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
].filter(Boolean);
const CACHE_TTL_MS = 5 * 60 * 1000;

let githubOverviewCache = {
  timestamp: 0,
  data: null
};

let groqModelsCache = {
  timestamp: 0,
  models: null
};

const repoDetailsCache = new Map();

function getGithubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "mikaeldmts-dashboard-overthinker"
  };
  const token = process.env.GH_PROFILE_PAT || process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJsonSafe(url, headers) {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { ok: false, status: response.status, data: null };
    }
    const data = await response.json();
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

function summarizePublicEvent(event) {
  if (!event || !event.type) return null;
  const repoName = event.repo?.name || "";
  const date = event.created_at ? event.created_at.slice(0, 10) : "";

  if (event.type === "PushEvent") {
    const commits = Array.isArray(event.payload?.commits) ? event.payload.commits : [];
    const firstMsg = commits[0]?.message?.split("\n")[0] || "push de código";
    return `[${date}] Push em ${repoName}: "${firstMsg}"`;
  }
  if (event.type === "CreateEvent") {
    const refType = event.payload?.ref_type || "recurso";
    return `[${date}] Criou ${refType} em ${repoName}`;
  }
  if (event.type === "PullRequestEvent") {
    const action = event.payload?.action || "atualizou";
    const title = event.payload?.pull_request?.title || "PR";
    return `[${date}] PR (${action}) em ${repoName}: "${title}"`;
  }
  if (event.type === "WatchEvent") {
    return `[${date}] Star em ${repoName}`;
  }
  return `[${date}] ${event.type} em ${repoName}`;
}

async function getLiveGithubOverview(username = GITHUB_USERNAME) {
  const now = Date.now();
  if (githubOverviewCache.data && now - githubOverviewCache.timestamp < CACHE_TTL_MS) {
    return githubOverviewCache.data;
  }

  const headers = getGithubHeaders();
  const encodedUser = encodeURIComponent(username);

  const [profileRes, reposRes, eventsRes] = await Promise.all([
    fetchJsonSafe(`https://api.github.com/users/${encodedUser}`, headers),
    fetchJsonSafe(`https://api.github.com/users/${encodedUser}/repos?sort=updated&per_page=100`, headers),
    fetchJsonSafe(`https://api.github.com/users/${encodedUser}/events/public?per_page=12`, headers)
  ]);

  if (!profileRes.ok && !reposRes.ok) {
    return githubOverviewCache.data || null;
  }

  const profile = profileRes.data
    ? {
        login: profileRes.data.login,
        name: profileRes.data.name,
        bio: profileRes.data.bio,
        company: profileRes.data.company,
        location: profileRes.data.location,
        blog: profileRes.data.blog,
        html_url: profileRes.data.html_url,
        public_repos: profileRes.data.public_repos,
        followers: profileRes.data.followers,
        following: profileRes.data.following,
        created_at: profileRes.data.created_at,
        updated_at: profileRes.data.updated_at
      }
    : null;

  const repos = Array.isArray(reposRes.data)
    ? reposRes.data.map((repo) => ({
        name: repo.name,
        description: repo.description || "Sem descrição informada",
        language: repo.language || "Diversos",
        stars: repo.stargazers_count ?? 0,
        forks: repo.forks_count ?? 0,
        fork: Boolean(repo.fork),
        topics: Array.isArray(repo.topics) ? repo.topics : [],
        homepage: repo.homepage || null,
        html_url: repo.html_url,
        updated_at: repo.updated_at ? repo.updated_at.slice(0, 10) : null,
        pushed_at: repo.pushed_at ? repo.pushed_at.slice(0, 10) : null,
        size_kb: repo.size ?? 0
      }))
    : [];

  const recentEvents = Array.isArray(eventsRes.data)
    ? eventsRes.data.map(summarizePublicEvent).filter(Boolean).slice(0, 8)
    : [];

  const overview = {
    fetchedAt: new Date().toISOString(),
    profile,
    repos,
    recentEvents
  };

  githubOverviewCache = {
    timestamp: now,
    data: overview
  };

  return overview;
}

async function fetchGithubRepoDetails(rawRepoName, username = GITHUB_USERNAME) {
  const cleanRepo = String(rawRepoName || "")
    .trim()
    .replace(/^https?:\/\/github\.com\/[^/]+\//i, "")
    .replace(/^[^/]+\//, "")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  if (!cleanRepo) {
    return { error: "Nome de repositório inválido." };
  }

  const cacheKey = `${username}/${cleanRepo}`.toLowerCase();
  const cached = repoDetailsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const headers = getGithubHeaders();
  const baseUrl = `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(cleanRepo)}`;

  const [repoRes, langsRes, commitsRes, readmeRes] = await Promise.all([
    fetchJsonSafe(baseUrl, headers),
    fetchJsonSafe(`${baseUrl}/languages`, headers),
    fetchJsonSafe(`${baseUrl}/commits?per_page=5`, headers),
    fetchJsonSafe(`${baseUrl}/readme`, headers)
  ]);

  if (!repoRes.ok || !repoRes.data) {
    return { error: `Repositório '${cleanRepo}' não encontrado no perfil ${username}.` };
  }

  let readmeExcerpt = null;
  if (readmeRes.ok && readmeRes.data?.content) {
    try {
      const decoded = Buffer.from(readmeRes.data.content, "base64").toString("utf8");
      readmeExcerpt = decoded.replace(/\r\n/g, "\n").slice(0, 2400);
    } catch {
      readmeExcerpt = null;
    }
  }

  const recentCommits = Array.isArray(commitsRes.data)
    ? commitsRes.data.map((item) => ({
        date: item.commit?.author?.date?.slice(0, 10) || "",
        message: item.commit?.message?.split("\n")[0] || ""
      }))
    : [];

  const details = {
    name: repoRes.data.name,
    full_name: repoRes.data.full_name,
    description: repoRes.data.description,
    html_url: repoRes.data.html_url,
    homepage: repoRes.data.homepage,
    default_branch: repoRes.data.default_branch,
    stars: repoRes.data.stargazers_count,
    forks: repoRes.data.forks_count,
    open_issues: repoRes.data.open_issues_count,
    topics: repoRes.data.topics || [],
    created_at: repoRes.data.created_at,
    pushed_at: repoRes.data.pushed_at,
    languages_bytes: langsRes.ok ? langsRes.data : {},
    recent_commits: recentCommits,
    readme_excerpt: readmeExcerpt
  };

  repoDetailsCache.set(cacheKey, { timestamp: Date.now(), data: details });
  return details;
}

function buildSystemPrompt(liveGithub, clientContext) {
  const activeView = clientContext?.activeView || "github";
  const isWorldMode = activeView === "world";

  const dashboardContextText = clientContext
    ? JSON.stringify(clientContext, null, 2)
    : "Snapshot do cliente não enviado.";

  const liveGithubText = liveGithub
    ? JSON.stringify(
        {
          fetchedAt: liveGithub.fetchedAt,
          profile: liveGithub.profile,
          totalPublicReposLoaded: liveGithub.repos.length,
          repositories: liveGithub.repos.slice(0, 30),
          recentPublicActivity: liveGithub.recentEvents
        },
        null,
        2
      )
    : "API ao vivo do GitHub temporariamente indisponível (use os dados do snapshot do dashboard).";

  if (isWorldMode) {
    return `Você é o **Overthinker**, analista de Inteligência Global integrado à suite de monitoramento planetário de **Mikael F. de Matos**.

## Sua Personalidade e Papel — MODO WORLD ANALYSIS
- Você está assistindo ao vivo ao módulo **Realtime World Analysis** e deve focar EXCLUSIVAMENTE em análises, discussões e explicações relacionadas a:
  - **Geopolítica, conflitos e diplomacia** mundiais
  - **Economia e mercados** globais
  - **Tecnologia global, IA, semicondutores** e disputas estratégicas
  - **Clima, eventos sísmicos, desastres naturais**
  - **Dados do globo 3D interativo** (países, hotspots, previsões estratégicas, índices de tensão)
- Responda no idioma em que o visitante falar (padrão: Português do Brasil).
- NÃO discuta o perfil GitHub ou a carreira do Mikael neste modo — esse é o papel do assistente do GitHub Dashboard.
- Use formatação clara com **negrito**, listas curtas e dados concretos.

## Contexto do Painel de Inteligência Global Ativo
\`\`\`json
${dashboardContextText}
\`\`\`

Regras:
- Base suas respostas nos dados do worldAnalysisSnapshot acima quando disponíveis.
- Seja analítico, imparcial e conciso (2 a 6 frases ou tópicos, exceto quando análise profunda for pedida).
- Nunca invente dados — se não houver informação suficiente, indique que os sensores estão sincronizando.`;
  }

  return `Você é o **Overthinker**, assistente de IA residente no **GitHub Dashboard** de **Mikael F. de Matos (@mikaeldmts)**.

## Sua Personalidade e Papel — MODO GITHUB DASHBOARD
- Você é o analista neural do portfólio profissional do Mikael e deve focar EXCLUSIVAMENTE em responder perguntas sobre:
  - **Projetos e repositórios** do Mikael no GitHub
  - **Skills técnicas, linguagens de programação** e proficiência
  - **Idiomas falados**: Português Nativo, Inglês Fluente, Francês Intermediário, Mandarim Básico, Hebraico Básico
  - **Trajetória profissional**, experiências e potencial como contratação
  - **Arquitetura e funcionamento deste dashboard** (stack, funcionalidades)
  - **Métricas de código** (donut de linguagens, top skills, telemetria)
- Responda no idioma em que o visitante falar (padrão: Português do Brasil).
- NÃO responda perguntas sobre geopolítica, conflitos mundiais ou análises globais — para isso existe o módulo Realtime World Analysis.
- Use **negrito**, listas curtas, \`código\` para tecnologias e links Markdown \`[texto](url)\` para repositórios.

## Arquitetura deste Dashboard
1. **Suite completa**: Página de boas-vindas → Realtime World Analysis (globo 3D, inteligência global, Groq AI) → GitHub Dashboard (você está aqui — chat + métricas de portfólio).
2. **Stack**: React 19 + Vite 7 + Framer Motion + @tsparticles/react + Firebase Firestore + Vercel Serverless Functions + Groq AI.
3. **GitHub Dashboard**: Layout de duas colunas — cards de portfólio (Hero, Telemetria, Donut de Linguagens, Idiomas, Top 4 Skills) + este painel de chat com você.

## Ferramenta de Consulta Profunda ao GitHub
- Você já possui abaixo a lista dos repositórios públicos e eventos recentes do Mikael.
- Se o usuário pedir detalhes profundos de um repositório (README, commits, linguagens exatas), chame a ferramenta \`fetch_github_repo_details\`.

## Snapshot do Dashboard (Visão do Visitante)
\`\`\`json
${dashboardContextText}
\`\`\`

## Dados Ao Vivo da API do GitHub (@mikaeldmts)
\`\`\`json
${liveGithubText}
\`\`\`

Regras:
- Nunca invente projetos, empresas ou métricas que não estejam nos dados acima.
- Seja conciso (2 a 6 frases ou tópicos, exceto quando análise detalhada for pedida).
- Se alguém quiser entrar em contato diretamente com o Mikael, oriente a usar o chat de recados no canto inferior direito.`;
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_github_repo_details",
      description:
        "Consulta em tempo real a API do GitHub para obter detalhes completos, linguagens exatas, últimos commits e o conteúdo do README de um repositório específico de mikaeldmts.",
      parameters: {
        type: "object",
        properties: {
          repoName: {
            type: "string",
            description: "Nome do repositório no GitHub (ex: 'dashboard', 'eu', 'agentminerva', 'checkstock')"
          }
        },
        required: ["repoName"]
      }
    }
  }
];

const NON_CHAT_MODEL_PATTERN = /(whisper|tts|orpheus|guard|safeguard|embed|rerank|vision-preview)/i;

async function discoverAccessibleGroqModels(apiKey) {
  const now = Date.now();
  if (groqModelsCache.models && now - groqModelsCache.timestamp < 30 * 60 * 1000) {
    return groqModelsCache.models;
  }

  try {
    const response = await fetch(GROQ_MODELS_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    const list = Array.isArray(payload?.data)
      ? payload.data
          .filter((m) => m && typeof m.id === "string" && m.active !== false)
          .map((m) => m.id)
          .filter((id) => !NON_CHAT_MODEL_PATTERN.test(id))
      : [];

    if (list.length > 0) {
      groqModelsCache = { timestamp: now, models: list };
    }
    return list;
  } catch {
    return [];
  }
}

async function resolveCandidateModels(apiKey) {
  const discovered = await discoverAccessibleGroqModels(apiKey);
  if (!discovered.length) {
    return PREFERRED_MODELS;
  }

  const discoveredSet = new Set(discovered);
  const prioritized = PREFERRED_MODELS.filter((id) => discoveredSet.has(id));
  const extras = discovered.filter((id) => !prioritized.includes(id));
  return [...prioritized, ...extras].slice(0, 4);
}

async function callGroqCompletion({ apiKey, model, messages, useTools = true }) {
  const payload = {
    model,
    messages,
    temperature: 0.55,
    max_completion_tokens: 1600
  };

  if (model.startsWith("openai/gpt-oss-")) {
    payload.reasoning_effort = "low";
  }

  if (useTools) {
    payload.tools = TOOLS;
    payload.tool_choice = "auto";
  }

  const response = await fetch(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        reject(new Error("Payload muito grande."));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sanitizeConversation(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-12)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 1500)
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Método não permitido. Use POST." }));
    return;
  }

  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "GROQ_API_KEY não configurada nas variáveis de ambiente do servidor."
      })
    );
    return;
  }

  let body;
  try {
    body = await parseRequestBody(req);
  } catch {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "JSON inválido na requisição." }));
    return;
  }

  const history = sanitizeConversation(body?.messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Envie ao menos uma pergunta do usuário." }));
    return;
  }

  try {
    const [liveGithub, candidateModels] = await Promise.all([
      getLiveGithubOverview(GITHUB_USERNAME),
      resolveCandidateModels(apiKey)
    ]);

    const systemPrompt = buildSystemPrompt(liveGithub, body?.dashboardContext || null);
    const baseMessages = [{ role: "system", content: systemPrompt }, ...history];

    let activeModel = candidateModels[0] || "openai/gpt-oss-120b";
    let completion = null;

    for (let i = 0; i < candidateModels.length; i += 1) {
      const modelCandidate = candidateModels[i];
      activeModel = modelCandidate;

      // Try with GitHub repo inspection tool first on top preferred models
      if (i < 2) {
        completion = await callGroqCompletion({
          apiKey,
          model: modelCandidate,
          messages: baseMessages,
          useTools: true
        });
        if (completion.ok) break;
      }

      // Retry without tools in case a model rejects tool definitions
      completion = await callGroqCompletion({
        apiKey,
        model: modelCandidate,
        messages: baseMessages,
        useTools: false
      });
      if (completion.ok) break;
    }

    if (!completion || !completion.ok) {
      const apiErrMsg =
        completion?.data?.error?.message ||
        `Falha na API Groq (HTTP ${completion?.status || 502})`;
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: apiErrMsg }));
      return;
    }

    const assistantMessage = completion.data?.choices?.[0]?.message;
    const toolCalls = assistantMessage?.tool_calls;

    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const followUpMessages = [...baseMessages, assistantMessage];

      for (const call of toolCalls.slice(0, 3)) {
        if (call.function?.name === "fetch_github_repo_details") {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            parsedArgs = {};
          }
          const repoDetails = await fetchGithubRepoDetails(parsedArgs.repoName, GITHUB_USERNAME);
          followUpMessages.push({
            role: "tool",
            tool_call_id: call.id,
            name: "fetch_github_repo_details",
            content: JSON.stringify(repoDetails)
          });
        }
      }

      const secondPass = await callGroqCompletion({
        apiKey,
        model: activeModel,
        messages: followUpMessages,
        useTools: false
      });

      if (secondPass.ok) {
        const finalReply =
          secondPass.data?.choices?.[0]?.message?.content?.trim() ||
          "Analisei o repositório, mas não consegui sintetizar a resposta agora.";
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            reply: finalReply,
            model: activeModel,
            usedGithubTool: true
          })
        );
        return;
      }
    }

    const reply =
      assistantMessage?.content?.trim() ||
      "Pensei tanto nas possibilidades que fiquei sem palavras por um segundo. Pode reformular?";

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        reply,
        model: activeModel,
        usedGithubTool: false
      })
    );
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: error?.message || "Erro interno ao consultar o Overthinker."
      })
    );
  }
}
