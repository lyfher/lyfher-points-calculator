// Hourly funding snapshot for the consistency score.
// Run by .github/workflows/snapshot.yml. Fetches all DEXs server-side (no CORS),
// computes each coin's delta-neutral net APR (max−min across venues) and appends
// it to public/history.json, keeping a rolling 7-day window.

import { readFile, writeFile } from "node:fs/promises";

const WINDOW_MS = 7 * 24 * 3600 * 1000;
const HIST_PATH = "public/history.json";

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const j = (r) => r.json();
const normCoin = (s) => String(s).replace(/[-_/].*$/, "").replace(/USDT$|USDC$|USD$|PERP$/i, "").toUpperCase();

const TXFLOW_MAJORS = [
  "BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","SUI","TON","TRX",
  "LTC","BCH","DOT","NEAR","APT","ARB","OP","INJ","TIA","SEI","PEPE","WIF",
  "HYPE","ENA","JUP","AAVE","UNI","LDO","ONDO","PENDLE","XPL","WLD","FARTCOIN",
];

// Each fetcher returns { [coin]: aprPercent }
async function fetchHL() {
  const r = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) });
  const [meta, ctxs] = await j(r); const out = {};
  meta.universe.forEach((u, i) => { const f = num((ctxs[i] || {}).funding); if (f != null) out[normCoin(u.name)] = f * 24 * 365 * 100; });
  return out;
}
async function fetchLighterHost(host) {
  const r = await fetch(host + "/api/v1/funding-rates"); const d = await j(r); const out = {};
  (d.funding_rates || []).forEach((x) => { if (x.exchange !== "lighter") return; const f = num(x.rate); if (f != null) out[normCoin(x.symbol)] = f * 3 * 365 * 100; });
  return out;
}
async function fetchPacifica() {
  const r = await fetch("https://api.pacifica.fi/api/v1/info/prices"); const d = await j(r); const out = {};
  (d.data || []).forEach((x) => { const f = num(x.funding); if (f != null) out[normCoin(x.symbol)] = f * 24 * 365 * 100; });
  return out;
}
async function fetchVariational() {
  const r = await fetch("https://omni-client-api.prod.ap-northeast-1.variational.io/metadata/stats"); const d = await j(r); const out = {};
  (d.listings || []).forEach((x) => { const f = num(x.funding_rate); if (f != null) out[normCoin(x.ticker)] = f * 100; });
  return out;
}
async function fetchArcus() {
  const r = await fetch("https://api.arcus.xyz/v1/markets"); const d = await j(r); const out = {};
  (d.markets || []).forEach((x) => { if (x.category !== "CRYPTO" || x.status !== "ONLINE") return; const f = num(x.fundingRate); if (f != null) out[normCoin(x.baseAsset)] = f * 24 * 365 * 100; });
  return out;
}
async function fetchExtended() {
  const r = await fetch("https://api.starknet.extended.exchange/api/v1/info/markets"); const d = (await j(r)).data || []; const out = {};
  for (const m of d) { if (m.type !== "PERPETUAL" || m.status !== "ACTIVE") continue; const f = num((m.marketStats || {}).fundingRate); if (f != null) out[normCoin(m.name)] = f * 24 * 365 * 100; }
  return out;
}
async function fetchRiseX() {
  const r = await fetch("https://api.rise.trade/v1/markets"); const mk = (await j(r)).data?.markets || []; const out = {};
  for (const m of mk) { if (m.active === false) continue; const f8 = num(m.funding_rate_8h); if (f8 != null) out[normCoin((m.base_asset_symbol || m.display_name || "").split("/")[0])] = f8 * 3 * 365 * 100; }
  return out;
}
async function fetchTxflow() {
  const H = { "Content-Type": "application/json", "Origin": "https://app.txflow.com" };
  const mr = await fetch("https://api.txflow.com/info", { method: "POST", headers: H, body: JSON.stringify({ type: "perpMeta" }) });
  const uni = (await j(mr)).universe || []; const bySym = {};
  for (const u of uni) { if (u.delisted || u.haltTrading) continue; const base = (u.baseCurrency || "").toUpperCase(); if (TXFLOW_MAJORS.includes(base) && !bySym[base]) bySym[base] = u.name; }
  const out = {};
  await Promise.allSettled(Object.entries(bySym).map(async ([base, name]) => {
    const r = await fetch("https://api.txflow.com/info", { method: "POST", headers: H, body: JSON.stringify({ type: "activeAssetCtx", coin: name }) });
    const f = num((await j(r)).nodeCtx?.funding); if (f != null) out[base] = f * 24 * 365;  // already percent
  }));
  return out;
}

const SOURCES = [
  ["Hyperliquid", fetchHL],
  ["Lighter", () => fetchLighterHost("https://mainnet.zklighter.elliot.ai")],
  ["LighterRH", () => fetchLighterHost("https://api.rh.lighter.xyz")],
  ["Pacifica", fetchPacifica],
  ["Variational", fetchVariational],
  ["Arcus", fetchArcus],
  ["Extended", fetchExtended],
  ["RiseX", fetchRiseX],
  ["TxFlow", fetchTxflow],
];

async function main() {
  const settled = await Promise.allSettled(SOURCES.map(([, f]) => f()));
  const byCoin = {};  // coin -> [apr, ...]
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") { console.error("source failed:", SOURCES[i][0], String(s.reason)); return; }
    for (const [coin, apr] of Object.entries(s.value)) { (byCoin[coin] ||= []).push(apr); }
  });

  const now = Date.now();
  const snapshot = {};  // coin -> netAPR
  for (const [coin, aprs] of Object.entries(byCoin)) {
    if (aprs.length < 2) continue;
    const net = Math.max(...aprs) - Math.min(...aprs);
    snapshot[coin] = Math.round(net * 10) / 10;
  }

  let hist = { updated: 0, points: {} };
  try { hist = JSON.parse(await readFile(HIST_PATH, "utf8")); } catch { /* first run */ }
  hist.points ||= {};

  for (const [coin, net] of Object.entries(snapshot)) {
    const arr = (hist.points[coin] ||= []);
    arr.push([now, net]);
  }
  // prune to rolling window and drop empty coins
  for (const coin of Object.keys(hist.points)) {
    hist.points[coin] = hist.points[coin].filter((p) => p[0] >= now - WINDOW_MS);
    if (!hist.points[coin].length) delete hist.points[coin];
  }
  hist.updated = now;

  await writeFile(HIST_PATH, JSON.stringify(hist));
  console.log(`snapshot: ${Object.keys(snapshot).length} coins, ${Object.keys(hist.points).length} tracked`);
}

main().catch((e) => { console.error(e); process.exit(1); });
