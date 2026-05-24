/**
 * Trading Charts Dashboard
 * Responsive split-screen layout with live trading charts
 */

const API_BASE = 'http://127.0.0.1:5000/api';
const STORAGE_KEY_COUNT = 'trading-charts-count';
const STORAGE_KEY_CONFIGS = 'trading-charts-configs';
const UPDATE_INTERVAL = 5000; // Update quote every 5 seconds

let chartInstances = {};
let dataCache = {};
let updateIntervals = {};
let availableSymbols = [];

/**
 * Initialize the dashboard
 */
async function initDashboard() {
    try {
        // Fetch available symbols
        const response = await fetch(`${API_BASE}/available-symbols`);
        const data = await response.json();
        availableSymbols = data.symbols || [];

        // Get stored chart count or default to 4
        const storedCount = localStorage.getItem(STORAGE_KEY_COUNT) || '4';
        const chartCountSelector = document.getElementById('chart-count');
        chartCountSelector.value = storedCount;
        chartCountSelector.addEventListener('change', handleChartCountChange);

        // Update provider badge
        const providerResponse = await fetch(`${API_BASE}/health`);
        const providerData = await providerResponse.json();
        document.getElementById('provider-badge').textContent = `Provider: ${providerData.provider}`;

        // Create initial charts
        createCharts(parseInt(storedCount));
    } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        showError('Failed to initialize dashboard. Is the Flask server running on http://127.0.0.1:5000?');
    }
}

/**
 * Handle chart count selection change
 */
function handleChartCountChange(event) {
    const count = parseInt(event.target.value);
    localStorage.setItem(STORAGE_KEY_COUNT, count);
    createCharts(count);
}

/**
 * Create chart panes based on count
 */
function createCharts(count) {
    // Save current configs
    saveCurrentConfigs();

    // Clear existing charts
    destroyAllCharts();
    document.getElementById('charts-container').innerHTML = '';

    // Set grid layout class
    const container = document.getElementById('charts-container');
    container.className = `charts-container layout-${count}`;

    // Load saved configs or create new ones
    const configs = loadConfigs(count);

    // Create chart panes
    for (let i = 0; i < count; i++) {
        const paneId = `chart-pane-${i}`;
        const config = configs[i] || {
            symbol: availableSymbols[i % availableSymbols.length] || 'RELIANCE.NS',
            timeframe: '1h'
        };

        const paneElement = createChartPane(paneId, i, config);
        container.appendChild(paneElement);

        // Initialize chart
        initializeChart(paneId, config);
    }
}

/**
 * Create a single chart pane element
 */
function createChartPane(paneId, index, config) {
    const pane = document.createElement('div');
    pane.className = 'chart-pane';
    pane.id = paneId;
    pane.innerHTML = `
        <div class="pane-header">
            <div class="pane-title">
                <span class="symbol" id="${paneId}-symbol">${config.symbol}</span>
                <div class="pane-ticker" id="${paneId}-ticker" style="display: none;">
                    <span id="${paneId}-price">--</span>
                    <span id="${paneId}-change">--</span>
                </div>
            </div>
            <div class="pane-controls">
                <select class="pane-select" id="${paneId}-symbol-select" data-pane="${paneId}">
                    ${availableSymbols.map(s => `<option value="${s}" ${s === config.symbol ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
                <select class="pane-select" id="${paneId}-timeframe-select" data-pane="${paneId}">
                    <option value="1m" ${config.timeframe === '1m' ? 'selected' : ''}>1m</option>
                    <option value="5m" ${config.timeframe === '5m' ? 'selected' : ''}>5m</option>
                    <option value="15m" ${config.timeframe === '15m' ? 'selected' : ''}>15m</option>
                    <option value="1h" ${config.timeframe === '1h' ? 'selected' : ''}>1h</option>
                    <option value="1d" ${config.timeframe === '1d' ? 'selected' : ''}>1d</option>
                    <option value="1w" ${config.timeframe === '1w' ? 'selected' : ''}>1w</option>
                </select>
            </div>
        </div>
        <div class="chart-content">
            <div class="chart-loading active" id="${paneId}-loading">
                <div class="spinner"></div>
                <div>Loading...</div>
            </div>
            <div class="chart-wrapper" id="${paneId}-wrapper"></div>
        </div>
    `;

    // Add event listeners
    const symbolSelect = pane.querySelector(`#${paneId}-symbol-select`);
    const timeframeSelect = pane.querySelector(`#${paneId}-timeframe-select`);

    symbolSelect.addEventListener('change', (e) => handleSymbolChange(paneId, e.target.value));
    timeframeSelect.addEventListener('change', (e) => handleTimeframeChange(paneId, e.target.value));

    return pane;
}

/**
 * Initialize a single chart
 */
async function initializeChart(paneId, config) {
    try {
        const wrapper = document.getElementById(`${paneId}-wrapper`);
        const loading = document.getElementById(`${paneId}-loading`);

        if (!wrapper) return;

        // Create chart container
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '100%';
        wrapper.appendChild(container);

        // Create Lightweight Chart
        const chart = LightweightCharts.createChart(container, {
            layout: {
                background: { color: '#0e1117' },
                textColor: '#c9d1d9',
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            grid: {
                vertLines: { color: '#21262d' },
                horzLines: { color: '#21262d' },
            },
        });

        const candleseries = chart.addCandlestickSeries({
            upColor: '#3fb950',
            downColor: '#f85149',
            borderUpColor: '#3fb950',
            borderDownColor: '#f85149',
            wickUpColor: '#3fb950',
            wickDownColor: '#f85149',
        });

        // Store instance
        chartInstances[paneId] = { chart, candleseries, config };

        // Fetch and load data
        await loadChartData(paneId, config.symbol, config.timeframe);

        // Update quote periodically
        clearInterval(updateIntervals[paneId]);
        updateQuote(paneId, config.symbol);
        updateIntervals[paneId] = setInterval(() => {
            updateQuote(paneId, config.symbol);
        }, UPDATE_INTERVAL);

        // Hide loading
        loading.classList.remove('active');

        // Fit content
        setTimeout(() => {
            chart.timeScale().fitContent();
        }, 100);
    } catch (error) {
        console.error(`Failed to initialize chart ${paneId}:`, error);
    }
}

/**
 * Load chart data from API
 */
async function loadChartData(paneId, symbol, timeframe) {
    try {
        const response = await fetch(`${API_BASE}/chart-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, timeframe, limit: 100 })
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        const data = result.data || [];
        const instance = chartInstances[paneId];

        if (instance && data.length > 0) {
            instance.candleseries.setData(data);
            dataCache[paneId] = data;
        }
    } catch (error) {
        console.error(`Error loading chart data for ${paneId}:`, error);
    }
}

/**
 * Update quote and ticker
 */
async function updateQuote(paneId, symbol) {
    try {
        const response = await fetch(`${API_BASE}/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        });

        const result = await response.json();

        if (result.error) {
            console.error(`Error fetching quote for ${symbol}:`, result.error);
            return;
        }

        const quote = result.quote || {};
        const priceEl = document.getElementById(`${paneId}-price`);
        const changeEl = document.getElementById(`${paneId}-change`);
        const tickerEl = document.getElementById(`${paneId}-ticker`);

        if (priceEl && changeEl && tickerEl) {
            const price = quote.price || 0;
            const change = quote.change || 0;
            const changePercent = quote.change_percent || 0;

            priceEl.textContent = `₹${price.toFixed(2)}`;
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;

            // Update ticker styling
            tickerEl.className = 'pane-ticker';
            if (change > 0) {
                tickerEl.classList.add('up', 'flash');
            } else if (change < 0) {
                tickerEl.classList.add('down', 'flash');
            } else {
                tickerEl.classList.add('neutral');
            }

            tickerEl.style.display = 'inline-flex';

            // Remove flash animation class after animation completes
            setTimeout(() => {
                tickerEl.classList.remove('flash');
            }, 400);
        }
    } catch (error) {
        console.error(`Error updating quote for ${paneId}:`, error);
    }
}

/**
 * Handle symbol change
 */
async function handleSymbolChange(paneId, newSymbol) {
    if (chartInstances[paneId]) {
        chartInstances[paneId].config.symbol = newSymbol;
        document.getElementById(`${paneId}-symbol`).textContent = newSymbol;
        const timeframe = chartInstances[paneId].config.timeframe;
        await loadChartData(paneId, newSymbol, timeframe);
        updateQuote(paneId, newSymbol);
    }
}

/**
 * Handle timeframe change
 */
async function handleTimeframeChange(paneId, newTimeframe) {
    if (chartInstances[paneId]) {
        chartInstances[paneId].config.timeframe = newTimeframe;
        const symbol = chartInstances[paneId].config.symbol;
        await loadChartData(paneId, symbol, newTimeframe);
    }
}

/**
 * Save current chart configurations to localStorage
 */
function saveCurrentConfigs() {
    const configs = {};
    Object.entries(chartInstances).forEach(([paneId, instance]) => {
        configs[paneId] = instance.config;
    });
    localStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(configs));
}

/**
 * Load saved configurations or create defaults
 */
function loadConfigs(count) {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIGS);
    const allConfigs = saved ? JSON.parse(saved) : {};
    const configs = {};

    for (let i = 0; i < count; i++) {
        const paneId = `chart-pane-${i}`;
        configs[i] = allConfigs[paneId] || {
            symbol: availableSymbols[i % availableSymbols.length] || 'RELIANCE.NS',
            timeframe: '1h'
        };
    }

    return configs;
}

/**
 * Destroy all chart instances
 */
function destroyAllCharts() {
    Object.entries(updateIntervals).forEach(([paneId, intervalId]) => {
        clearInterval(intervalId);
    });
    updateIntervals = {};

    Object.entries(chartInstances).forEach(([paneId, instance]) => {
        try {
            instance.chart.remove();
        } catch (e) {
            console.warn(`Failed to remove chart ${paneId}:`, e);
        }
    });
    chartInstances = {};
    dataCache = {};
}

/**
 * Show error message
 */
function showError(message) {
    const container = document.getElementById('charts-container');
    container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: #f85149;">
            <h2>❌ Error</h2>
            <p>${message}</p>
            <p style="margin-top: 1rem; color: #8b949e; font-size: 0.9rem;">
                Make sure the Flask backend is running: <code>python backend/app.py</code>
            </p>
        </div>
    `;
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', initDashboard);

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', saveCurrentConfigs);
