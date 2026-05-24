"""Flask backend for trading charts dashboard.
Bridges data sources (yfinance, Apca, Binance, etc.) to the browser.
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
from datetime import datetime, timedelta
import traceback

# Import the data source (pluggable)
from data_source import get_data_provider

app = Flask(__name__)
CORS(app)

# Get the configured data provider
data_provider = get_data_provider()


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'provider': data_provider.__class__.__name__})


@app.route('/api/available-symbols', methods=['GET'])
def available_symbols():
    """Return available trading symbols for the current data provider."""
    try:
        symbols = data_provider.get_available_symbols()
        return jsonify({'symbols': symbols})
    except Exception as e:
        print(f"Error fetching symbols: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/chart-data', methods=['POST'])
def chart_data():
    """
    Fetch chart data for a specific symbol and timeframe.
    
    Expected JSON payload:
    {
        "symbol": "RELIANCE.NS",
        "timeframe": "1h",  # 1m, 5m, 15m, 1h, 1d, 1w, 1mo
        "limit": 100        # number of bars to fetch (optional, default 100)
    }
    """
    try:
        payload = request.json
        symbol = payload.get('symbol')
        timeframe = payload.get('timeframe', '1h')
        limit = payload.get('limit', 100)

        if not symbol:
            return jsonify({'error': 'symbol is required'}), 400

        data = data_provider.get_ohlcv(
            symbol=symbol,
            timeframe=timeframe,
            limit=limit
        )

        return jsonify({
            'symbol': symbol,
            'timeframe': timeframe,
            'data': data,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"Error fetching chart data: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/quote', methods=['POST'])
def quote():
    """
    Fetch current price quote for a symbol.
    
    Expected JSON payload:
    {
        "symbol": "RELIANCE.NS"
    }
    """
    try:
        payload = request.json
        symbol = payload.get('symbol')

        if not symbol:
            return jsonify({'error': 'symbol is required'}), 400

        quote_data = data_provider.get_quote(symbol)

        return jsonify({
            'symbol': symbol,
            'quote': quote_data,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        print(f"Error fetching quote: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print(f"Starting Flask app with data provider: {data_provider.__class__.__name__}")
    app.run(debug=True, host='127.0.0.1', port=5000)
