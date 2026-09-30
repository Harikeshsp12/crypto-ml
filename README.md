# 🪙 Cryptocurrency Market Prediction using Machine Learning

> A full-stack predictive analytics system that studies historical cryptocurrency market capitalization trends and forecasts future coin behavior using machine learning–driven pattern recognition.

---

## 📌 Project Overview

This project implements a **Cryptocurrency Market Prediction System** that leverages machine learning models to analyze historical price data, technical indicators, and market capitalization trends for major cryptocurrencies. The system provides an interactive web dashboard for visualizing historical patterns alongside multi-model price forecasts.

### Supported Coins
| Coin | Ticker | Color |
|------|--------|-------|
| Bitcoin | BTC | 🟠 |
| Ethereum | ETH | 🔵 |
| BNB | BNB | 🟡 |
| Solana | SOL | 🟣 |
| XRP (Ripple) | XRP | 🔵 |

---

## 🎯 Key Features

- **Live Data Ingestion** — Fetches 365 days of OHLCV + market cap data from the CoinGecko public API (no API key required)
- **Feature Engineering** — Computes 19 technical indicators per day: RSI, MACD, Bollinger Bands, EMA(7), EMA(30), price momentum, and volume change
- **Multi-Model Forecasting** — Trains three distinct ML models per coin and serves their predictions with confidence bands
- **Interactive Dashboard** — A premium dark-mode web UI with Chart.js visualizations, live API integration, and model comparison tools
- **REST API Backend** — FastAPI server exposing endpoints for historical data, technical indicators, predictions, and model metrics
- **Configurable Forecast Horizon** — Switch between 7-day, 14-day, and 30-day forecast windows on the fly

---

## 🧠 Machine Learning Models

### 1. Neural Network — Multi-Layer Perceptron (MLP)
- **Architecture:** 256 → 128 → 64 fully connected layers with ReLU activation
- **Optimizer:** Adam with learning rate 0.001
- **Training:** Early stopping (20-iteration patience), 500 max epochs
- **Input:** 60-day sliding window × 19 features (flattened)
- **Purpose:** Captures non-linear temporal patterns in price sequences

### 2. Random Forest Regressor
- **Estimators:** 200 decision trees
- **Max Depth:** 15 levels
- **Input:** Same 60-day × 19-feature flattened window
- **Purpose:** Ensemble-based prediction; strongest performer (BTC R² = 0.651)
- **Bonus:** Feature importance ranking available

### 3. Linear Regression
- **Type:** Ordinary Least Squares regression
- **Input:** Same feature window
- **Purpose:** Baseline trend model for benchmarking

---

## 📊 Technical Indicators (Feature Engineering)

| Indicator | Description |
|-----------|-------------|
| **RSI (14)** | Relative Strength Index — momentum oscillator (overbought >70, oversold <30) |
| **MACD** | Moving Average Convergence Divergence — trend-following momentum indicator |
| **MACD Signal** | 9-day EMA of MACD line |
| **MACD Histogram** | Difference between MACD and Signal line |
| **Bollinger Upper** | 20-day SMA + 2 standard deviations |
| **Bollinger Lower** | 20-day SMA − 2 standard deviations |
| **Bollinger MA** | 20-day simple moving average (middle band) |
| **EMA (7)** | 7-day Exponential Moving Average |
| **EMA (30)** | 30-day Exponential Moving Average |
| **Price Change 1d** | Day-over-day percentage change |
| **Price Change 7d** | 7-day percentage change |
| **Volume Change 1d** | Day-over-day volume percentage change |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CoinGecko Public API                     │
│           (Historical OHLCV + Market Cap Data)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Data Pipeline (fetch_data.py)                 │
│     Downloads 365 days × 5 coins → CSV files in /data      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Feature Engineering (preprocess.py)               │
│  RSI · MACD · Bollinger Bands · EMAs · Momentum Features   │
│  MinMaxScaler normalization · 60-day sliding windows        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Model Training (train_models.py)               │
│    ┌─────────────┐  ┌───────────────┐  ┌───────────────┐  │
│    │  Neural Net │  │ Random Forest │  │    Linear     │  │
│    │    (MLP)    │  │  Regressor    │  │  Regression   │  │
│    └─────────────┘  └───────────────┘  └───────────────┘  │
│              Artifacts saved to /models/*.pkl               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Prediction Engine (predict.py)                 │
│   Recursive multi-step forecasting · Confidence bands       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                FastAPI Backend (api.py)                     │
│  GET /coins · /history · /indicators · /predict · /metrics  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Web Dashboard (HTML + CSS + JS)                   │
│   Price Chart · RSI Gauge · MACD · Bollinger Bands         │
│   Market Cap Trend · Model Comparison · Metrics Panel       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
crypto-ml/
│
├── data/                        # Downloaded historical CSV files
│   ├── bitcoin.csv              # 366 rows × (price, volume, mcap, OHLC)
│   ├── ethereum.csv
│   ├── binancecoin.csv
│   ├── solana.csv
│   └── ripple.csv
│
├── models/                      # Trained model artifacts
│   ├── bitcoin_neural_net.pkl   # MLP model
│   ├── bitcoin_rf.pkl           # Random Forest model
│   ├── bitcoin_lr.pkl           # Linear Regression model
│   ├── bitcoin_scaler.pkl       # MinMaxScaler for inverse transform
│   ├── bitcoin_metrics.json     # MAE, RMSE, R² evaluation metrics
│   └── ... (same for each coin)
│
├── backend/
│   ├── __init__.py
│   ├── fetch_data.py            # CoinGecko API downloader
│   ├── preprocess.py            # Feature engineering pipeline
│   ├── train_models.py          # ML model training (MLP + RF + LR)
│   ├── predict.py               # Recursive multi-step forecasting engine
│   └── api.py                   # FastAPI server with 5 REST endpoints
│
├── frontend/
│   ├── index.html               # Dashboard layout & structure
│   ├── styles.css               # Premium dark glassmorphism theme
│   └── app.js                   # Chart.js charts + live API integration
│
├── requirements.txt             # Python dependencies
└── run.py                       # One-click launcher
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.10 or higher
- pip package manager
- Internet connection (for initial data fetch from CoinGecko)

### Step 1 — Clone or download the project

```bash
cd crypto-ml
```

### Step 2 — Install dependencies

```bash
pip install -r requirements.txt
```

**Key packages:**
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.111.0 | REST API backend |
| `uvicorn` | 0.29.0 | ASGI server |
| `pandas` | 2.2.2 | Data manipulation |
| `numpy` | 1.26.4 | Numerical computing |
| `scikit-learn` | 1.4.2 | ML models (MLP, RF, LR) |
| `ta` | 0.11.0 | Technical indicator computation |
| `requests` | 2.31.0 | CoinGecko API calls |

### Step 3 — Run the full pipeline

```bash
python run.py
```

This automatically:
1. Downloads 365 days of historical data for all 5 coins
2. Trains all 3 ML models per coin (saves to `/models`)
3. Starts the web server at `http://localhost:8000`

### Step 4 — Open the Dashboard

```
http://localhost:8000
```

---

## 🚀 Usage Guide

### One-Click Launch (Recommended)

```bash
# Full pipeline: fetch data + train models + start server
python run.py

# Skip data fetch (use existing CSVs)
python run.py --no-fetch

# Skip training (use existing models)
python run.py --no-train

# Server only (data + models already exist)
python run.py --no-fetch --no-train
```

### Individual Steps

```bash
# Step 1: Download fresh market data
python -m backend.fetch_data

# Step 2: Train / retrain all models
python -m backend.train_models

# Step 3: Start API server only
python -m backend.api
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/coins` | List all supported coins with readiness status |
| `GET` | `/history/{coin}?days=365` | Historical OHLCV + market cap data |
| `GET` | `/indicators/{coin}` | Latest RSI, MACD, Bollinger Bands values |
| `GET` | `/predict/{coin}?days=30` | ML-driven price forecast (all 3 models) |
| `GET` | `/metrics/{coin}` | Model evaluation metrics (MAE, RMSE, R²) |
| `GET` | `/status` | Data & model availability per coin |

### Example Response — `/predict/bitcoin?days=7`

```json
{
  "coin": "bitcoin",
  "last_date": "2026-09-30",
  "last_price": 83602.0,
  "days": 7,
  "models": {
    "lstm": {
      "dates": ["2026-10-01", "2026-10-02", "..."],
      "prices": [82100.5, 81900.2, "..."],
      "lower":  [81800.0, 81500.0, "..."],
      "upper":  [82400.0, 82300.0, "..."]
    },
    "rf": { "..." },
    "lr": { "..." }
  }
}
```

---

## 📈 Model Performance (Bitcoin — Test Set)

| Model | MAE ↓ | RMSE ↓ | R² ↑ |
|-------|--------|--------|------|
| **Random Forest** | **0.0343** | **0.0455** | **0.651** |
| Neural Net (MLP) | 0.0519 | 0.0680 | 0.219 |
| Linear Regression | 0.0717 | 0.0893 | -0.348 |

> **Note:** Metrics are computed on normalised price values (MinMax scaled). R² > 0 indicates the model beats a simple mean baseline. Random Forest achieves the highest R² of 0.651 on Bitcoin.

---

## 🖥️ Dashboard Panels

| Panel | Description |
|-------|-------------|
| **Coin Sidebar** | Select BTC, ETH, BNB, SOL, XRP — shows data & model readiness |
| **Forecast Horizon** | Toggle between 7-day, 14-day, 30-day predictions |
| **Model Toggles** | Show/hide Neural Net, Random Forest, Linear Regression overlays |
| **Price Chart** | 180-day historical prices + multi-model forecast lines with 95% confidence bands |
| **RSI Gauge** | Circular dial — green (oversold <30), red (overbought >70), purple (neutral) |
| **MACD Chart** | MACD line vs signal line + histogram bars showing momentum direction |
| **Bollinger Bands** | Price channel with upper/lower bands and 20-day moving average |
| **Market Cap Trend** | 90-day market capitalization chart |
| **Metrics Panel** | Per-model MAE, RMSE, R² evaluation scores |

---

## 🔮 How Predictions Work

1. **Feature window:** The last 60 days of 19 normalised features are assembled into an input matrix
2. **Recursive forecasting:** The model predicts day `t+1`, then that prediction is fed back as input for day `t+2`, and so on
3. **Confidence bands:** Uncertainty grows with each forecast step (`±1.96σ × √horizon`) to reflect compounding uncertainty
4. **Inverse transform:** Predictions are rescaled back to real USD prices using the stored MinMaxScaler

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Data Source** | CoinGecko Public API (free, no key) |
| **Data Processing** | Python, Pandas, NumPy |
| **Technical Analysis** | `ta` library (RSI, MACD, Bollinger Bands) |
| **Machine Learning** | Scikit-learn (MLPRegressor, RandomForestRegressor, LinearRegression) |
| **API Backend** | FastAPI + Uvicorn |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES2020) |
| **Charts** | Chart.js v4.4 |
| **Typography** | Google Fonts — Inter, JetBrains Mono |

---

## 📋 Requirements

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
pandas==2.2.2
numpy==1.26.4
scikit-learn==1.4.2
ta==0.11.0
requests==2.31.0
joblib==1.4.2
httpx==0.27.0
```

---

## ⚠️ Disclaimer

> This project is intended for **educational and research purposes only**. Cryptocurrency markets are highly volatile and unpredictable. The predictions generated by this system should **not** be used as financial advice or as the sole basis for any investment decisions. Past market patterns do not guarantee future results.

---

## 🔭 Future Enhancements

- [ ] Add sentiment analysis from crypto news headlines (NLP)
- [ ] Implement LSTM/GRU via ONNX runtime (CPU-compatible)
- [ ] Support portfolio-level prediction across multiple coins
- [ ] Add WebSocket-based live price streaming
- [ ] Deploy to cloud (AWS / GCP / Railway)
- [ ] Add backtesting module to evaluate strategy profitability
- [ ] Export predictions to CSV / PDF report

---

## 👤 Author

**Harikesh**
- Project: Cryptocurrency Market Prediction using Machine Learning
- Domain: Predictive Analytics · Financial Technology · Deep Learning
- Tools: Python · Scikit-learn · FastAPI · Chart.js

---

## 📄 License

This project is licensed under the **MIT License** — free to use, modify, and distribute with attribution.

---

<div align="center">
  <strong>Built with Python · scikit-learn · FastAPI · Chart.js</strong><br/>
  <em>Predicting the unpredictable — one pattern at a time.</em>
</div>
