const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS_ENDPOINT = "https://api.groq.com/openai/v1/models";
const PREFERRED_MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
].filter(Boolean);

const GLOBAL_CACHE_TTL_MS = 4 * 60 * 1000;
const COUNTRY_CACHE_TTL_MS = 3 * 60 * 1000;
const EXTERNAL_SEISMIC_TTL_MS = 5 * 60 * 1000;

let globalIntelCache = { timestamp: 0, data: null };
let externalHazardsCache = { timestamp: 0, quakes: [], eonet: [] };
let groqModelsCache = { timestamp: 0, models: null };
const countryIntelCache = new Map();

const COUNTRY_HOTSPOT_MATCHERS = [
  { iso2: "UA", namePt: "Ucrânia", lon: 31.2, lat: 48.4, terms: ["ucrânia", "ukraine", "kyiv", "kiev", "zelensky", "donbas"] },
  { iso2: "RU", namePt: "Rússia", lon: 37.6, lat: 55.7, terms: ["rússia", "russia", "moscou", "moscow", "kremlin", "putin"] },
  { iso2: "US", namePt: "Estados Unidos", lon: -98.5, lat: 39.8, terms: ["estados unidos", "eua", "united states", "washington", "pentagon", "pentágono", "wall street", "white house", "casa branca"] },
  { iso2: "CN", namePt: "China", lon: 104.2, lat: 35.9, terms: ["china", "pequim", "beijing", "xangai", "shanghai", "xi jinping"] },
  { iso2: "IL", namePt: "Israel", lon: 35.2, lat: 31.8, terms: ["israel", "tel aviv", "jerusalém", "jerusalem", "idf", "gaza"] },
  { iso2: "IR", namePt: "Irã", lon: 53.7, lat: 32.4, terms: ["irã", "iran", "teerã", "tehran", "ormuz", "hormuz"] },
  { iso2: "TW", namePt: "Taiwan", lon: 121.0, lat: 23.7, terms: ["taiwan", "taipei", "taipé", "tsmc"] },
  { iso2: "BR", namePt: "Brasil", lon: -47.9, lat: -15.8, terms: ["brasil", "brazil", "brasília", "bovespa", "petrobras", "amazônia"] },
  { iso2: "DE", namePt: "Alemanha", lon: 10.4, lat: 51.2, terms: ["alemanha", "germany", "berlim", "berlin", "bundestag"] },
  { iso2: "FR", namePt: "França", lon: 2.2, lat: 46.2, terms: ["frança", "france", "paris", "macron"] },
  { iso2: "GB", namePt: "Reino Unido", lon: -3.4, lat: 55.4, terms: ["reino unido", "uk", "britain", "londres", "london"] },
  { iso2: "IN", namePt: "Índia", lon: 78.9, lat: 20.6, terms: ["índia", "india", "nova délhi", "new delhi", "modi"] },
  { iso2: "JP", namePt: "Japão", lon: 138.2, lat: 36.2, terms: ["japão", "japan", "tóquio", "tokyo", "nikkei"] },
  { iso2: "KR", namePt: "Coreia do Sul", lon: 127.8, lat: 36.5, terms: ["coreia do sul", "south korea", "seul", "seoul"] },
  { iso2: "KP", namePt: "Coreia do Norte", lon: 127.5, lat: 40.3, terms: ["coreia do norte", "north korea", "pyongyang"] },
  { iso2: "LB", namePt: "Líbano", lon: 35.9, lat: 33.9, terms: ["líbano", "lebanon", "beirute", "beirut"] },
  { iso2: "SY", namePt: "Síria", lon: 38.9, lat: 34.8, terms: ["síria", "syria", "damasco", "damascus"] },
  { iso2: "SD", namePt: "Sudão", lon: 30.2, lat: 12.9, terms: ["sudão", "sudan", "cartum", "khartoum", "darfur"] },
  { iso2: "VE", namePt: "Venezuela", lon: -66.6, lat: 6.4, terms: ["venezuela", "caracas"] },
  { iso2: "AR", namePt: "Argentina", lon: -63.6, lat: -38.4, terms: ["argentina", "buenos aires"] },
  { iso2: "MX", namePt: "México", lon: -102.5, lat: 23.6, terms: ["méxico", "mexico"] },
  { iso2: "SA", namePt: "Arábia Saudita", lon: 45.1, lat: 23.9, terms: ["arábia saudita", "saudi arabia", "riad", "riyadh", "opep", "opec"] },
  { iso2: "TR", namePt: "Turquia", lon: 35.2, lat: 38.9, terms: ["turquia", "turkey", "ancara", "ankara", "istambul"] },
  { iso2: "AU", namePt: "Austrália", lon: 133.8, lat: -25.3, terms: ["austrália", "australia", "sydney", "canberra"] }
];

const DOMAIN_KEYWORDS = {
  conflict: [
    "guerra", "war", "ataque", "attack", "míssil", "missile", "militar", "military",
    "conflito", "conflict", "exército", "army", "otan", "nato", "defesa", "defense",
    "tropas", "troops", "cessar-fogo", "ceasefire", "sanções", "sanctions", "drone",
    "fronteira", "border", "tensão", "tension", "bombardeio", "strike", "nuclear", "segurança"
  ],
  tech: [
    "ia", "inteligência artificial", "artificial intelligence", "openai", "chip", "semicondutor",
    "semiconductor", "nvidia", "tecnologia", "technology", "cyber", "ciber", "hacker",
    "robô", "robot", "espacial", "space", "satélite", "satellite", "quantum", "quântico",
    "software", "startup", "dados", "data center", "5g", "6g", "automação", "cloud"
  ],
  economy: [
    "pib", "gdp", "inflação", "inflation", "juros", "interest rate", "mercado", "market",
    "bolsa", "stock", "dólar", "dollar", "banco central", "central bank", "fed", "comércio",
    "trade", "tarifa", "tariff", "petróleo", "oil", "energia", "investimento", "investment",
    "exportação", "export", "dívida", "debt", "recessão", "recession", "economia", "economy", "crise"
  ],
  climate: [
    "clima", "climate", "terremoto", "earthquake", "furacão", "hurricane", "tufão", "typhoon",
    "incêndio", "wildfire", "enchente", "flood", "vulcão", "volcano", "seca", "drought",
    "carbono", "carbon", "renovável", "renewable", "solar", "transição energética", "ambiental",
    "tempestade", "storm", "calor", "heatwave", "desmatamento", "oceano"
  ]
};

function decodeXmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function classifyHeadlineDomain(title = "", fallbackDomain = "society") {
  const lower = title.toLowerCase();
  let bestDomain = fallbackDomain;
  let bestScore = 0;

  for (const [domain, words] of Object.entries(DOMAIN_KEYWORDS)) {
    let score = 0;
    for (const word of words) {
      if (lower.includes(word)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }
  return bestDomain;
}

function parseRssXml(xmlText, defaultCategory = "society", limit = 10) {
  if (!xmlText || typeof xmlText !== "string") return [];
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null && items.length < limit) {
    const block = match[1];
    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "";
    const rawLink = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "";
    const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "";
    const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || "";

    let cleanTitle = decodeXmlEntities(rawTitle);
    let source = decodeXmlEntities(rawSource);

    const dashIdx = cleanTitle.lastIndexOf(" - ");
    if (dashIdx > 18) {
      if (!source) source = cleanTitle.slice(dashIdx + 3).trim();
      cleanTitle = cleanTitle.slice(0, dashIdx).trim();
    }

    if (!cleanTitle) continue;
    const parsedDate = rawPubDate ? new Date(rawPubDate.trim()) : null;
    const publishedAt =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString()
        : new Date().toISOString();

    items.push({
      title: cleanTitle,
      source: source || "Agência Internacional",
      url: decodeXmlEntities(rawLink),
      publishedAt,
      domain: classifyHeadlineDomain(cleanTitle, defaultCategory)
    });
  }

  return items;
}

async function fetchRssFeed(url, defaultCategory = "society", limit = 10) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4800),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WorldIntelObservatory/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml"
      }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, defaultCategory, limit);
  } catch {
    return [];
  }
}

function dedupeAndSortArticles(articles, maxItems = 18) {
  const seen = new Set();
  const unique = [];

  for (const item of articles) {
    const fingerprint = item.title
      .toLowerCase()
      .replace(/[^a-z0-9à-ú\s]/gi, "")
      .split(/\s+/)
      .slice(0, 7)
      .join(" ");
    if (!fingerprint || seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    unique.push(item);
  }

  unique.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return unique.slice(0, maxItems);
}

async function getLivePlanetaryHazards() {
  const now = Date.now();
  if (
    externalHazardsCache.quakes.length > 0 &&
    now - externalHazardsCache.timestamp < EXTERNAL_SEISMIC_TTL_MS
  ) {
    return externalHazardsCache;
  }

  const [usgsRes, eonetRes] = await Promise.all([
    fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson", {
      signal: AbortSignal.timeout(6500),
      headers: { "User-Agent": "WorldIntelObservatory/1.0" }
    }).catch(() => null),
    fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=24", {
      signal: AbortSignal.timeout(6500),
      headers: { "User-Agent": "WorldIntelObservatory/1.0" }
    }).catch(() => null)
  ]);

  let quakes = [];
  if (usgsRes && usgsRes.ok) {
    try {
      const data = await usgsRes.json();
      quakes = (data.features || []).slice(0, 28).map((f) => ({
        id: f.id,
        mag: Number(f.properties?.mag || 0),
        place: f.properties?.place || "Zona Oceânica",
        time: f.properties?.time ? new Date(f.properties.time).toISOString() : new Date().toISOString(),
        url: f.properties?.url || null,
        lon: Number(f.geometry?.coordinates?.[0] || 0),
        lat: Number(f.geometry?.coordinates?.[1] || 0),
        depthKm: Number(f.geometry?.coordinates?.[2] || 0)
      }));
    } catch {
      quakes = [];
    }
  }

  let eonet = [];
  if (eonetRes && eonetRes.ok) {
    try {
      const data = await eonetRes.json();
      eonet = (data.events || [])
        .map((ev) => {
          const latestGeom = Array.isArray(ev.geometry) ? ev.geometry[ev.geometry.length - 1] : null;
          const coords = latestGeom?.coordinates;
          if (!Array.isArray(coords) || typeof coords[0] !== "number" || typeof coords[1] !== "number") {
            return null;
          }
          return {
            id: ev.id,
            title: ev.title,
            category: ev.categories?.[0]?.title || "Evento Natural",
            date: latestGeom?.date || new Date().toISOString(),
            lon: coords[0],
            lat: coords[1],
            url: ev.sources?.[0]?.url || null
          };
        })
        .filter(Boolean)
        .slice(0, 20);
    } catch {
      eonet = [];
    }
  }

  externalHazardsCache = { timestamp: now, quakes, eonet };
  return externalHazardsCache;
}

async function fetchWorldBankMacro(iso3) {
  if (!iso3 || iso3.length !== 3) {
    return { gdpGrowthSeries: [], inflationSeries: [], population: null, internetPct: null };
  }
  const code = encodeURIComponent(iso3.toUpperCase());
  const urls = {
    gdpGrowth: `https://api.worldbank.org/v2/country/${code}/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=8`,
    inflation: `https://api.worldbank.org/v2/country/${code}/indicator/FP.CPI.TOTL.ZG?format=json&per_page=8`,
    population: `https://api.worldbank.org/v2/country/${code}/indicator/SP.POP.TOTL?format=json&per_page=4`,
    internet: `https://api.worldbank.org/v2/country/${code}/indicator/IT.NET.USER.ZS?format=json&per_page=5`
  };

  const fetchIndicator = async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4200) });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json?.[1]) ? json[1] : [];
    } catch {
      return [];
    }
  };

  const [gdpRows, infRows, popRows, netRows] = await Promise.all([
    fetchIndicator(urls.gdpGrowth),
    fetchIndicator(urls.inflation),
    fetchIndicator(urls.population),
    fetchIndicator(urls.internet)
  ]);

  const toSeries = (rows) =>
    rows
      .filter((r) => r && r.value !== null && r.value !== undefined)
      .slice(0, 6)
      .map((r) => ({ year: String(r.date), value: Number(Number(r.value).toFixed(2)) }))
      .reverse();

  const latestPop = popRows.find((r) => r && r.value != null)?.value ?? null;
  const latestNet = netRows.find((r) => r && r.value != null)?.value ?? null;

  return {
    gdpGrowthSeries: toSeries(gdpRows),
    inflationSeries: toSeries(infRows),
    population: latestPop ? Math.round(Number(latestPop)) : null,
    internetPct: latestNet != null ? Number(Number(latestNet).toFixed(1)) : null
  };
}

function detectHotspotsFromHeadlines(articles) {
  const counts = new Map();

  for (const article of articles) {
    const text = `${article.title} ${article.source}`.toLowerCase();
    for (const matcher of COUNTRY_HOTSPOT_MATCHERS) {
      if (matcher.terms.some((term) => text.includes(term))) {
        const existing = counts.get(matcher.iso2) || {
          iso2: matcher.iso2,
          namePt: matcher.namePt,
          lon: matcher.lon,
          lat: matcher.lat,
          mentions: 0,
          dominantDomain: article.domain,
          leadHeadline: article.title,
          domainCounts: {}
        };
        existing.mentions += 1;
        existing.domainCounts[article.domain] = (existing.domainCounts[article.domain] || 0) + 1;
        counts.set(matcher.iso2, existing);
      }
    }
  }

  let list = [...counts.values()].map((item) => {
    const topDomain =
      Object.entries(item.domainCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || item.dominantDomain;
    const intensity = Math.min(96, 48 + item.mentions * 11 + (topDomain === "conflict" ? 12 : 0));
    return {
      iso2: item.iso2,
      namePt: item.namePt,
      lon: item.lon,
      lat: item.lat,
      mentions: item.mentions,
      domain: topDomain,
      intensity,
      leadHeadline: item.leadHeadline
    };
  });

  if (list.length < 6) {
    const defaults = [
      { iso2: "US", namePt: "Estados Unidos", lon: -98.5, lat: 39.8, domain: "tech", intensity: 74 },
      { iso2: "CN", namePt: "China", lon: 104.2, lat: 35.9, domain: "economy", intensity: 72 },
      { iso2: "UA", namePt: "Ucrânia", lon: 31.2, lat: 48.4, domain: "conflict", intensity: 86 },
      { iso2: "IL", namePt: "Israel", lon: 35.2, lat: 31.8, domain: "conflict", intensity: 84 },
      { iso2: "BR", namePt: "Brasil", lon: -47.9, lat: -15.8, domain: "economy", intensity: 64 },
      { iso2: "TW", namePt: "Taiwan", lon: 121.0, lat: 23.7, domain: "tech", intensity: 70 }
    ];
    for (const d of defaults) {
      if (!list.some((x) => x.iso2 === d.iso2)) {
        list.push({ ...d, mentions: 1, leadHeadline: "Monitoramento contínuo de sinais estratégicos" });
      }
    }
  }

  return list.sort((a, b) => b.intensity - a.intensity).slice(0, 12);
}

function computeDomainBreakdown(articles) {
  const counts = { conflict: 0, tech: 0, economy: 0, climate: 0, society: 0 };
  for (const a of articles) {
    counts[a.domain] = (counts[a.domain] || 0) + 1;
  }
  const total = Math.max(1, articles.length);
  return [
    { key: "conflict", label: "Conflitos & Geopolítica", count: counts.conflict, share: Math.round((counts.conflict / total) * 100) },
    { key: "economy", label: "Economia & Mercados", count: counts.economy, share: Math.round((counts.economy / total) * 100) },
    { key: "tech", label: "Tecnologia & IA", count: counts.tech, share: Math.round((counts.tech / total) * 100) },
    { key: "climate", label: "Clima & Sísmico", count: counts.climate, share: Math.round((counts.climate / total) * 100) },
    { key: "society", label: "Política & Sociedade", count: counts.society, share: Math.round((counts.society / total) * 100) }
  ];
}

async function getAvailableGroqChatModels(apiKey) {
  const now = Date.now();
  if (groqModelsCache.models && now - groqModelsCache.timestamp < 10 * 60 * 1000) {
    return groqModelsCache.models;
  }
  try {
    const response = await fetch(GROQ_MODELS_ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) return PREFERRED_MODELS;
    const payload = await response.json();
    const ids = (payload?.data || [])
      .map((m) => m.id)
      .filter(
        (id) =>
          typeof id === "string" &&
          !id.includes("whisper") &&
          !id.includes("tts") &&
          !id.includes("guard") &&
          !id.includes("safeguard") &&
          !id.includes("embed")
      );
    if (!ids.length) return PREFERRED_MODELS;
    const ordered = [
      ...PREFERRED_MODELS.filter((m) => ids.includes(m)),
      ...ids.filter((m) => !PREFERRED_MODELS.includes(m))
    ];
    groqModelsCache = { timestamp: now, models: ordered };
    return ordered;
  } catch {
    return PREFERRED_MODELS;
  }
}

function extractJsonObject(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function runGroqStructuredIntel(apiKey, systemPrompt, userPrompt) {
  if (!apiKey) return null;
  const candidateModels = await getAvailableGroqChatModels(apiKey);

  for (const model of candidateModels.slice(0, 3)) {
    try {
      const isGptOss = model.startsWith("openai/gpt-oss");
      const body = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.28,
        response_format: { type: "json_object" },
        ...(isGptOss
          ? { max_completion_tokens: 1800, reasoning_effort: "low" }
          : { max_tokens: 1400 })
      };

      const res = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(9500)
      });

      if (!res.ok) continue;
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      const parsed = extractJsonObject(content);
      if (parsed && typeof parsed === "object") {
        return { parsed, model };
      }
    } catch {
      // Try next fallback model
    }
  }
  return null;
}

function buildFallbackSynthesis({ scopeName, articles, breakdown, quakesCount, maxQuakeMag, macro }) {
  const byKey = Object.fromEntries(breakdown.map((b) => [b.key, b]));
  const conflictScore = Math.min(94, 34 + (byKey.conflict?.count || 0) * 9);
  const economyScore = Math.min(92, 38 + (byKey.economy?.count || 0) * 8);
  const techScore = Math.min(95, 42 + (byKey.tech?.count || 0) * 9);
  const climateScore = Math.min(92, 28 + (byKey.climate?.count || 0) * 8 + (maxQuakeMag >= 6 ? 18 : 6));
  const societyScore = Math.min(88, 36 + (byKey.society?.count || 0) * 7);

  const tensionIndex = Math.round(
    conflictScore * 0.36 + economyScore * 0.24 + climateScore * 0.16 + societyScore * 0.14 + techScore * 0.1
  );

  const topHeadlines = articles.slice(0, 3).map((a) => a.title);
  const latestGdp = macro?.gdpGrowthSeries?.length
    ? macro.gdpGrowthSeries[macro.gdpGrowthSeries.length - 1]
    : null;

  return {
    tensionIndex,
    statusLabel:
      tensionIndex >= 72
        ? "Vigilância Elevada"
        : tensionIndex >= 52
          ? "Dinâmica Moderada-Alta"
          : "Estabilidade Monitorada",
    executiveBrief:
      topHeadlines.length > 0
        ? `Monitoramento em tempo real de ${scopeName} registra ${articles.length} eventos relevantes nas últimas horas, com destaque para "${topHeadlines[0]}". ${
            latestGdp
              ? `No plano estrutural, a variação mais recente do PIB consolidado é de ${latestGdp.value}% (${latestGdp.year}), enquanto fluxos geopolíticos, econômicos e tecnológicos seguem sob acompanhamento contínuo.`
              : `No radar planetário, ${quakesCount} abalos sísmicos M4.5+ foram captados nas últimas 24h (pico de M${maxQuakeMag.toFixed(1)}), acompanhando movimentações diplomáticas, tecnológicas e de mercados.`
          }`
        : `Monitoramento ativo para ${scopeName} operando com telemetria macroeconômica e sensores globais em tempo real.`,
    dimensions: {
      conflict: conflictScore,
      economy: economyScore,
      tech: techScore,
      society: societyScore,
      climate: climateScore
    },
    keyHighlights: articles.slice(0, 4).map((a) => ({
      domain: a.domain,
      title: a.title,
      detail: `Fonte: ${a.source}`
    })),
    predictions: [
      {
        horizon: "Curto Prazo · 7 a 30 dias",
        title: `Volatilidade tática em ${scopeName}`,
        probability: Math.min(84, Math.max(46, conflictScore + 4)),
        impact: conflictScore >= 68 ? "Crítico" : "Alto",
        domain: "conflict",
        summary:
          "Desdobramentos diplomáticos e pressões de segurança tendem a manter sensibilidade elevada em cadeias logísticas, energia e moedas no curto prazo.",
        trigger: "Comunicados oficiais de defesa, sanções comerciais ou movimentações estratégicas regionais."
      },
      {
        horizon: "Médio Prazo · 1 a 6 meses",
        title: "Realinhamento econômico e aceleração em IA/infraestrutura",
        probability: Math.min(82, Math.max(52, Math.round((economyScore + techScore) / 2))),
        impact: "Alto",
        domain: "tech",
        summary:
          "Investimentos em semicondutores, automação com IA e soberania energética devem ditar a competitividade e o fluxo de capitais nos próximos trimestres.",
        trigger: "Decisões de taxas de juros dos bancos centrais e novos marcos regulatórios de tecnologia."
      },
      {
        horizon: "Cenário de Atenção · Risco Assimétrico",
        title: "Pressão climática e disrupção de infraestrutura crítica",
        probability: Math.min(68, Math.max(32, climateScore - 6)),
        impact: "Moderado",
        domain: "climate",
        summary:
          "Eventos extremos ou choques de oferta podem exigir respostas rápidas de contingência energética, agrícola e cibernética.",
        trigger: "Alertas meteorológicos severos, atividade sísmica acima de M6.0 ou incidentes em redes críticas."
      }
    ]
  };
}

function normalizeAiPayload(aiRaw, fallback) {
  if (!aiRaw || typeof aiRaw !== "object") return fallback;

  const clampScore = (val, fb) => {
    const num = Number(val);
    if (Number.isNaN(num)) return fb;
    return Math.max(5, Math.min(99, Math.round(num)));
  };

  const dims = aiRaw.dimensions || {};
  const dimensions = {
    conflict: clampScore(dims.conflict, fallback.dimensions.conflict),
    economy: clampScore(dims.economy, fallback.dimensions.economy),
    tech: clampScore(dims.tech, fallback.dimensions.tech),
    society: clampScore(dims.society, fallback.dimensions.society),
    climate: clampScore(dims.climate, fallback.dimensions.climate)
  };

  const predictions =
    Array.isArray(aiRaw.predictions) && aiRaw.predictions.length >= 2
      ? aiRaw.predictions.slice(0, 3).map((p, idx) => ({
          horizon: String(p.horizon || fallback.predictions[idx]?.horizon || "Próximas semanas"),
          title: String(p.title || fallback.predictions[idx]?.title || "Cenário projetado"),
          probability: clampScore(p.probability, fallback.predictions[idx]?.probability || 55),
          impact: ["Crítico", "Alto", "Moderado"].includes(p.impact)
            ? p.impact
            : fallback.predictions[idx]?.impact || "Alto",
          domain: ["conflict", "economy", "tech", "climate", "society"].includes(p.domain)
            ? p.domain
            : fallback.predictions[idx]?.domain || "economy",
          summary: String(p.summary || fallback.predictions[idx]?.summary || ""),
          trigger: String(p.trigger || fallback.predictions[idx]?.trigger || "Indicadores macro e diplomáticos")
        }))
      : fallback.predictions;

  const keyHighlights =
    Array.isArray(aiRaw.keyHighlights) && aiRaw.keyHighlights.length > 0
      ? aiRaw.keyHighlights.slice(0, 4).map((h) => ({
          domain: ["conflict", "economy", "tech", "climate", "society"].includes(h.domain)
            ? h.domain
            : "society",
          title: String(h.title || ""),
          detail: String(h.detail || "")
        }))
      : fallback.keyHighlights;

  return {
    tensionIndex: clampScore(aiRaw.tensionIndex, fallback.tensionIndex),
    statusLabel: String(aiRaw.statusLabel || fallback.statusLabel).slice(0, 42),
    executiveBrief: String(aiRaw.executiveBrief || fallback.executiveBrief),
    dimensions,
    keyHighlights,
    predictions
  };
}

async function buildGlobalIntelligence(apiKey, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && globalIntelCache.data && now - globalIntelCache.timestamp < GLOBAL_CACHE_TTL_MS) {
    return globalIntelCache.data;
  }

  const [conflictNews, techNews, econNews, climateNews, hazards] = await Promise.all([
    fetchRssFeed(
      "https://news.google.com/rss/search?q=(geopolitica+OR+guerra+OR+conflito+OR+otan+OR+diplomacia)+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
      "conflict",
      8
    ),
    fetchRssFeed(
      "https://news.google.com/rss/search?q=(%22inteligencia+artificial%22+OR+semicondutores+OR+ciberseguranca+OR+tecnologia)+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
      "tech",
      7
    ),
    fetchRssFeed(
      "https://news.google.com/rss/search?q=(%22economia+global%22+OR+juros+OR+mercados+OR+petroleo+OR+comercio)+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
      "economy",
      7
    ),
    fetchRssFeed(
      "https://news.google.com/rss/search?q=(terremoto+OR+clima+OR+energia+OR+espacial)+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
      "climate",
      6
    ),
    getLivePlanetaryHazards()
  ]);

  const articles = dedupeAndSortArticles(
    [...conflictNews, ...techNews, ...econNews, ...climateNews],
    20
  );
  const breakdown = computeDomainBreakdown(articles);
  const hotspots = detectHotspotsFromHeadlines(articles);
  const maxQuakeMag = hazards.quakes.reduce((max, q) => Math.max(max, q.mag || 0), 0);

  const fallback = buildFallbackSynthesis({
    scopeName: "o cenário global",
    articles,
    breakdown,
    quakesCount: hazards.quakes.length,
    maxQuakeMag,
    macro: null
  });

  const headlinesDigest = articles
    .slice(0, 14)
    .map((a, idx) => `${idx + 1}. [${a.domain.toUpperCase()}] ${a.title} (${a.source})`)
    .join("\n");

  const systemPrompt = `Você é um estrategista-chefe de Inteligência Global em Tempo Real (estilo observatório geopolítico, macroeconômico e tecnológico).
Responda ESTRITAMENTE em JSON válido em português brasileiro (pt-BR), sem markdown fora do JSON, seguindo exatamente esta estrutura:
{
  "tensionIndex": number (0 a 100),
  "statusLabel": "string curta ex: Vigilância Elevada",
  "executiveBrief": "string com 2 parágrafos curtos e densos sintetizando o que está acontecendo no mundo AGORA com base nas manchetes fornecidas",
  "dimensions": {
    "conflict": number (0 a 100),
    "economy": number (0 a 100),
    "tech": number (0 a 100),
    "society": number (0 a 100),
    "climate": number (0 a 100)
  },
  "keyHighlights": [
    { "domain": "conflict|economy|tech|climate|society", "title": "título curto", "detail": "1 frase objetiva do impacto atual" }
  ],
  "predictions": [
    {
      "horizon": "Curto Prazo · 7 a 30 dias",
      "title": "título claro da previsão",
      "probability": number (15 a 92),
      "impact": "Crítico|Alto|Moderado",
      "domain": "conflict|economy|tech|climate|society",
      "summary": "explicação analítica de 2 frases baseada nos fatos atuais",
      "trigger": "qual sinal concreto confirmar ou invalidar este cenário"
    }
  ]
}
Gere exatamente 4 itens em keyHighlights e 3 itens em predictions (Curto Prazo 7-30 dias, Médio Prazo 1-6 meses, e Risco Assimétrico / Ponto Crítico). Seja analítico, factual e imparcial.`;

  const userPrompt = `Data UTC atual: ${new Date().toISOString()}
Manchetes globais em tempo real capturadas agora:
${headlinesDigest || "Sem manchetes recentes."}

Telemetria planetária 24h:
- Terremotos M4.5+ (USGS): ${hazards.quakes.length} eventos (maior magnitude: M${maxQuakeMag.toFixed(1)})
- Eventos naturais ativos (NASA EONET): ${hazards.eonet.length} eventos abertos.
Gere o JSON analítico completo.`;

  const aiResult = await runGroqStructuredIntel(apiKey, systemPrompt, userPrompt);
  const synthesis = normalizeAiPayload(aiResult?.parsed, fallback);

  const payload = {
    mode: "global",
    updatedAt: new Date().toISOString(),
    aiModel: aiResult?.model || "telemetry-heuristic",
    ...synthesis,
    articles,
    breakdown,
    hotspots,
    quakes: hazards.quakes,
    eonet: hazards.eonet,
    stats: {
      totalArticles: articles.length,
      quakes24h: hazards.quakes.length,
      maxQuakeMag: Number(maxQuakeMag.toFixed(1)),
      activeNaturalEvents: hazards.eonet.length
    }
  };

  globalIntelCache = { timestamp: now, data: payload };
  return payload;
}

function haversineKm(lon1, lat1, lon2, lat2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function buildCountryIntelligence(params, apiKey, forceRefresh = false) {
  const iso2 = String(params.iso2 || "").toUpperCase();
  const iso3 = String(params.iso3 || "").toUpperCase();
  const namePt = String(params.namePt || params.name || "País").trim();
  const nameEn = String(params.nameEn || namePt).trim();
  const region = String(params.region || "Global").trim();
  const lon = params.lon != null ? Number(params.lon) : null;
  const lat = params.lat != null ? Number(params.lat) : null;

  const cacheKey = `${iso2 || nameEn}`;
  const now = Date.now();
  const cached = countryIntelCache.get(cacheKey);
  if (!forceRefresh && cached && now - cached.timestamp < COUNTRY_CACHE_TTL_MS) {
    return cached.data;
  }

  const qPt = encodeURIComponent(`"${namePt}" when:4d`);
  const qEn = encodeURIComponent(`"${nameEn}" when:4d`);

  const [newsPt, newsEn, macro, hazards] = await Promise.all([
    fetchRssFeed(
      `https://news.google.com/rss/search?q=${qPt}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
      "society",
      12
    ),
    fetchRssFeed(
      `https://news.google.com/rss/search?q=${qEn}&hl=en-US&gl=US&ceid=US:en`,
      "society",
      10
    ),
    fetchWorldBankMacro(iso3),
    getLivePlanetaryHazards()
  ]);

  const articles = dedupeAndSortArticles([...newsPt, ...newsEn], 16);
  const breakdown = computeDomainBreakdown(articles);

  const nearbyQuakes =
    lon != null && lat != null && !Number.isNaN(lon) && !Number.isNaN(lat)
      ? hazards.quakes.filter((q) => haversineKm(lon, lat, q.lon, q.lat) <= 1650).slice(0, 6)
      : [];

  const nearbyNatural =
    lon != null && lat != null && !Number.isNaN(lon) && !Number.isNaN(lat)
      ? hazards.eonet.filter((ev) => haversineKm(lon, lat, ev.lon, ev.lat) <= 1650).slice(0, 6)
      : [];

  const maxQuakeMag = nearbyQuakes.reduce((m, q) => Math.max(m, q.mag || 0), 0);

  const fallback = buildFallbackSynthesis({
    scopeName: namePt,
    articles,
    breakdown,
    quakesCount: nearbyQuakes.length,
    maxQuakeMag,
    macro
  });

  const headlinesDigest = articles
    .slice(0, 12)
    .map((a, idx) => `${idx + 1}. [${a.domain.toUpperCase()}] ${a.title} (${a.source})`)
    .join("\n");

  const latestGdp = macro.gdpGrowthSeries[macro.gdpGrowthSeries.length - 1];
  const latestInf = macro.inflationSeries[macro.inflationSeries.length - 1];

  const systemPrompt = `Você é um analista sênior de Inteligência Geopolítica, Econômica e Tecnológica focado em monitoramento de países em tempo real.
Responda ESTRITAMENTE em JSON válido em português brasileiro (pt-BR) — traduza e sintetize fatos mesmo que algumas manchetes estejam em inglês.
Estrutura exata exigida:
{
  "tensionIndex": number (0 a 100 representando intensidade/risco atual no país),
  "statusLabel": "string curta ex: Estabilidade Ativa, Tensão Elevada, Expansão Tecnológica",
  "executiveBrief": "2 parágrafos diretos e informativos explicando os acontecimentos mais recentes no país (política/conflitos, economia, tecnologia e sociedade) com base nas notícias de hoje",
  "dimensions": {
    "conflict": number (0 a 100),
    "economy": number (0 a 100),
    "tech": number (0 a 100),
    "society": number (0 a 100),
    "climate": number (0 a 100)
  },
  "keyHighlights": [
    { "domain": "conflict|economy|tech|climate|society", "title": "fato-chave em português", "detail": "impacto concreto em 1 frase" }
  ],
  "predictions": [
    {
      "horizon": "Curto Prazo · 7 a 30 dias",
      "title": "previsão específica para o país",
      "probability": number (15 a 92),
      "impact": "Crítico|Alto|Moderado",
      "domain": "conflict|economy|tech|climate|society",
      "summary": "projeção realista em 2 frases levando em conta os acontecimentos atuais do país",
      "trigger": "evento ou indicador a monitorar"
    }
  ]
}
Gere 4 itens em keyHighlights e 3 itens em predictions (Curto Prazo 7-30 dias, Médio Prazo 1-6 meses, e Cenário Alternativo / Ponto de Atenção).`;

  const userPrompt = `País analisado: ${namePt} (${nameEn} · ISO ${iso2}/${iso3} · Região: ${region})
Data UTC: ${new Date().toISOString()}

Indicadores Macro (Banco Mundial):
- População: ${macro.population ? macro.population.toLocaleString("pt-BR") : "N/D"}
- Crescimento recente do PIB: ${latestGdp ? `${latestGdp.value}% (${latestGdp.year})` : "N/D"}
- Inflação recente: ${latestInf ? `${latestInf.value}% (${latestInf.year})` : "N/D"}
- Conectividade Internet: ${macro.internetPct != null ? `${macro.internetPct}%` : "N/D"}
- Eventos sísmicos próximos (24h): ${nearbyQuakes.length} | Eventos naturais próximos: ${nearbyNatural.length}

Notícias em tempo real sobre ${namePt}:
${headlinesDigest || "Poucas manchetes nas últimas 24h; utilize contexto regional e macroeconômico atual do país."}

Retorne o JSON analítico em português.`;

  const aiResult = await runGroqStructuredIntel(apiKey, systemPrompt, userPrompt);
  const synthesis = normalizeAiPayload(aiResult?.parsed, fallback);

  const payload = {
    mode: "country",
    updatedAt: new Date().toISOString(),
    aiModel: aiResult?.model || "telemetry-heuristic",
    country: {
      iso2,
      iso3,
      namePt,
      nameEn,
      region,
      lon,
      lat
    },
    macro,
    nearbyQuakes,
    nearbyNatural,
    ...synthesis,
    articles,
    breakdown
  };

  countryIntelCache.set(cacheKey, { timestamp: now, data: payload });
  return payload;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ error: "Método não permitido. Use GET." }));
  }

  try {
    const urlObj = new URL(req.url || "/api/world-intel", "http://localhost");
    const mode = urlObj.searchParams.get("mode") || "global";
    const forceRefresh = urlObj.searchParams.get("refresh") === "1";
    const apiKey = process.env.GROQ_API_KEY || "";

    let result;
    if (mode === "country") {
      result = await buildCountryIntelligence(
        {
          iso2: urlObj.searchParams.get("iso2"),
          iso3: urlObj.searchParams.get("iso3"),
          namePt: urlObj.searchParams.get("namePt"),
          nameEn: urlObj.searchParams.get("nameEn"),
          region: urlObj.searchParams.get("region"),
          lon: urlObj.searchParams.get("lon"),
          lat: urlObj.searchParams.get("lat")
        },
        apiKey,
        forceRefresh
      );
    } else {
      result = await buildGlobalIntelligence(apiKey, forceRefresh);
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=180");
    return res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(
      JSON.stringify({
        error: "Falha ao processar inteligência global em tempo real.",
        detail: err?.message || "Erro interno"
      })
    );
  }
}
