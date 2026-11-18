import {
  APP_CONFIG,
  CACHE_KEYS,
  FALLBACK_PROFILE,
  FALLBACK_REPOS,
  SKILL_COLORS,
  SKILL_DESCRIPTIONS,
  SKILL_META,
  resolveAppConfig
} from "./constants.js";

export class RateLimitError extends Error {
  constructor(resetAtMs) {
    super("Rate limit GitHub atingido.");
    this.name = "RateLimitError";
    this.resetAtMs = resetAtMs;
  }
}

export function safeStorageGet(key) {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function safeStorageSet(key, value) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  } catch {
    // noop
  }
}

export function safeStorageRemove(key) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  } catch {
    // noop
  }
}

export function readCacheEntry(key) {
  const raw = safeStorageGet(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCacheEntry(key, data, etag, extraMeta = {}) {
  const payload = {
    data,
    etag: etag || null,
    updatedAt: Date.now()
  };

  if (extraMeta?.isFallback) {
    payload.isFallback = true;
  }

  safeStorageSet(key, JSON.stringify(payload));
}

export function touchCacheEntry(key) {
  const entry = readCacheEntry(key);
  if (!entry) return;
  entry.updatedAt = Date.now();
  safeStorageSet(key, JSON.stringify(entry));
}

export function isCacheFresh(entry, ttlMs) {
  if (!entry || !Number.isFinite(entry.updatedAt)) return false;
  return Date.now() - entry.updatedAt < ttlMs;
}

function isProfileDataValid(data) {
  return Boolean(data && typeof data === "object" && !Array.isArray(data) && typeof data.login === "string" && data.login.length > 0);
}

function isReposDataValid(data) {
  return Array.isArray(data);
}

export function getRateLimitResetMs(username = APP_CONFIG.githubUsername) {
  const keys = CACHE_KEYS(username);
  const raw = safeStorageGet(keys.rateLimitReset);
  if (raw === null || raw === "") return null;

  const resetAtMs = Number(raw);
  if (!Number.isFinite(resetAtMs) || resetAtMs <= 0) {
    safeStorageRemove(keys.rateLimitReset);
    return null;
  }

  if (Date.now() >= resetAtMs) {
    safeStorageRemove(keys.rateLimitReset);
    return null;
  }

  return resetAtMs;
}

export function setRateLimitResetMs(resetAtMs, username = APP_CONFIG.githubUsername) {
  if (!Number.isFinite(resetAtMs) || resetAtMs <= 0) return;
  const keys = CACHE_KEYS(username);
  safeStorageSet(keys.rateLimitReset, String(resetAtMs));
}

export function updateRateLimitFromHeaders(response, username = APP_CONFIG.githubUsername) {
  const remaining = response?.headers?.get?.("x-ratelimit-remaining");
  const reset = response?.headers?.get?.("x-ratelimit-reset");

  if (remaining === "0") {
    if (reset !== null && reset !== "") {
      const resetAtMs = Number(reset) * 1000;
      if (Number.isFinite(resetAtMs) && resetAtMs > 0) {
        setRateLimitResetMs(resetAtMs, username);
        return resetAtMs;
      }
    }
    const fallbackReset = Date.now() + 60 * 60 * 1000;
    setRateLimitResetMs(fallbackReset, username);
    return fallbackReset;
  }

  return null;
}

function createRateLimitError(response, username) {
  const resetHeader = response?.headers?.get?.("x-ratelimit-reset");
  if (resetHeader !== null && resetHeader !== "") {
    const resetAtMs = Number(resetHeader) * 1000;
    if (Number.isFinite(resetAtMs) && resetAtMs > 0) {
      setRateLimitResetMs(resetAtMs, username);
      return new RateLimitError(resetAtMs);
    }
  }

  const retryAfterHeader = response?.headers?.get?.("retry-after");
  if (retryAfterHeader !== null && retryAfterHeader !== "") {
    const retrySeconds = Number(retryAfterHeader);
    if (Number.isFinite(retrySeconds) && retrySeconds > 0) {
      const resetAtMs = Date.now() + retrySeconds * 1000;
      setRateLimitResetMs(resetAtMs, username);
      return new RateLimitError(resetAtMs);
    }
  }

  const fallbackReset = Date.now() + 60 * 60 * 1000;
  setRateLimitResetMs(fallbackReset, username);
  return new RateLimitError(fallbackReset);
}

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const base = 1024;
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / base ** exp;

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exp]}`;
}

export function hexToRgb(hexColor) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor || "");
  if (!result) return "125,211,252";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

export function getSkillColor(skillName) {
  return SKILL_COLORS[skillName] || "#7dd3fc";
}

export function getSkillMeta(skillName) {
  return SKILL_META[skillName] || { icon: "code", label: "Code", color: getSkillColor(skillName) };
}

export function getSkillDescription(skillName) {
  return SKILL_DESCRIPTIONS[skillName] || "Tecnologia utilizada em projetos reais do GitHub.";
}

export async function fetchGithubJson(url, etag, username = APP_CONFIG.githubUsername, signal) {
  const lockedUntil = getRateLimitResetMs(username);
  if (lockedUntil) {
    throw new RateLimitError(lockedUntil);
  }

  const headers = {
    Accept: "application/vnd.github+json"
  };

  if (etag) {
    headers["If-None-Match"] = etag;
  }

  const fetchOptions = signal ? { headers, signal } : { headers };
  const response = await fetch(url, fetchOptions);
  updateRateLimitFromHeaders(response, username);

  if (response.status === 304) {
    return {
      notModified: true,
      data: null,
      etag
    };
  }

  if (response.status === 403 || response.status === 429) {
    throw createRateLimitError(response, username);
  }

  if (response.status === 404) {
    throw new Error(`Usuario '${username}' nao encontrado.`);
  }

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status} ao consultar GitHub.`);
  }

  const data = await response.json();

  return {
    notModified: false,
    data,
    etag: response.headers.get("etag") || null
  };
}

export function readCachedDashboardSnapshot(username = APP_CONFIG.githubUsername) {
  const keys = CACHE_KEYS(username);
  const profileEntry = readCacheEntry(keys.profile);
  const reposEntry = readCacheEntry(keys.repos);
  const hasValidProfile = isProfileDataValid(profileEntry?.data);
  const hasValidRepos = isReposDataValid(reposEntry?.data);
  const hasCache = hasValidProfile || hasValidRepos;
  const isFallback = Boolean(profileEntry?.isFallback || reposEntry?.isFallback);
  const latestUpdatedAt = Math.max(
    hasValidProfile && Number.isFinite(profileEntry?.updatedAt) ? profileEntry.updatedAt : 0,
    hasValidRepos && Number.isFinite(reposEntry?.updatedAt) ? reposEntry.updatedAt : 0
  );

  return {
    profileEntry,
    reposEntry,
    hasValidProfile,
    hasValidRepos,
    hasCache,
    isFallback,
    latestUpdatedAt: latestUpdatedAt > 0 ? latestUpdatedAt : null,
    profile: hasValidProfile ? profileEntry.data : null,
    repos: hasValidRepos ? reposEntry.data : []
  };
}

export async function fetchDashboardData(usernameOverride, options = {}) {
  const runtimeConfig = resolveAppConfig();
  const username = usernameOverride || runtimeConfig.githubUsername;
  const profileCacheTtlMs = options.profileCacheTtlMs ?? runtimeConfig.profileCacheTtlMs;
  const reposCacheTtlMs = options.reposCacheTtlMs ?? runtimeConfig.reposCacheTtlMs;
  const force = Boolean(options.force);
  const signal = options.signal;

  const keys = CACHE_KEYS(username);
  const profileEntry = readCacheEntry(keys.profile);
  const reposEntry = readCacheEntry(keys.repos);

  let hasValidProfile = isProfileDataValid(profileEntry?.data);
  let hasValidRepos = isReposDataValid(reposEntry?.data);
  const initialHasFallbackCache = Boolean(profileEntry?.isFallback || reposEntry?.isFallback);

  const activeRateLimitResetMs = getRateLimitResetMs(username);
  const cachedLatestUpdatedAt = Math.max(
    hasValidProfile && Number.isFinite(profileEntry?.updatedAt) ? profileEntry.updatedAt : 0,
    hasValidRepos && Number.isFinite(reposEntry?.updatedAt) ? reposEntry.updatedAt : 0
  );
  const cachedSyncedAt = cachedLatestUpdatedAt > 0 ? formatDate(cachedLatestUpdatedAt) : "-";

  const needProfileFetch =
    force ||
    !hasValidProfile ||
    !isCacheFresh(profileEntry, profileCacheTtlMs) ||
    (Boolean(profileEntry?.isFallback) && !activeRateLimitResetMs);
  const needReposFetch =
    force ||
    !hasValidRepos ||
    !isCacheFresh(reposEntry, reposCacheTtlMs) ||
    (Boolean(reposEntry?.isFallback) && !activeRateLimitResetMs);

  if (!needProfileFetch && !needReposFetch) {
    if (activeRateLimitResetMs) {
      const resetText = formatDate(activeRateLimitResetMs);
      return {
        profile: hasValidProfile ? profileEntry.data : FALLBACK_PROFILE,
        repos: hasValidRepos ? reposEntry.data : FALLBACK_REPOS,
        statusText: initialHasFallbackCache
          ? `Rate limit da API. Exibindo fallback ate ${resetText}`
          : `Rate limit. Exibindo cache ate ${resetText}`,
        statusVariant: "ratelimit",
        syncedAt: cachedSyncedAt,
        error: null,
        isFallback: initialHasFallbackCache,
        isRateLimited: true,
        fromCache: true,
        hasReposSnapshot: true
      };
    }

    return {
      profile: hasValidProfile ? profileEntry.data : null,
      repos: hasValidRepos ? reposEntry.data : [],
      statusText: "Online (cache local)",
      statusVariant: "cache",
      syncedAt: cachedSyncedAt,
      error: null,
      isFallback: initialHasFallbackCache,
      isRateLimited: false,
      fromCache: true,
      hasReposSnapshot: hasValidRepos
    };
  }

  let profileData = hasValidProfile ? profileEntry.data : null;
  let reposData = hasValidRepos ? reposEntry.data : [];
  let fetchedFreshProfile = false;
  let fetchedFreshRepos = false;

  try {
    if (needProfileFetch) {
      const profileUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
      let profileResponse = await fetchGithubJson(
        profileUrl,
        hasValidProfile ? profileEntry?.etag : null,
        username,
        signal
      );

      if (profileResponse.notModified && !hasValidProfile) {
        profileResponse = await fetchGithubJson(profileUrl, null, username, signal);
        if (profileResponse.notModified || !isProfileDataValid(profileResponse.data)) {
          throw new Error("Cache local de perfil indisponivel para resposta 304.");
        }
      }

      if (profileResponse.notModified) {
        touchCacheEntry(keys.profile);
      } else if (profileResponse.data) {
        profileData = profileResponse.data;
        hasValidProfile = isProfileDataValid(profileData);
        fetchedFreshProfile = hasValidProfile;
        writeCacheEntry(keys.profile, profileData, profileResponse.etag);
      }
    }

    if (needReposFetch) {
      const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
      let reposResponse = await fetchGithubJson(
        reposUrl,
        hasValidRepos ? reposEntry?.etag : null,
        username,
        signal
      );

      if (reposResponse.notModified && !hasValidRepos) {
        reposResponse = await fetchGithubJson(reposUrl, null, username, signal);
        if (reposResponse.notModified || !isReposDataValid(reposResponse.data)) {
          throw new Error("Cache local de repositorios indisponivel para resposta 304.");
        }
      }

      if (reposResponse.notModified) {
        touchCacheEntry(keys.repos);
      } else if (Array.isArray(reposResponse.data)) {
        reposData = reposResponse.data;
        hasValidRepos = true;
        fetchedFreshRepos = true;
        writeCacheEntry(keys.repos, reposData, reposResponse.etag);
      }
    }

    const resultingFallback =
      (!fetchedFreshProfile && Boolean(profileEntry?.isFallback)) ||
      (!fetchedFreshRepos && Boolean(reposEntry?.isFallback));

    return {
      profile: profileData,
      repos: Array.isArray(reposData) ? reposData : [],
      statusText: "Online",
      statusVariant: "online",
      syncedAt: formatDate(new Date().toISOString()),
      error: null,
      isFallback: resultingFallback,
      isRateLimited: Boolean(getRateLimitResetMs(username)),
      fromCache: false,
      hasReposSnapshot: hasValidRepos || fetchedFreshRepos
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    const hasUsableProfile = isProfileDataValid(profileData);
    const hasUsableRepos = hasValidRepos || fetchedFreshRepos;

    if (error instanceof RateLimitError) {
      const resetText = formatDate(error.resetAtMs);

      if (hasUsableProfile && hasUsableRepos) {
        const usedFallbackCache = Boolean(profileEntry?.isFallback || reposEntry?.isFallback);
        return {
          profile: profileData,
          repos: reposData,
          statusText: usedFallbackCache
            ? `Rate limit da API. Exibindo fallback ate ${resetText}`
            : `Rate limit. Exibindo cache ate ${resetText}`,
          statusVariant: "ratelimit",
          syncedAt: formatDate(new Date().toISOString()),
          error,
          isFallback: usedFallbackCache,
          isRateLimited: true,
          fromCache: !fetchedFreshProfile && !fetchedFreshRepos,
          hasReposSnapshot: true
        };
      }

      if (hasUsableProfile && !hasUsableRepos) {
        writeCacheEntry(keys.repos, FALLBACK_REPOS, null, { isFallback: true });
        return {
          profile: profileData,
          repos: FALLBACK_REPOS,
          statusText: `Rate limit. Exibindo perfil salvo e repos fallback ate ${resetText}`,
          statusVariant: "ratelimit",
          syncedAt: formatDate(new Date().toISOString()),
          error,
          isFallback: true,
          isRateLimited: true,
          fromCache: !fetchedFreshProfile,
          hasReposSnapshot: true
        };
      }

      writeCacheEntry(keys.profile, FALLBACK_PROFILE, null, { isFallback: true });
      writeCacheEntry(keys.repos, FALLBACK_REPOS, null, { isFallback: true });

      return {
        profile: FALLBACK_PROFILE,
        repos: FALLBACK_REPOS,
        statusText: `Rate limit da API. Exibindo fallback ate ${resetText}`,
        statusVariant: "ratelimit",
        syncedAt: formatDate(new Date().toISOString()),
        error,
        isFallback: true,
        isRateLimited: true,
        fromCache: false,
        hasReposSnapshot: true
      };
    }

    if (!hasUsableProfile) {
      writeCacheEntry(keys.profile, FALLBACK_PROFILE, null, { isFallback: true });
      if (!hasUsableRepos) {
        writeCacheEntry(keys.repos, FALLBACK_REPOS, null, { isFallback: true });
      }

      return {
        profile: FALLBACK_PROFILE,
        repos: hasUsableRepos ? reposData : FALLBACK_REPOS,
        statusText: "Erro temporario da API. Exibindo fallback local.",
        statusVariant: "error",
        syncedAt: formatDate(new Date().toISOString()),
        error,
        isFallback: true,
        isRateLimited: Boolean(getRateLimitResetMs(username)),
        fromCache: false,
        hasReposSnapshot: true
      };
    }

    if (!hasUsableRepos) {
      writeCacheEntry(keys.repos, FALLBACK_REPOS, null, { isFallback: true });
      return {
        profile: profileData,
        repos: FALLBACK_REPOS,
        statusText: "Erro temporario da API. Exibindo fallback local.",
        statusVariant: "error",
        syncedAt: formatDate(new Date().toISOString()),
        error,
        isFallback: true,
        isRateLimited: Boolean(getRateLimitResetMs(username)),
        fromCache: !fetchedFreshProfile,
        hasReposSnapshot: true
      };
    }

    return {
      profile: {
        ...profileData,
        bio: error?.message || profileData?.bio
      },
      repos: reposData,
      statusText: "Erro",
      statusVariant: "error",
      syncedAt: formatDate(new Date().toISOString()),
      error,
      isFallback: Boolean(profileEntry?.isFallback || reposEntry?.isFallback),
      isRateLimited: Boolean(getRateLimitResetMs(username)),
      fromCache: !fetchedFreshProfile && !fetchedFreshRepos,
      hasReposSnapshot: true
    };
  }
}
