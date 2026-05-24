"""Pluggable data source architecture.
Switch data providers by changing the DATA_PROVIDER setting.
Each provider must implement the DataProvider interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any
import os


class DataProvider(ABC):
    """Base interface for all data providers."""

    @abstractmethod
    def get_available_symbols(self) -> List[str]:
        """Return list of available trading symbols."""
        pass

    @abstractmethod
    def get_ohlcv(self, symbol: str, timeframe: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get OHLCV (Open, High, Low, Close, Volume) data.
        
        Args:
            symbol: Trading symbol (e.g., 'RELIANCE.NS')
            timeframe: Time interval ('1m', '5m', '15m', '1h', '1d', '1w', '1mo')
            limit: Number of bars to fetch
            
        Returns:
            List of dicts with keys: time, open, high, low, close, volume
        """
        pass

    @abstractmethod
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """
        Get current price quote for a symbol.
        
        Returns:
            Dict with keys: price, change, change_percent, timestamp
        """
        pass


class YFinanceProvider(DataProvider):
    """Data provider using yfinance for Indian stocks and global markets."""

    def __init__(self):
        try:
            import yfinance as yf
            self.yf = yf
        except ImportError:
            raise ImportError("yfinance not installed. Run: pip install yfinance")

    def get_available_symbols(self) -> List[str]:
        """Return popular Indian stock symbols."""
        return [
            'RELIANCE.NS', 'TCS.NS', 'INFOSY.NS', 'WIPRO.NS', 'HDFC.NS',
            'ICICIBANK.NS', 'LTIM.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS', 'ASIANPAINT.NS',
            'SUNPHARMA.NS', 'DMARUTI.NS', 'POWERGRID.NS', 'BHARTIARTL.NS', 'ITC.NS',
            'NESTLEIND.NS', 'TECHM.NS', 'LT.NS', 'M&M.NS', 'JSWSTEEL.NS'
        ]

    def get_ohlcv(self, symbol: str, timeframe: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Fetch OHLCV data from yfinance."""
        try:
            # Map timeframe to yfinance interval
            interval_map = {
                '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
                '1h': '1h', '1d': '1d', '1w': '1wk', '1mo': '1mo'
            }
            interval = interval_map.get(timeframe, '1h')

            # Fetch data
            ticker = self.yf.Ticker(symbol)
            df = ticker.history(interval=interval, period='max')

            if df.empty:
                return []

            # Convert to our format and limit
            data = []
            for idx, row in df.tail(limit).iterrows():
                data.append({
                    'time': int(idx.timestamp()),
                    'open': round(float(row['Open']), 2),
                    'high': round(float(row['High']), 2),
                    'low': round(float(row['Low']), 2),
                    'close': round(float(row['Close']), 2),
                    'volume': int(row['Volume']) if 'Volume' in row else 0
                })

            return data

        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return []

    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get current quote for a symbol."""
        try:
            ticker = self.yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period='1d')

            if hist.empty:
                return {'price': 0, 'change': 0, 'change_percent': 0}

            current_price = float(info.get('currentPrice', hist['Close'].iloc[-1]))
            prev_price = float(hist['Close'].iloc[-2]) if len(hist) > 1 else current_price
            change = round(current_price - prev_price, 2)
            change_percent = round((change / prev_price * 100), 2) if prev_price != 0 else 0

            return {
                'price': round(current_price, 2),
                'change': change,
                'change_percent': change_percent,
                'timestamp': hist.index[-1].isoformat()
            }

        except Exception as e:
            print(f"Error fetching quote for {symbol}: {e}")
            return {'price': 0, 'change': 0, 'change_percent': 0}


# TODO: Add more providers as needed
# class ApacaProvider(DataProvider):
#     """Data provider for Alpaca Markets."""
#     pass
#
# class BinanceProvider(DataProvider):
#     """Data provider for Binance crypto."""
#     pass
#
# class ZerodhaProvider(DataProvider):
#     """Data provider for Zerodha (Indian broker)."""
#     pass
#
# class PolygonProvider(DataProvider):
#     """Data provider for Polygon.io."""
#     pass


def get_data_provider() -> DataProvider:
    """
    Factory function to get the configured data provider.
    Change DATA_PROVIDER env var or modify here to switch providers.
    """
    provider_name = os.getenv('DATA_PROVIDER', 'yfinance').lower()

    providers = {
        'yfinance': YFinanceProvider,
        # 'alpaca': ApacaProvider,
        # 'binance': BinanceProvider,
        # 'zerodha': ZerodhaProvider,
        # 'polygon': PolygonProvider,
    }

    if provider_name not in providers:
        raise ValueError(f"Unknown data provider: {provider_name}. Available: {list(providers.keys())}")

    return providers[provider_name]()
