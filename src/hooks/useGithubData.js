import { useCallback, useEffect, useRef, useState } from "react";
import { resolveAppConfig } from "../lib/constants.js";
import {
  fetchDashboardData,
  formatDate,
  getRateLimitResetMs,
  readCachedDashboardSnapshot
} from "../lib/github.js";

function buildInitialState(username) {
  const cached = readCachedDashboardSnapshot(username);
  return {
    profile: cached.profile,
    repos: cached.repos,
    statusText: "Conectando...",
    statusVariant: "connecting",
    syncedAt: cached.latestUpdatedAt ? formatDate(cached.latestUpdatedAt) : "-",
    error: null,
    isLoading: true,
    isFallback: cached.isFallback,
    isRateLimited: Boolean(getRateLimitResetMs(username)),
    hasReposData: cached.hasValidRepos
  };
}

export function useGithubData(usernameOverride) {
  const runtimeConfig = resolveAppConfig();
  const username = usernameOverride || runtimeConfig.githubUsername;
  const refreshMs = runtimeConfig.refreshMs;

  const [state, setState] = useState(() => buildInitialState(username));

  const activeControllerRef = useRef(null);
  const mountedRef = useRef(true);
  const prevUsernameRef = useRef(username);

  const runSync = useCallback(
    async ({ force = false } = {}) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;

      const usernameChanged = prevUsernameRef.current !== username;
      prevUsernameRef.current = username;
      const cached = readCachedDashboardSnapshot(username);

      setState((prev) => ({
        ...prev,
        profile: usernameChanged ? cached.profile : cached.profile ?? prev.profile,
        repos: usernameChanged
          ? cached.repos
          : cached.hasValidRepos
            ? cached.repos
            : prev.repos,
        statusText: force
          ? "Atualizando dados do GitHub..."
          : usernameChanged
            ? "Conectando..."
            : prev.statusText,
        statusVariant: force
          ? "updating"
          : usernameChanged
            ? "connecting"
            : prev.statusVariant,
        syncedAt: usernameChanged
          ? cached.latestUpdatedAt
            ? formatDate(cached.latestUpdatedAt)
            : "-"
          : prev.syncedAt,
        error: usernameChanged ? null : prev.error,
        isLoading: true,
        isFallback: usernameChanged ? cached.isFallback : prev.isFallback,
        isRateLimited: Boolean(getRateLimitResetMs(username)),
        hasReposData: usernameChanged ? cached.hasValidRepos : cached.hasValidRepos || prev.hasReposData
      }));

      try {
        const result = await fetchDashboardData(username, {
          force,
          signal: controller.signal
        });

        if (!mountedRef.current || controller.signal.aborted) {
          return result;
        }

        setState({
          profile: result.profile,
          repos: result.repos,
          statusText: result.statusText,
          statusVariant: result.statusVariant,
          syncedAt: result.syncedAt,
          error: result.error,
          isLoading: false,
          isFallback: result.isFallback,
          isRateLimited: result.isRateLimited,
          hasReposData: Boolean(result.hasReposSnapshot ?? true)
        });

        return result;
      } catch (error) {
        if (error?.name === "AbortError" || !mountedRef.current) {
          return null;
        }

        setState((prev) => ({
          ...prev,
          statusText: "Erro",
          statusVariant: "error",
          error,
          isLoading: false,
          isRateLimited: Boolean(getRateLimitResetMs(username))
        }));
        return null;
      }
    },
    [username]
  );

  useEffect(() => {
    mountedRef.current = true;
    runSync({ force: false });

    const intervalId = setInterval(() => {
      runSync({ force: false });
    }, refreshMs);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
        activeControllerRef.current = null;
      }
    };
  }, [runSync, refreshMs]);

  const refresh = useCallback(() => {
    return runSync({ force: true });
  }, [runSync]);

  return {
    ...state,
    refresh
  };
}
