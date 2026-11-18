import { describe, expect, it, vi } from "vitest";
import {
  CACHE_KEYS,
  FALLBACK_PROFILE,
  FALLBACK_REPOS,
  resolveAppConfig
} from "../src/lib/constants.js";
import {
  RateLimitError,
  fetchDashboardData,
  fetchGithubJson,
  formatBytes,
  formatDate,
  getRateLimitResetMs,
  hexToRgb,
  isCacheFresh,
  readCacheEntry,
  setRateLimitResetMs,
  touchCacheEntry,
  updateRateLimitFromHeaders,
  writeCacheEntry
} from "../src/lib/github.js";

describe("constants & config clamping", () => {
  it("clamps refresh and cache TTLs to at least 60 seconds and honors overrides", () => {
    const resolved = resolveAppConfig({
      githubUsername: "octocat",
      refreshSeconds: 10,
      profileCacheMinutes: 0.2,
      reposCacheMinutes: 0.5
    });

    expect(resolved.githubUsername).toBe("octocat");
    expect(resolved.refreshMs).toBe(60_000);
    expect(resolved.profileCacheTtlMs).toBe(60_000);
    expect(resolved.reposCacheTtlMs).toBe(60_000);
  });

  it("generates user-scoped localStorage cache keys", () => {
    expect(CACHE_KEYS("mikaeldmts")).toEqual({
      profile: "gh_profile_mikaeldmts",
      repos: "gh_repos_mikaeldmts",
      rateLimitReset: "gh_rate_limit_reset_mikaeldmts"
    });
  });
});

describe("github helpers & cache primitives", () => {
  it("formats pt-BR dates, bytes, and hex colors accurately", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not-a-date")).toBe("-");
    const formatted = formatDate("2026-01-28T19:12:14Z");
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);

    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(2995 * 1024)).toBe("2.9 MB");

    expect(hexToRgb("#60a5fa")).toBe("96,165,250");
    expect(hexToRgb("invalid")).toBe("125,211,252");
  });

  it("writes, reads, touches, and checks TTL freshness in localStorage", () => {
    writeCacheEntry("gh_profile_test", { login: "test" }, 'W/"abc"');
    const entry = readCacheEntry("gh_profile_test");
    expect(entry.data).toEqual({ login: "test" });
    expect(entry.etag).toBe('W/"abc"');
    expect(isCacheFresh(entry, 10_000)).toBe(true);

    const staleTime = Date.now() - 20_000;
    localStorage.setItem(
      "gh_profile_test",
      JSON.stringify({ data: { login: "test" }, etag: 'W/"abc"', updatedAt: staleTime })
    );
    expect(isCacheFresh(readCacheEntry("gh_profile_test"), 10_000)).toBe(false);

    touchCacheEntry("gh_profile_test");
    expect(isCacheFresh(readCacheEntry("gh_profile_test"), 10_000)).toBe(true);
  });

  it("enforces rate limit lockouts from headers and clears expired lockouts", () => {
    const futureEpochSec = Math.floor((Date.now() + 120_000) / 1000);
    const mockResponse = {
      headers: new Headers({
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": String(futureEpochSec)
      })
    };

    const resetMs = updateRateLimitFromHeaders(mockResponse, "userA");
    expect(resetMs).toBe(futureEpochSec * 1000);
    expect(getRateLimitResetMs("userA")).toBe(futureEpochSec * 1000);

    setRateLimitResetMs(Date.now() - 5000, "userA");
    expect(getRateLimitResetMs("userA")).toBeNull();
  });
});

describe("fetchGithubJson & fetchDashboardData", () => {
  it("sends If-None-Match header and returns notModified on 304", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {
        status: 304,
        headers: { "x-ratelimit-remaining": "59" }
      })
    );

    const res = await fetchGithubJson("https://api.github.com/users/mikaeldmts", 'W/"etag1"', "mikaeldmts");
    expect(res).toEqual({ notModified: true, data: null, etag: 'W/"etag1"' });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.github.com/users/mikaeldmts",
      expect.objectContaining({
        headers: {
          Accept: "application/vnd.github+json",
          "If-None-Match": 'W/"etag1"'
        }
      })
    );
  });

  it("throws RateLimitError on 403/429 and skips subsequent fetches until reset", async () => {
    const futureReset = Math.floor((Date.now() + 300_000) / 1000);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("rate limit", {
        status: 429,
        headers: { "x-ratelimit-reset": String(futureReset) }
      })
    );

    await expect(
      fetchGithubJson("https://api.github.com/users/ratelimituser", null, "ratelimituser")
    ).rejects.toBeInstanceOf(RateLimitError);

    await expect(
      fetchGithubJson("https://api.github.com/users/ratelimituser", null, "ratelimituser")
    ).rejects.toBeInstanceOf(RateLimitError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("persists fallback snapshot when uncached fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );

    const result = await fetchDashboardData("fallbackuser");
    expect(result.isFallback).toBe(true);
    expect(result.profile).toEqual(FALLBACK_PROFILE);
    expect(result.repos).toEqual(FALLBACK_REPOS);
    expect(result.statusText).toBe("Erro temporario da API. Exibindo fallback local.");

    const keys = CACHE_KEYS("fallbackuser");
    expect(readCacheEntry(keys.profile)?.data).toEqual(FALLBACK_PROFILE);
    expect(readCacheEntry(keys.repos)?.data).toEqual(FALLBACK_REPOS);
  });

  it("returns cached data without network fetch when cache is fresh", async () => {
    const keys = CACHE_KEYS("cacheduser");
    writeCacheEntry(keys.profile, { login: "cacheduser", public_repos: 9 }, 'W/"p1"');
    writeCacheEntry(keys.repos, [{ name: "r1", language: "JavaScript", size: 10, fork: false }], 'W/"r1"');

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await fetchDashboardData("cacheduser");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.statusText).toBe("Online (cache local)");
    expect(result.profile.login).toBe("cacheduser");
    expect(result.repos).toHaveLength(1);
  });

  it("touches ETag cache timestamp when API returns 304 for stale cache", async () => {
    const keys = CACHE_KEYS("etaguser");
    const oldTs = Date.now() - 3_600_000;
    localStorage.setItem(
      keys.profile,
      JSON.stringify({ data: { login: "etaguser", public_repos: 2 }, etag: 'W/"p-old"', updatedAt: oldTs })
    );
    localStorage.setItem(
      keys.repos,
      JSON.stringify({ data: [{ name: "a", language: "TypeScript", size: 20, fork: false }], etag: 'W/"r-old"', updatedAt: oldTs })
    );

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    const result = await fetchDashboardData("etaguser");
    expect(result.statusText).toBe("Online");
    expect(readCacheEntry(keys.profile).updatedAt).toBeGreaterThan(oldTs);
    expect(readCacheEntry(keys.repos).updatedAt).toBeGreaterThan(oldTs);
  });

  it("preserves freshly fetched profile when 200 profile returns x-ratelimit-remaining=0 before repos fetch", async () => {
    const futureResetSec = Math.floor((Date.now() + 300_000) / 1000);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ login: "zeroremuser", name: "Zero Rem", public_repos: 7 }), {
        status: 200,
        headers: {
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(futureResetSec)
        }
      })
    );

    const result = await fetchDashboardData("zeroremuser");
    expect(result.profile.login).toBe("zeroremuser");
    expect(result.repos).toEqual(FALLBACK_REPOS);
    expect(result.isRateLimited).toBe(true);
    expect(result.isFallback).toBe(true);
    expect(readCacheEntry(CACHE_KEYS("zeroremuser").profile)?.data?.login).toBe("zeroremuser");
  });

  it("retries without ETag when HTTP 304 returns with empty local cache", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ login: "empty304", public_repos: 3 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: "demo", language: "JavaScript", size: 12, fork: false }]), {
          status: 200
        })
      );

    const result = await fetchDashboardData("empty304");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.statusVariant).toBe("online");
    expect(result.profile.login).toBe("empty304");
    expect(result.repos).toHaveLength(1);

    // If retry also returns 304 without data, fall back cleanly instead of Online + null profile
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }));

    const fallbackRes = await fetchDashboardData("broken304");
    expect(fallbackRes.statusVariant).toBe("error");
    expect(fallbackRes.isFallback).toBe(true);
    expect(fallbackRes.profile).toEqual(FALLBACK_PROFILE);
  });

  it("rejects malformed non-array repos cache and guards against headless profile on partial cache error", async () => {
    const keys = CACHE_KEYS("corruptrepos");
    localStorage.setItem(
      keys.repos,
      JSON.stringify({ data: { notAnArray: true }, updatedAt: Date.now() })
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("Error", { status: 500 }));

    const result = await fetchDashboardData("corruptrepos");
    expect(result.isFallback).toBe(true);
    expect(result.profile).toEqual(FALLBACK_PROFILE);
    expect(result.repos).toEqual(FALLBACK_REPOS);
  });

  it("retains isFallback=true and rate-limit status across reload, and retries fallback when rate limit clears", async () => {
    const futureResetSec = Math.floor((Date.now() + 300_000) / 1000);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("rate limit", {
        status: 429,
        headers: { "x-ratelimit-reset": String(futureResetSec) }
      })
    );

    const first = await fetchDashboardData("reloadfallback");
    expect(first.isFallback).toBe(true);
    expect(first.statusVariant).toBe("ratelimit");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Simulate reload while rate limit is still active -> zero additional fetches
    fetchSpy.mockClear();
    const second = await fetchDashboardData("reloadfallback");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(second.isFallback).toBe(true);
    expect(second.isRateLimited).toBe(true);
    expect(second.statusVariant).toBe("ratelimit");

    // Simulate rate limit expired -> fallback cache does not block recovery
    localStorage.removeItem(CACHE_KEYS("reloadfallback").rateLimitReset);
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ login: "reloadfallback", public_repos: 5 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: "ok", language: "TypeScript", size: 50, fork: false }]), {
          status: 200
        })
      );

    const recovered = await fetchDashboardData("reloadfallback");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(recovered.isFallback).toBe(false);
    expect(recovered.statusVariant).toBe("online");
    expect(recovered.profile.login).toBe("reloadfallback");
  });
});

describe("useGithubData hook lifecycle", () => {
  it("exposes hasReposData=false during uncached cold load and resets when username changes", async () => {
    const { renderHook, waitFor } = await import("@testing-library/react");
    const { useGithubData } = await import("../src/hooks/useGithubData.js");

    let resolveFetch;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    const { result, rerender } = renderHook(({ user }) => useGithubData(user), {
      initialProps: { user: "colduser1" }
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasReposData).toBe(false);
    expect(result.current.profile).toBeNull();

    resolveFetch(
      new Response(JSON.stringify({ login: "colduser1", public_repos: 2 }), { status: 200 })
    );

    // Wait briefly so second fetch (repos) resolves cleanly too
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([{ name: "repo1", language: "JavaScript", size: 10, fork: false }]), {
        status: 200
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.profile.login).toBe("colduser1");
    expect(result.current.hasReposData).toBe(true);

    // Switching username resets state from old user cleanly
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ login: "colduser2", public_repos: 9 }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: "repo2", language: "TypeScript", size: 20, fork: false }]), {
          status: 200
        })
      );

    rerender({ user: "colduser2" });
    expect(result.current.profile).toBeNull();
    expect(result.current.hasReposData).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.profile.login).toBe("colduser2");
    expect(result.current.repos[0].name).toBe("repo2");
  });
});
