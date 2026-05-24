# Live Trading Charts Dashboard

A responsive, configurable multi-chart trading dashboard with live Indian stock data from yfinance. No API keys, no deployment, runs entirely locally.

## Features

✅ **Responsive Grid Layout** - Dynamically reshape between 1, 2, 4, 6, or 8 charts
✅ **Live Price Data** - Real-time quotes with color-coded ticker flashing (🟢 green up, 🔴 red down)
✅ **Multiple Timeframes** - Choose from 1m, 5m, 15m, 1h, 1d, 1w timeframes per chart
✅ **Symbol Selection** - Dropdown selector with 20+ popular Indian stocks
✅ **Lightweight Charts** - Professional TradingView-style candlestick charts
✅ **Persistent State** - Remembers your last chart count and selections on page reload
✅ **Pluggable Data Sources** - Easy to swap yfinance for Alpaca, Binance, Zerodha, Polygon, etc.
✅ **No API Keys Required** - yfinance is free and unrestricted
✅ **Dark Theme** - Sleek GitHub-inspired UI

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Flask Backend

```bash
python backend/app.py
```

You should see:
```
Starting Flask app with data provider: YFinanceProvider
 * Running on http://127.0.0.1:5000
```

### 3. Open the Dashboard

Open your browser and go to:
```
http://127.0.0.1:5000
```

Or just open `frontend/index.html` directly (if the Flask server is running on port 5000).

## Usage

1. **Select Chart Count** - Use the dropdown at the top to choose 1, 2, 4, 6, or 8 charts
2. **Choose Symbols** - Each pane has a dropdown to select any symbol
3. **Pick Timeframe** - Select 1m, 5m, 15m, 1h, 1d, or 1w for each chart
4. **Watch Live Data** - Prices update every 5 seconds with color-coded changes
5. **Reload & Restore** - Your last preferences are automatically saved

## Architecture

```
trading-charts/
├── backend/
│   ├── app.py              # Flask server
│   └── data_source.py      # Pluggable data source architecture
├── frontend/
│   ├── index.html          # Dashboard HTML
│   ├── styles.css          # Dark theme CSS with responsive grid
│   └── app.js              # Client-side logic & chart management
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Pluggable Data Sources

The dashboard uses a pluggable architecture. Currently implemented:

### YFinance (Default)
Free, no API key required. Great for Indian stocks and global markets.

```python
from data_source import YFinanceProvider
```

### Add Your Own Provider

1. Create a new class in `backend/data_source.py` inheriting from `DataProvider`:

```python
class MyBrokerProvider(DataProvider):
    def get_available_symbols(self) -> List[str]:
        return ['SYMBOL1', 'SYMBOL2', ...]
    
    def get_ohlcv(self, symbol: str, timeframe: str, limit: int = 100) -> List[Dict]:
        # Fetch and return OHLCV data
        return [{...}, ...]
    
    def get_quote(self, symbol: str) -> Dict:
        # Return current price quote
        return {'price': 100.5, 'change': 0.5, 'change_percent': 0.5}
```

2. Register it in `get_data_provider()`:

```python
providers = {
    'yfinance': YFinanceProvider,
    'mybroker': MyBrokerProvider,
}
```

3. Switch via environment variable:

```bash
DATA_PROVIDER=mybroker python backend/app.py
```

### Planned Providers
- [ ] Alpaca Markets
- [ ] Binance
- [ ] Zerodha
- [ ] Polygon.io

## Available Symbols

Default symbols (Indian stocks via yfinance):

```
RELIANCE.NS    TCS.NS         INFOSY.NS       WIPRO.NS       HDFC.NS
ICICIBANK.NS   LTIM.NS        MARUTI.NS       BAJAJ-AUTO.NS  ASIANPAINT.NS
SUNPHARMA.NS   DMARUTI.NS     POWERGRID.NS    BHARTIARTL.NS  ITC.NS
NESTLEIND.NS   TECHM.NS       LT.NS           M&M.NS         JSWSTEEL.NS
```

You can add any symbol supported by yfinance (US stocks: `AAPL`, `MSFT`; Crypto: `BTC-USD`, etc.)

## API Endpoints

All endpoints run on `http://127.0.0.1:5000`

### GET /api/health
Health check and data provider info.

**Response:**
```json
{
  "status": "ok",
  "provider": "YFinanceProvider"
}
```

### GET /api/available-symbols
Get list of available trading symbols.

**Response:**
```json
{
  "symbols": ["RELIANCE.NS", "TCS.NS", ...]
}
```

### POST /api/chart-data
Fetch OHLCV data for a symbol.

**Request:**
```json
{
  "symbol": "RELIANCE.NS",
  "timeframe": "1h",
  "limit": 100
}
```

**Response:**
```json
{
  "symbol": "RELIANCE.NS",
  "timeframe": "1h",
  "data": [
    {"time": 1642084800, "open": 100.5, "high": 101.2, "low": 100.1, "close": 100.8, "volume": 1000000},
    ...
  ],
  "timestamp": "2024-05-24T10:30:00"
}
```

### POST /api/quote
Get current price quote for a symbol.

**Request:**
```json
{
  "symbol": "RELIANCE.NS"
}
```

**Response:**
```json
{
  "symbol": "RELIANCE.NS",
  "quote": {
    "price": 2850.50,
    "change": 25.50,
    "change_percent": 0.90,
    "timestamp": "2024-05-24T10:30:00"
  },
  "timestamp": "2024-05-24T10:30:00"
}
```

## Grid Layouts

The dashboard automatically applies the optimal layout for each chart count:

- **1 Chart**: Full screen (1×1)
- **2 Charts**: Side-by-side (2×1)
- **4 Charts**: 2×2 grid
- **6 Charts**: 3×2 grid
- **8 Charts**: 4×2 grid (responsive to 3×3 and 2×4 on smaller screens)

## Browser Support

- Chrome/Brave 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Lightweight Charts: ~50KB gzipped
- Real-time updates: 5-second refresh intervals
- ~2-3MB data per chart (100 candles)
- Responsive across 4K displays and mobile devices

## Troubleshooting

### "Is the Flask server running?"
Make sure you've started the backend:
```bash
python backend/app.py
```

### Charts won't load
- Check Flask server console for errors
- Verify your internet connection (yfinance needs to fetch data)
- Try a different symbol

### Slow data loading
- This is normal on first load (yfinance fetches from Yahoo servers)
- Data is cached for the session
- Subsequent updates are faster

### Wrong prices
- yfinance data may be delayed by 15-20 minutes during market hours
- Use intraday (`1m`, `5m`) data for near-real-time quotes

## Customization

### Change Update Interval
Edit `frontend/app.js`:
```javascript
const UPDATE_INTERVAL = 5000; // milliseconds
```

### Add More Symbols
Edit `backend/data_source.py` in `YFinanceProvider.get_available_symbols()`:
```python
return [
    'RELIANCE.NS',
    'MY_CUSTOM_SYMBOL',  # Add here
    ...
]
```

### Change Chart Colors
Edit `frontend/styles.css` or `frontend/app.js` chart configuration:
```javascript
const candleseries = chart.addCandlestickSeries({
    upColor: '#3fb950',      // Green
    downColor: '#f85149',    // Red
    borderUpColor: '#3fb950',
    borderDownColor: '#f85149',
});
```

## License

MIT - Free to use and modify

## Contributing

Contributions welcome! Areas to improve:
- More data providers (Alpaca, Binance, etc.)
- Real-time WebSocket updates
- Technical indicators (MA, RSI, MACD)
- Chart annotations and drawings
- Export data to CSV

## Credits

- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) by TradingView
- [yfinance](https://github.com/ranaroussi/yfinance) by Ran Aroussi
- [Flask](https://flask.palletsprojects.com/)

---

**Built with ❤️ for traders who love simplicity**
