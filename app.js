/* ============================================================
   app.js  —  CryptoML Dashboard Logic
   ============================================================ */

const API = "";          // Same origin via FastAPI static mount
const COIN_COLORS = {
  bitcoin:      "#F7931A",
  ethereum:     "#627EEA",
  binancecoin:  "#F3BA2F",
  solana:       "#9945FF",
  ripple:       "#00AAE4",
};
const MODEL_COLORS = {
  lstm: "#a78bfa",
  rf:   "#34d399",
  lr:   "#fb923c",
};

let activeCoin     = null;
let forecastDays   = 7;
let coins          = [];
let mainChart      = null;
let rsiChart       = null;
let macdChart      = null;
let bbChart        = null;
let mcapChart      = null;

// ── Utility ────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtBig(n) {
  if (!n) return "—";
  if (n >= 1e12) return "$" + fmt(n / 1e12, 2) + "T";
  if (n >= 1e9)  return "$" + fmt(n / 1e9,  2) + "B";
  if (n >= 1e6)  return "$" + fmt(n / 1e6,  2) + "M";
  return "$" + fmt(n, 0);
}
function fmtPct(n) {
  if (n === null || n === undefined) return "—";
  const s = (n * 100).toFixed(2);
  return (n >= 0 ? "+" : "") + s + "%";
}
function setStatus(text, state = "idle") {
  document.getElementById("statusText").textContent = text;
  const dot = document.getElementById("statusDot");
  dot.className = "status-dot " + state;
}
function showLoading(text = "Loading…") {
  document.getElementById("loadingText").textContent = text;
  document.getElementById("loadingOverlay").classList.remove("hidden");
}
function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

// ── API calls ──────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Coin list ──────────────────────────────────────────────

async function loadCoins() {
  try {
    coins = await apiFetch("/coins");
    renderCoinList();
  } catch (e) {
    console.error("Failed to load coins", e);
    setStatus("API unreachable", "error");
  }
}

function renderCoinList() {
  const list = document.getElementById("coinList");
  list.innerHTML = "";
  for (const c of coins) {
    const item = document.createElement("div");
    item.className = "coin-item";
    item.id = "coin-" + c.id;
    item.style.setProperty("--coin-color", COIN_COLORS[c.id] || "#7c3aed");

    const readyClass = c.model_ready ? "ready" : c.data_ready ? "partial" : "";

    item.innerHTML = `
      <div class="coin-badge" style="background:${COIN_COLORS[c.id]}22;color:${COIN_COLORS[c.id]}">
        ${c.ticker}
      </div>
      <div class="coin-info">
        <div class="coin-name-side">${c.name}</div>
        <div class="coin-ticker-side">${c.ticker}</div>
      </div>
      <div class="ready-dot ${readyClass}" title="${c.model_ready ? 'Models ready' : c.data_ready ? 'Data only' : 'Not downloaded'}"></div>
    `;
    item.addEventListener("click", () => selectCoin(c.id));
    list.appendChild(item);
  }
}

// ── Select coin ────────────────────────────────────────────

async function selectCoin(coinId) {
  if (activeCoin === coinId) return;
  activeCoin = coinId;

  // Highlight sidebar
  document.querySelectorAll(".coin-item").forEach(el => el.classList.remove("active"));
  const el = document.getElementById("coin-" + coinId);
  if (el) el.classList.add("active");

  const meta = coins.find(c => c.id === coinId) || {};
  document.getElementById("coinTitle").textContent = meta.name || coinId;
  document.getElementById("coinSubtitle").textContent = meta.ticker + " · ML Prediction Dashboard";

  hideOverlay();
  showLoading("Loading market data…");
  setStatus("Fetching " + (meta.ticker || coinId), "loading");

  try {
    const [history, indicators] = await Promise.all([
      apiFetch(`/history/${coinId}?days=180`),
      apiFetch(`/indicators/${coinId}`),
    ]);

    renderStats(indicators);
    renderMainChart(coinId, history, null);
    renderRSI(indicators);
    renderMACD(indicators);
    renderBB(history);
    renderMcap(history);

    // Load predictions (may take a moment)
    setStatus("Computing predictions…", "loading");
    try {
      const preds = await apiFetch(`/predict/${coinId}?days=${forecastDays}`);
      renderMainChart(coinId, history, preds);
      setStatus("Ready", "ready");
    } catch {
      setStatus("No models — train first", "idle");
    }

    // Metrics
    try {
      const metrics = await apiFetch(`/metrics/${coinId}`);
      renderMetrics(metrics);
    } catch { /* not trained */ }

  } catch (e) {
    console.error(e);
    setStatus("Error loading data", "error");
  } finally {
    hideLoading();
  }
}

// ── Stats topbar ───────────────────────────────────────────

function renderStats(ind) {
  const price = ind.price;
  document.getElementById("priceVal").textContent = "$" + fmt(price, price > 1000 ? 0 : 4);

  const c1 = ind.price_change_1d;
  const el1 = document.getElementById("change1dVal");
  el1.textContent = fmtPct(c1);
  el1.className   = "stat-value " + (c1 >= 0 ? "up" : "down");

  const c7 = ind.price_change_7d;
  const el7 = document.getElementById("change7dVal");
  el7.textContent = fmtPct(c7);
  el7.className   = "stat-value " + (c7 >= 0 ? "up" : "down");

  document.getElementById("mcapVal").textContent = fmtBig(ind.market_cap);
}

// ── Main chart ─────────────────────────────────────────────

function renderMainChart(coinId, history, preds) {
  const ctx = document.getElementById("mainChart").getContext("2d");
  const color = COIN_COLORS[coinId] || "#7c3aed";

  const histDates  = history.map(r => r.date);
  const histPrices = history.map(r => r.price);

  const datasets = [
    {
      label: "Historical",
      data: histDates.map((d, i) => ({ x: d, y: histPrices[i] })),
      borderColor: color,
      backgroundColor: hexAlpha(color, 0.08),
      fill: true,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
    }
  ];

  if (preds && preds.models) {
    const modelKeys = ["lstm", "rf", "lr"];
    const showChk = { lstm: "chk-lstm", rf: "chk-rf", lr: "chk-lr" };
    const labels = { lstm: "Neural Net (MLP)", rf: "Random Forest", lr: "Linear Regression" };

    for (const key of modelKeys) {
      const chk = document.getElementById(showChk[key]);
      if (chk && !chk.checked) continue;

      const m = preds.models[key];
      if (!m) continue;

      const mc = MODEL_COLORS[key];
      datasets.push({
        label: labels[key] + " Forecast",
        data: m.dates.map((d, i) => ({ x: d, y: m.prices[i] })),
        borderColor: mc,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [5, 3],
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
      });

      // Confidence band
      datasets.push({
        label: labels[key] + " Upper",
        data: m.dates.map((d, i) => ({ x: d, y: m.upper[i] })),
        borderColor: "transparent",
        backgroundColor: hexAlpha(mc, 0.08),
        fill: "+1",
        tension: 0.3,
        pointRadius: 0,
      });
      datasets.push({
        label: labels[key] + " Lower",
        data: m.dates.map((d, i) => ({ x: d, y: m.lower[i] })),
        borderColor: "transparent",
        backgroundColor: hexAlpha(mc, 0.08),
        fill: false,
        tension: 0.3,
        pointRadius: 0,
      });
    }
  }

  if (mainChart) mainChart.destroy();
  mainChart = new Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          type: "category",
          ticks: {
            color: "#64748b",
            maxTicksLimit: 10,
            font: { size: 10, family: "JetBrains Mono" },
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        },
        y: {
          ticks: {
            color: "#64748b",
            font: { size: 10, family: "JetBrains Mono" },
            callback: v => "$" + fmtK(v),
          },
          grid: { color: "rgba(255,255,255,0.04)" },
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(13,22,39,0.95)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
          titleFont: { family: "Inter", weight: "700" },
          bodyFont: { family: "JetBrains Mono", size: 11 },
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label.includes("Upper") || ctx.dataset.label.includes("Lower")) return null;
              return ` ${ctx.dataset.label}: $${fmt(ctx.parsed.y, ctx.parsed.y > 100 ? 2 : 4)}`;
            }
          }
        }
      }
    }
  });
}

// ── RSI Gauge ──────────────────────────────────────────────

function renderRSI(ind) {
  const rsi = ind.rsi || 50;
  const label = rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral";
  const color = rsi > 70 ? "#ef4444" : rsi < 30 ? "#10b981" : "#a78bfa";

  document.getElementById("rsiVal").textContent   = fmt(rsi, 1);
  document.getElementById("rsiVal").style.color    = color;
  document.getElementById("rsiLabel").textContent  = label;
  document.getElementById("rsiLabel").style.color  = color;

  const ctx = document.getElementById("rsiChart").getContext("2d");
  if (rsiChart) rsiChart.destroy();

  rsiChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      datasets: [{
        data: [rsi, 100 - rsi],
        backgroundColor: [color, "rgba(255,255,255,0.06)"],
        borderWidth: 0,
        circumference: 270,
        rotation: -135,
      }]
    },
    options: {
      responsive: false,
      cutout: "72%",
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      animation: { duration: 600 },
    }
  });
}

// ── MACD Chart ─────────────────────────────────────────────

function renderMACD(ind) {
  const ctx    = document.getElementById("macdChart").getContext("2d");
  const dates  = ind.history?.dates  || [];
  const macd   = ind.history?.macd   || [];
  const signal = ind.history?.macd_signal || [];
  const diff   = macd.map((v, i) => (v || 0) - (signal[i] || 0));

  if (macdChart) macdChart.destroy();
  macdChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: dates,
      datasets: [
        {
          type: "line",
          label: "MACD",
          data: macd,
          borderColor: MODEL_COLORS.rf,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Signal",
          data: signal,
          borderColor: MODEL_COLORS.lstm,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.3,
          yAxisID: "y",
        },
        {
          type: "bar",
          label: "Histogram",
          data: diff,
          backgroundColor: diff.map(v => v >= 0 ? hexAlpha("#10b981", 0.5) : hexAlpha("#ef4444", 0.5)),
          yAxisID: "y",
        }
      ]
    },
    options: compactChartOptions(),
  });
}

// ── Bollinger Bands Chart ──────────────────────────────────

function renderBB(history) {
  const ctx  = document.getElementById("bbChart").getContext("2d");
  const last = history.slice(-90);
  const dates  = last.map(r => r.date);
  const prices = last.map(r => r.price);
  const upper  = last.map(r => r.bb_upper);
  const lower  = last.map(r => r.bb_lower);
  const mavg   = last.map(r => r.bb_mavg);

  if (bbChart) bbChart.destroy();
  bbChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        { label: "Upper",  data: upper,  borderColor: hexAlpha("#ef4444", 0.6), borderWidth: 1, pointRadius: 0, fill: "+2", backgroundColor: hexAlpha("#ef4444", 0.05), tension: 0.3 },
        { label: "MA",     data: mavg,   borderColor: "#64748b", borderWidth: 1, pointRadius: 0, borderDash: [4,3], tension: 0.3 },
        { label: "Lower",  data: lower,  borderColor: hexAlpha("#10b981", 0.6), borderWidth: 1, pointRadius: 0, tension: 0.3 },
        { label: "Price",  data: prices, borderColor: "#e2e8f0", borderWidth: 1.5, pointRadius: 0, tension: 0.3 },
      ]
    },
    options: compactChartOptions(),
  });
}

// ── Market Cap Chart ───────────────────────────────────────

function renderMcap(history) {
  const ctx  = document.getElementById("mcapChart").getContext("2d");
  const last = history.slice(-90);
  const dates = last.map(r => r.date);
  const mcap  = last.map(r => r.market_cap);

  if (mcapChart) mcapChart.destroy();
  mcapChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [{
        label: "Market Cap",
        data: mcap,
        borderColor: "#06b6d4",
        backgroundColor: hexAlpha("#06b6d4", 0.1),
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
      }]
    },
    options: {
      ...compactChartOptions(),
      scales: {
        x: { display: false },
        y: {
          ticks: { color: "#64748b", font: { size: 9, family: "JetBrains Mono" }, callback: v => fmtBig(v) },
          grid: { color: "rgba(255,255,255,0.04)" },
        }
      }
    }
  });
}

// ── Model Metrics ──────────────────────────────────────────

function renderMetrics(metrics) {
  const grid = document.getElementById("metricsGrid");
  grid.innerHTML = "";

  const modelLabels = { lstm: "Neural Net (MLP)", rf: "Random Forest", lr: "Linear Regression" };
  const colors      = { lstm: MODEL_COLORS.lstm, rf: MODEL_COLORS.rf, lr: MODEL_COLORS.lr };

  for (const [key, m] of Object.entries(metrics)) {
    if (!m || !Object.keys(m).length) continue;
    const block = document.createElement("div");
    block.className = "metric-block";
    block.innerHTML = `
      <div class="metric-block-title" style="color:${colors[key]}">${modelLabels[key] || key}</div>
      <div class="metric-row">
        <span class="metric-key">MAE</span>
        <span class="metric-val">${fmt(m.mae, 4)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-key">RMSE</span>
        <span class="metric-val">${fmt(m.rmse, 4)}</span>
      </div>
      <div class="metric-row">
        <span class="metric-key">R² Score</span>
        <span class="metric-val">${fmt(m.r2, 4)}</span>
      </div>
    `;
    grid.appendChild(block);
  }
}

// ── Overlay ────────────────────────────────────────────────

function hideOverlay() {
  document.getElementById("chartOverlay").classList.add("hidden");
}

// ── Day buttons ────────────────────────────────────────────

document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    forecastDays = parseInt(btn.dataset.days);
    if (activeCoin) selectCoin(activeCoin);
  });
});

// ── Model checkboxes ───────────────────────────────────────

["chk-lstm", "chk-rf", "chk-lr"].forEach(id => {
  document.getElementById(id).addEventListener("change", () => {
    if (activeCoin) selectCoin(activeCoin);
  });
});

// ── Helpers ────────────────────────────────────────────────

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function fmtK(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(2);
}

function compactChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { display: false },
      y: {
        ticks: { color: "#64748b", font: { size: 9, family: "JetBrains Mono" }, maxTicksLimit: 4 },
        grid: { color: "rgba(255,255,255,0.04)" },
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(13,22,39,0.95)",
        borderColor: "rgba(255,255,255,0.1)",
        borderWidth: 1,
        titleColor: "#e2e8f0",
        bodyColor: "#94a3b8",
        titleFont: { family: "Inter", size: 10 },
        bodyFont: { family: "JetBrains Mono", size: 10 },
      }
    }
  };
}

// ── Init ───────────────────────────────────────────────────

(async function init() {
  showLoading("Connecting to API…");
  await loadCoins();
  hideLoading();
  setStatus("Ready", "ready");

  // Auto-select first ready coin
  const ready = coins.find(c => c.data_ready);
  if (ready) selectCoin(ready.id);
})();
