"""
run.py
------
One-click launcher:
  python run.py              -> fetch data + train models + start server
  python run.py --fetch-only -> only download data
  python run.py --train-only -> only train (data must exist)
  python run.py --serve-only -> only start API server
"""

import sys
import os
import argparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)


def main():
    parser = argparse.ArgumentParser(description="Crypto ML Prediction System")
    parser.add_argument("--fetch-only",  action="store_true")
    parser.add_argument("--train-only",  action="store_true")
    parser.add_argument("--serve-only",  action="store_true")
    parser.add_argument("--no-fetch",    action="store_true", help="Skip data fetch")
    parser.add_argument("--no-train",    action="store_true", help="Skip model training")
    parser.add_argument("--port",        type=int, default=8000)
    args = parser.parse_args()

    do_fetch = not (args.train_only or args.serve_only or args.no_fetch)
    do_train = not (args.fetch_only or args.serve_only or args.no_train)
    do_serve = not (args.fetch_only or args.train_only)

    banner = """
+======================================================+
|     Crypto ML Prediction System                   |
|   BTC · ETH · BNB · SOL · XRP                      |
+======================================================+
"""
    print(banner)

    if do_fetch:
        print("━━━ [1/3] Fetching historical data from CoinGecko ━━━")
        from backend.fetch_data import fetch_all
        fetch_all()

    if do_train:
        print("\n━━━ [2/3] Training ML models ━━━")
        from backend.train_models import train_all
        train_all()

    if do_serve:
        print(f"\n━━━ [3/3] Starting API server on http://localhost:{args.port} ━━━")
        print("   Open http://localhost:{} in your browser ".format(args.port))
        import uvicorn
        uvicorn.run("backend.api:app", host="0.0.0.0", port=args.port, reload=False)


if __name__ == "__main__":
    main()
