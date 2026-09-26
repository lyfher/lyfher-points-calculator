// Hourly funding snapshot for the consistency score + Telegram opportunity alerts.
// Run by .github/workflows/snapshot.yml. Fetches all DEXs server-side (no CORS),
// computes each coin's delta-neutral net APR (max−min across venues) + depth,
// appends net APR to public/history.json (rolling 7d), and posts new high-quality
// opportunities to a Telegram channel (no-op if TELEGRAM_* env vars are absent).

import { readFile, writeFile } from "node:fs/promises";

const WINDOW_MS = 7 * 24 * 3600 * 1000;
const HIST_PATH = "public/history.json";

// Alert tuning
const ALERT_MIN_APR = 50;          // net APR % to be worth an alert
const ALERT_MIN_DEPTH = 1_000_000; // USD OI on the thinner leg — avoid thin traps
const ALERT_COOLDOWN_MS = 12 * 3600 * 1000; // don't re-alert the same coin within 12h
const ALERT_MAX = 6;               // max opportunities per message

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const j = (r) => r.json();
const normCoin = (s) => String(s).replace(/[-_/].*$/, "").replace(/USDT$|USDC$|USD$|PERP$/i, "").toUpperCase();

const TXFLOW_MAJORS = [
  "BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","SUI","TON","TRX",
  "LTC","BCH","DOT","NEAR","APT","ARB","OP","INJ","TIA","SEI","PEPE","WIF",
  "HYPE","ENA","JUP","AAVE","UNI","LDO","ONDO","PENDLE","XPL","WLD","FARTCOIN",
];

// Each fetcher returns { [coin]: { apr, px, oiUsd } }  (px feeds the entry-spread history)
async function fetchHL() {
  const r = await fetch("https://api.hyperliquid.xyz/info", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "metaAndAssetCtxs" }) });
  const [meta, ctxs] = await j(r); const out = {};
  meta.universe.forEach((u, i) => { const c = ctxs[i] || {}; const f = num(c.funding), px = num(c.markPx), oi = num(c.openInterest);
    if (f != null) out[normCoin(u.name)] = { apr: f * 24 * 365 * 100, px, oiUsd: oi != null && px != null ? oi * px : null }; });
  return out;
}
async function fetchLighterHost(host) {
  const [fr, od] = await Promise.all([
    fetch(host + "/api/v1/funding-rates").then(j),
    fetch(host + "/api/v1/orderBookDetails").then((r) => r.ok ? r.json() : { order_book_details: [] }).catch(() => ({ order_book_details: [] })),
  ]);
  const oiMap = {}, pxMap = {};
  (od.order_book_details || []).forEach((d) => { const p = num(d.mark_price), oi = num(d.open_interest); const c = normCoin(d.symbol); pxMap[c] = p; oiMap[c] = p != null && oi != null ? oi * p : null; });
  const out = {};
  (fr.funding_rates || []).forEach((x) => { if (x.exchange !== "lighter") return; const f = num(x.rate); const c = normCoin(x.symbol); if (f != null) out[c] = { apr: f * 3 * 365 * 100, px: pxMap[c] ?? null, oiUsd: oiMap[c] ?? null }; });
  return out;
}
async function fetchPacifica() {
  const r = await fetch("https://api.pacifica.fi/api/v1/info/prices"); const d = await j(r); const out = {};
  (d.data || []).forEach((x) => { const f = num(x.funding), px = num(x.mark), oi = num(x.open_interest);
    if (f != null) out[normCoin(x.symbol)] = { apr: f * 24 * 365 * 100, px, oiUsd: oi != null && px != null ? oi * px : null }; });
  return out;
}
async function fetchVariational() {
  const r = await fetch("https://omni-client-api.prod.ap-northeast-1.variational.io/metadata/stats"); const d = await j(r); const out = {};
  (d.listings || []).forEach((x) => { const f = num(x.funding_rate), oi = num(x.open_interest?.long_open_interest);
    const b = num(x.quotes?.base?.bid), a = num(x.quotes?.base?.ask);
    const px = (b != null && a != null) ? (b + a) / 2 : num(x.mark_price);   // quotes mid is fresh; mark_price lags
    if (f != null) out[normCoin(x.ticker)] = { apr: f * 100, px, oiUsd: oi != null && px != null ? oi * px : null }; });
  return out;
}
async function fetchArcus() {
  const r = await fetch("https://api.arcus.xyz/v1/markets"); const d = await j(r); const out = {};
  (d.markets || []).forEach((x) => { if (x.category !== "CRYPTO" || x.status !== "ONLINE") return; const f = num(x.fundingRate), px = num(x.markPrice), oi = num(x.openInterest);
    if (f != null) out[normCoin(x.baseAsset)] = { apr: f * 24 * 365 * 100, px, oiUsd: oi != null && px != null ? oi * px : null }; });
  return out;
}
async function fetchExtended() {
  const r = await fetch("https://api.starknet.extended.exchange/api/v1/info/markets"); const d = (await j(r)).data || []; const out = {};
  for (const m of d) { if (m.type !== "PERPETUAL" || m.status !== "ACTIVE") continue; const s = m.marketStats || {}; const f = num(s.fundingRate);
    if (f != null) out[normCoin(m.name)] = { apr: f * 24 * 365 * 100, px: num(s.markPrice ?? s.lastPrice ?? s.indexPrice), oiUsd: num(s.openInterest) }; }
  return out;
}
async function fetchRiseX() {
  const r = await fetch("https://api.rise.trade/v1/markets"); const mk = (await j(r)).data?.markets || []; const out = {};
  for (const m of mk) { if (m.active === false) continue; const f8 = num(m.funding_rate_8h), px = num(m.mark_price), oi = num(m.open_interest);
    if (f8 != null) out[normCoin((m.base_asset_symbol || m.display_name || "").split("/")[0])] = { apr: f8 * 3 * 365 * 100, px, oiUsd: oi != null && px != null ? oi * px : null }; }
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
    const c = await j(r); const n = c.nodeCtx || {}; const f = num(n.funding), px = num(n.markPx || n.oraclePx), oi = num(n.openInterest);
    if (f != null) out[base] = { apr: f * 24 * 365, px, oiUsd: oi != null && px != null ? oi * px : null };  // funding already percent
  }));
  return out;
}

async function fetchAster() {
  const [arr, fi] = await Promise.all([
    fetch("https://fapi.asterdex.com/fapi/v1/premiumIndex").then(j),
    fetch("https://fapi.asterdex.com/fapi/v1/fundingInfo").then(j).catch(() => []),
  ]);
  const ivH = {}; for (const x of (Array.isArray(fi) ? fi : [])) { const h = num(x.fundingIntervalHours); if (h) ivH[x.symbol] = h; }  // per-market interval (4h/8h)
  const bySym = {};
  for (const m of arr) { const f = num(m.lastFundingRate), px = num(m.markPrice); if (f == null || px == null) continue;
    const coin = normCoin(m.symbol); if (!bySym[coin] || /USDT$/.test(m.symbol)) bySym[coin] = { sym: m.symbol, f, px }; }
  const oi = {};
  await Promise.allSettled(TXFLOW_MAJORS.filter((c) => bySym[c]).map(async (c) => {
    const rr = await fetch("https://fapi.asterdex.com/fapi/v1/openInterest?symbol=" + bySym[c].sym);
    if (rr.ok) { const o = num((await rr.json()).openInterest); if (o != null) oi[c] = o * bySym[c].px; }
  }));
  const out = {}; for (const [coin, v] of Object.entries(bySym)) { const h = ivH[v.sym] || 8; out[coin] = { apr: v.f * (24 / h) * 365 * 100, px: v.px, oiUsd: oi[coin] ?? null }; } return out;
}
async function fetchParadex() {
  const res = (await fetch("https://api.prod.paradex.trade/v1/markets/summary?market=ALL").then(j)).results || [];
  const out = {};
  for (const m of res) { if (!/-USD-PERP$/.test(m.symbol || "")) continue; const f = num(m.funding_rate), px = num(m.mark_price), oi = num(m.open_interest);
    if (f != null && px != null) out[normCoin(m.symbol)] = { apr: f * 3 * 365 * 100, px, oiUsd: oi != null ? oi * px : null }; }
  return out;
}
async function fetchOndo() {
  const arr = (await fetch("https://api.ondoperps.xyz/v1/perps/contracts").then(j)).result || [];
  const out = {};
  for (const m of arr) { if (m.disabled || m.isClosed) continue; const f = num(m.fundingRate);  // per 3h interval, 8/day
    const bid = num(m.bid), ask = num(m.ask);
    const px = (bid != null && ask != null) ? (bid + ask) / 2 : (num(m.lastPrice) ?? num(m.indexPrice));  // mark, not index
    if (f != null) out[normCoin(m.market)] = { apr: f * 8 * 365 * 100, px, oiUsd: num(m.openInterestUsd) }; }
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
  ["Aster", fetchAster],
  ["Paradex", fetchParadex],
  ["Ondo", fetchOndo],
];

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) { console.log("telegram: secrets not set, skipping alerts"); return; }
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!r.ok) console.error("telegram send failed:", r.status, await r.text().catch(() => ""));
  else console.log("telegram: alert sent");
}
const fmtMoney = (n) => n == null ? "?" : n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + "B" : n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? "$" + (n / 1e3).toFixed(0) + "K" : "$" + n.toFixed(0);

async function main() {
  const settled = await Promise.allSettled(SOURCES.map(([, f]) => f()));
  const byCoin = {};  // coin -> [{ex, apr, oiUsd}, ...]
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") { console.error("source failed:", SOURCES[i][0], String(s.reason)); return; }
    for (const [coin, v] of Object.entries(s.value)) { if (v.apr == null) continue; (byCoin[coin] ||= []).push({ ex: SOURCES[i][0], ...v }); }
  });

  const now = Date.now();
  const snapshot = {};  // coin -> { net, depth, long, short }
  for (const [coin, legs] of Object.entries(byCoin)) {
    if (legs.length < 2) continue;
    const sorted = legs.slice().sort((a, b) => a.apr - b.apr);
    const long = sorted[0], short = sorted[sorted.length - 1];
    const depths = [long.oiUsd, short.oiUsd].filter((v) => v != null);
    // entry spread: long px vs short px; >25% = contract-size mismatch (e.g. US500 full vs mini), not real → drop
    let spread = null;
    if (long.px && short.px) { const s = ((long.px - short.px) / short.px) * 100; if (Math.abs(s) <= 25) spread = Math.round(s * 1000) / 1000; }
    snapshot[coin] = {
      net: Math.round((short.apr - long.apr) * 10) / 10,
      depth: depths.length ? Math.min(...depths) : null,
      long: long.ex, short: short.ex, spread,
    };
  }

  let hist = { updated: 0, points: {}, spreads: {}, alerts: {} };
  try { hist = JSON.parse(await readFile(HIST_PATH, "utf8")); } catch { /* first run */ }
  hist.points ||= {}; hist.spreads ||= {}; hist.alerts ||= {};

  for (const [coin, s] of Object.entries(snapshot)) (hist.points[coin] ||= []).push([now, s.net]);
  for (const coin of Object.keys(hist.points)) {
    hist.points[coin] = hist.points[coin].filter((p) => p[0] >= now - WINDOW_MS);
    if (!hist.points[coin].length) delete hist.points[coin];
  }

  for (const [coin, s] of Object.entries(snapshot)) if (s.spread != null) (hist.spreads[coin] ||= []).push([now, s.spread]);
  for (const coin of Object.keys(hist.spreads)) {
    hist.spreads[coin] = hist.spreads[coin].filter((p) => p[0] >= now - WINDOW_MS);
    if (!hist.spreads[coin].length) delete hist.spreads[coin];
  }

  // ── Opportunity alerts ──────────────────────────────────────────────
  const alerts = [];
  for (const [coin, s] of Object.entries(snapshot)) {
    if (s.net < ALERT_MIN_APR) continue;
    if (s.depth == null || s.depth < ALERT_MIN_DEPTH) continue;
    const pts = hist.points[coin] || [];
    if (pts.length < 2 || pts[pts.length - 2][1] < ALERT_MIN_APR * 0.7) continue;  // must be sustained, not a one-off spike
    if (now - (hist.alerts[coin] || 0) < ALERT_COOLDOWN_MS) continue;              // cooldown
    alerts.push({ coin, ...s });
  }
  alerts.sort((a, b) => b.net - a.net);
  const picks = alerts.slice(0, ALERT_MAX);
  if (picks.length) {
    const lines = picks.map((a) => `• <b>${a.coin}</b>  +${a.net.toFixed(0)}% APR — LONG ${a.long} / SHORT ${a.short}  (${fmtMoney(a.depth)})`);
    const text = `🚨 <b>New delta-neutral opportunities</b>\n\n${lines.join("\n")}\n\n🔗 <a href="https://lyfher.xyz/funding">lyfher.xyz/funding</a>`;
    await sendTelegram(text);
    for (const a of picks) hist.alerts[a.coin] = now;
  }
  // prune stale cooldown entries
  for (const coin of Object.keys(hist.alerts)) if (now - hist.alerts[coin] > WINDOW_MS) delete hist.alerts[coin];

  hist.updated = now;
  await writeFile(HIST_PATH, JSON.stringify(hist));
  console.log(`snapshot: ${Object.keys(snapshot).length} coins, ${Object.keys(hist.points).length} tracked, ${picks.length} alerts`);
}

main().catch((e) => { console.error(e); process.exit(1); });
