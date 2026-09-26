// Vercel serverless proxy for CORS-blocked perp DEX funding sources.
// Returns normalized funding for Extended, RiseX and TxFlow.
// Each entry: { coin, apr, px, oiUsd, volUsd }  (apr = annualized %, gross funding)

const TXFLOW_MAJORS = [
  "BTC","ETH","SOL","BNB","XRP","DOGE","ADA","AVAX","LINK","SUI","TON","TRX",
  "LTC","BCH","DOT","NEAR","APT","ARB","OP","INJ","TIA","SEI","PEPE","WIF",
  "HYPE","ENA","JUP","AAVE","UNI","LDO","ONDO","PENDLE","XPL","WLD","FARTCOIN",
];

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
const j = (r) => r.json();
const normCoin = (s) => String(s).replace(/[-_/].*$/, "").replace(/USDT$|USDC$|USD$|PERP$/i, "").toUpperCase();

async function fetchExtended() {
  const r = await fetch("https://api.starknet.extended.exchange/api/v1/info/markets");
  if (!r.ok) throw new Error("extended " + r.status);
  const d = (await j(r)).data || [];
  const out = [];
  for (const m of d) {
    if (m.type !== "PERPETUAL" || m.status !== "ACTIVE") continue;
    const s = m.marketStats || {};
    const f = num(s.fundingRate);          // hourly rate
    if (f == null) continue;
    out.push({
      coin: m.name.replace(/-USD$/, "").toUpperCase(),
      apr: f * 24 * 365 * 100,
      px: num(s.markPrice),
      oiUsd: num(s.openInterest),          // already USD notional
      volUsd: num(s.dailyVolume),
    });
  }
  return out;
}

async function fetchRiseX() {
  const r = await fetch("https://api.rise.trade/v1/markets");
  if (!r.ok) throw new Error("risex " + r.status);
  const mk = (await j(r)).data?.markets || [];
  const out = [];
  for (const m of mk) {
    if (m.active === false) continue;
    const f8 = num(m.funding_rate_8h);     // 8h rate
    const px = num(m.mark_price);
    if (f8 == null || px == null) continue;
    const oi = num(m.open_interest);       // base units
    out.push({
      coin: (m.base_asset_symbol || m.display_name || "").split("/")[0].toUpperCase(),
      apr: f8 * 3 * 365 * 100,
      px,
      oiUsd: oi != null ? oi * px : null,
      volUsd: num(m.quote_volume_24h),
    });
  }
  return out;
}

async function fetchTxflow() {
  const H = { "Content-Type": "application/json", "Origin": "https://app.txflow.com" };
  const mr = await fetch("https://api.txflow.com/info", {
    method: "POST", headers: H, body: JSON.stringify({ type: "perpMeta" }),
  });
  if (!mr.ok) throw new Error("txflow meta " + mr.status);
  const uni = (await j(mr)).universe || [];
  const bySym = {};
  for (const u of uni) {
    if (u.delisted || u.haltTrading) continue;
    const base = (u.baseCurrency || "").toUpperCase();
    if (TXFLOW_MAJORS.includes(base) && !bySym[base]) bySym[base] = u.name;
  }
  const entries = await Promise.allSettled(
    Object.entries(bySym).map(async ([base, name]) => {
      const r = await fetch("https://api.txflow.com/info", {
        method: "POST", headers: H, body: JSON.stringify({ type: "activeAssetCtx", coin: name }),
      });
      if (!r.ok) throw new Error("txflow ctx " + r.status);
      const c = await j(r);
      const n = c.nodeCtx || {};
      const f = num(n.funding);            // hourly rate, ALREADY in percent (e.g. 0.00125 = 0.00125%/h)
      const px = num(n.markPx || n.oraclePx);
      if (f == null || px == null) return null;
      const oi = num(n.openInterest);      // base units
      return {
        coin: base,
        apr: f * 24 * 365,                 // percent already → no extra *100
        px,
        oiUsd: oi != null ? oi * px : null,
        volUsd: num(c.dayNtlVlm),
      };
    })
  );
  return entries.filter((e) => e.status === "fulfilled" && e.value).map((e) => e.value);
}

async function fetchAster() {
  const [r, fiRes] = await Promise.all([
    fetch("https://fapi.asterdex.com/fapi/v1/premiumIndex"),
    fetch("https://fapi.asterdex.com/fapi/v1/fundingInfo").catch(() => null),
  ]);
  if (!r.ok) throw new Error("aster " + r.status);
  const arr = await j(r);
  const ivH = {};                         // symbol -> funding interval hours (Aster varies per market: 4h or 8h)
  if (fiRes && fiRes.ok) { for (const x of await j(fiRes)) { const h = num(x.fundingIntervalHours); if (h) ivH[x.symbol] = h; } }
  const bySym = {};                       // normCoin -> { sym, f, px }
  for (const m of arr) {
    const f = num(m.lastFundingRate), px = num(m.markPrice);
    if (f == null || px == null) continue;
    const coin = normCoin(m.symbol);
    if (!bySym[coin] || /USDT$/.test(m.symbol)) bySym[coin] = { sym: m.symbol, f, px };  // funding fraction per interval; prefer USDT pair
  }
  const majors = TXFLOW_MAJORS.filter((c) => bySym[c]);
  const oi = {};
  await Promise.allSettled(majors.map(async (c) => {
    const rr = await fetch("https://fapi.asterdex.com/fapi/v1/openInterest?symbol=" + bySym[c].sym);
    if (rr.ok) { const o = num((await rr.json()).openInterest); if (o != null) oi[c] = o * bySym[c].px; }
  }));
  return Object.entries(bySym).map(([coin, v]) => {
    const h = ivH[v.sym] || 8;            // annualize by the market's real interval (default 8h), not a fixed 3/day
    return { coin, apr: v.f * (24 / h) * 365 * 100, px: v.px, oiUsd: oi[coin] ?? null, volUsd: null, intervalH: h };
  });
}

async function fetchParadex() {
  const r = await fetch("https://api.prod.paradex.trade/v1/markets/summary?market=ALL");
  if (!r.ok) throw new Error("paradex " + r.status);
  const res = (await j(r)).results || [];
  const out = [];
  for (const m of res) {
    if (!/-USD-PERP$/.test(m.symbol || "")) continue;   // perps only (skip options)
    const f = num(m.funding_rate), px = num(m.mark_price), oi = num(m.open_interest);
    if (f == null || px == null) continue;
    out.push({ coin: normCoin(m.symbol), apr: f * 3 * 365 * 100, px, oiUsd: oi != null ? oi * px : null, volUsd: num(m.volume_24h) });  // 8h funding fraction
  }
  return out;
}

async function fetchOndo() {
  const r = await fetch("https://api.ondoperps.xyz/v1/perps/contracts");
  if (!r.ok) throw new Error("ondo " + r.status);
  const arr = (await j(r)).result || [];
  const out = [];
  for (const m of arr) {                                 // RWA/stocks/ETF/commodity perps + some crypto
    if (m.disabled || m.isClosed) continue;
    const f = num(m.fundingRate);                        // per 3h interval (8 divisions/day)
    if (f == null) continue;
    const bid = num(m.bid), ask = num(m.ask);
    out.push({
      coin: normCoin(m.market),
      apr: f * 8 * 365 * 100,
      // use the perp mark (mid of bid/ask, else last) not indexPrice — index lags mark during fast moves and skews cross-venue spread
      px: (bid != null && ask != null) ? (bid + ask) / 2 : (num(m.lastPrice) ?? num(m.indexPrice)),
      oiUsd: num(m.openInterestUsd),
      volUsd: num(m.usdVolume),
    });
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  const [ext, rise, tx, aster, para, ondo] = await Promise.allSettled([fetchExtended(), fetchRiseX(), fetchTxflow(), fetchAster(), fetchParadex(), fetchOndo()]);
  res.status(200).json({
    extended: ext.status === "fulfilled" ? ext.value : null,
    risex: rise.status === "fulfilled" ? rise.value : null,
    txflow: tx.status === "fulfilled" ? tx.value : null,
    aster: aster.status === "fulfilled" ? aster.value : null,
    paradex: para.status === "fulfilled" ? para.value : null,
    ondo: ondo.status === "fulfilled" ? ondo.value : null,
    errors: {
      extended: ext.status === "rejected" ? String(ext.reason) : null,
      risex: rise.status === "rejected" ? String(rise.reason) : null,
      txflow: tx.status === "rejected" ? String(tx.reason) : null,
      aster: aster.status === "rejected" ? String(aster.reason) : null,
      paradex: para.status === "rejected" ? String(para.reason) : null,
      ondo: ondo.status === "rejected" ? String(ondo.reason) : null,
    },
  });
}
