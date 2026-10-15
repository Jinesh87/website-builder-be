import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";

/** Used only until the first rate has ever been fetched, e.g. a fresh install with no internet access. */
const FALLBACK_USD_INR = 95;
const REQUEST_TIMEOUT_MS = 10_000;
/** Providers publish once a day; checking more often just picks the new rate up sooner. */
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;

export type UsdInrRate = {
  rate: number;
  /** The day the provider published it (YYYY-MM-DD); null when using the built-in fallback. */
  rateDate: string | null;
  source: string;
  fetchedAt: string | null;
};

type Fetched = { rate: number; rateDate: string; source: string };

/** European Central Bank reference rates; updated on working days. */
async function fromFrankfurter(): Promise<Fetched> {
  const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=INR", {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Frankfurter returned ${response.status}`);
  const body = (await response.json()) as { date?: string; rates?: { INR?: number } };
  if (!body.date || !body.rates?.INR) throw new Error("Frankfurter returned no INR rate");
  return { rate: body.rates.INR, rateDate: body.date, source: "Frankfurter (European Central Bank)" };
}

async function fromExchangeRateApi(): Promise<Fetched> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`ExchangeRate-API returned ${response.status}`);
  const body = (await response.json()) as { result?: string; time_last_update_unix?: number; rates?: { INR?: number } };
  if (body.result !== "success" || !body.rates?.INR || !body.time_last_update_unix) {
    throw new Error("ExchangeRate-API returned no INR rate");
  }
  const rateDate = new Date(body.time_last_update_unix * 1000).toISOString().slice(0, 10);
  return { rate: body.rates.INR, rateDate, source: "ExchangeRate-API" };
}

function isSane(rate: number): boolean {
  return Number.isFinite(rate) && rate > 10 && rate < 1000;
}

let cache: { value: UsdInrRate; loadedAt: number } | null = null;
let timer: NodeJS.Timeout | null = null;

export class ExchangeRateService {
  /** Latest stored rate; never throws, so AI keeps working when the providers are down. */
  async current(): Promise<UsdInrRate> {
    if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.value;
    const row = await prisma.exchangeRate.findFirst({ orderBy: { rateDate: "desc" } });
    const value: UsdInrRate = row
      ? {
          rate: Number(row.rate),
          rateDate: row.rateDate.toISOString().slice(0, 10),
          source: row.source,
          fetchedAt: row.fetchedAt.toISOString(),
        }
      : { rate: FALLBACK_USD_INR, rateDate: null, source: "Built-in fallback (no rate fetched yet)", fetchedAt: null };
    cache = { value, loadedAt: Date.now() };
    return value;
  }

  /** Fetches today's rate, trying the backup provider if the first fails. Keeps the last good rate on failure. */
  async refresh(): Promise<UsdInrRate> {
    for (const provider of [fromFrankfurter, fromExchangeRateApi]) {
      try {
        const fetched = await provider();
        if (!isSane(fetched.rate)) throw new Error(`Implausible USD→INR rate ${fetched.rate}`);
        const rateDate = new Date(`${fetched.rateDate}T00:00:00Z`);
        const data = { rate: fetched.rate.toFixed(4), source: fetched.source, fetchedAt: new Date() };
        await prisma.exchangeRate.upsert({ where: { rateDate }, create: { rateDate, ...data }, update: data });
        cache = null;
        logger.info({ rate: fetched.rate, rateDate: fetched.rateDate, source: fetched.source }, "USD→INR rate updated");
        return this.current();
      } catch (error) {
        logger.warn({ err: error, provider: provider.name }, "Could not fetch the USD→INR rate");
      }
    }
    return this.current();
  }

  start(): void {
    if (timer) return;
    void this.refresh();
    timer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    timer.unref();
  }

  stop(): void {
    if (timer) clearInterval(timer);
    timer = null;
  }
}

export const exchangeRateService = new ExchangeRateService();
