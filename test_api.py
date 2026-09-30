import requests, json

base = 'http://localhost:8000'

print('=== /coins ===')
coins = requests.get(f'{base}/coins').json()
for c in coins:
    tick = c["ticker"]
    dr   = c["data_ready"]
    mr   = c["model_ready"]
    print(f'  {tick}: data={dr} models={mr}')

print('\n=== /history/bitcoin (last 3 rows) ===')
hist = requests.get(f'{base}/history/bitcoin?days=10').json()
for r in hist[-3:]:
    d  = r["date"]
    p  = r["price"]
    mc = r["market_cap"] / 1e9
    print(f'  {d}  price=${p:,.0f}  mcap=${mc:.1f}B')

print('\n=== /indicators/bitcoin ===')
ind = requests.get(f'{base}/indicators/bitcoin').json()
rsi   = ind["rsi"]
macd  = ind["macd"]
ch1   = ind["price_change_1d"] * 100
ch7   = ind["price_change_7d"] * 100
print(f'  RSI={rsi:.1f}  MACD={macd:.0f}  1d={ch1:.2f}%  7d={ch7:.2f}%')

print('\n=== /predict/bitcoin (7-day RF forecast) ===')
pred = requests.get(f'{base}/predict/bitcoin?days=7').json()
rf = pred['models']['rf']
for i in range(len(rf['dates'])):
    dt = rf["dates"][i]
    pr = rf["prices"][i]
    lo = rf["lower"][i]
    hi = rf["upper"][i]
    print(f'  {dt}  ${pr:,.0f}  [{lo:,.0f} - {hi:,.0f}]')

print('\nAll endpoints OK!')
