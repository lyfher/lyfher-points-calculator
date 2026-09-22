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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  const [ext, rise, tx] = await Promise.allSettled([fetchExtended(), fetchRiseX(), fetchTxflow()]);
  res.status(200).json({
    extended: ext.status === "fulfilled" ? ext.value : null,
    risex: rise.status === "fulfilled" ? rise.value : null,
    txflow: tx.status === "fulfilled" ? tx.value : null,
    errors: {
      extended: ext.status === "rejected" ? String(ext.reason) : null,
      risex: rise.status === "rejected" ? String(rise.reason) : null,
      txflow: tx.status === "rejected" ? String(tx.reason) : null,
    },
  });
}
