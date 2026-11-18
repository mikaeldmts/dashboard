import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_REFRESH_INTERVAL_MS = 4 * 60 * 1000;

export function useWorldIntel({ enabled = true } = {}) {
  const [globalData, setGlobalData] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);
  const [error, setError] = useState(null);

  const countryCacheRef = useRef(new Map());
  const abortCountryRef = useRef(null);

  const fetchGlobal = useCallback(async ({ force = false } = {}) => {
    setIsLoadingGlobal(true);
    setError(null);
    try {
      const qs = force ? "?mode=global&refresh=1" : "?mode=global";
      const response = await fetch(`/api/world-intel${qs}`);
      if (!response.ok) {
        throw new Error(`Falha ao sincronizar pulso global (${response.status})`);
      }
      const payload = await response.json();
      setGlobalData(payload);
      return payload;
    } catch (err) {
      setError(err?.message || "Não foi possível carregar os dados globais agora.");
      return null;
    } finally {
      setIsLoadingGlobal(false);
    }
  }, []);

  const fetchCountry = useCallback(async (country, { force = false } = {}) => {
    if (!country) return null;
    const key = country.iso2 || country.id || country.nameEn;

    if (!force && countryCacheRef.current.has(key)) {
      const cached = countryCacheRef.current.get(key);
      if (Date.now() - cached.timestamp < 3 * 60 * 1000) {
        setCountryData(cached.data);
        return cached.data;
      }
    }

    if (abortCountryRef.current) {
      abortCountryRef.current.abort();
    }
    const controller = new AbortController();
    abortCountryRef.current = controller;

    setIsLoadingCountry(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        mode: "country",
        iso2: country.iso2 || "",
        iso3: country.iso3 || "",
        namePt: country.namePt || country.nameEn || "",
        nameEn: country.nameEn || country.namePt || "",
        region: country.region || "Global"
      });
      if (country.lon != null && country.lat != null) {
        params.set("lon", String(country.lon));
        params.set("lat", String(country.lat));
      }
      if (force) {
        params.set("refresh", "1");
      }

      const response = await fetch(`/api/world-intel?${params.toString()}`, {
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Falha ao consultar ${country.namePt} (${response.status})`);
      }
      const payload = await response.json();
      countryCacheRef.current.set(key, { timestamp: Date.now(), data: payload });
      setCountryData(payload);
      return payload;
    } catch (err) {
      if (err?.name === "AbortError") return null;
      setError(err?.message || `Erro ao carregar dados em tempo real de ${country.namePt}.`);
      return null;
    } finally {
      if (abortCountryRef.current === controller) {
        setIsLoadingCountry(false);
      }
    }
  }, []);

  const selectCountry = useCallback(
    (country) => {
      if (!country) {
        setSelectedCountry(null);
        setCountryData(null);
        return;
      }
      setSelectedCountry(country);
      fetchCountry(country);
    },
    [fetchCountry]
  );

  const clearCountry = useCallback(() => {
    if (abortCountryRef.current) {
      abortCountryRef.current.abort();
    }
    setSelectedCountry(null);
    setCountryData(null);
    setIsLoadingCountry(false);
  }, []);

  const refreshActive = useCallback(() => {
    if (selectedCountry) {
      fetchCountry(selectedCountry, { force: true });
    }
    fetchGlobal({ force: true });
  }, [selectedCountry, fetchCountry, fetchGlobal]);

  useEffect(() => {
    if (!enabled) return undefined;
    fetchGlobal();
    const timer = window.setInterval(() => {
      fetchGlobal();
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, fetchGlobal]);

  const activeIntel = selectedCountry ? countryData : globalData;
  const isBusy = isLoadingGlobal || isLoadingCountry;

  return {
    globalData,
    selectedCountry,
    countryData,
    activeIntel,
    isLoadingGlobal,
    isLoadingCountry,
    isBusy,
    error,
    selectCountry,
    clearCountry,
    refreshActive
  };
}
