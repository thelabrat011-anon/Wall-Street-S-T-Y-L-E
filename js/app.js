/* ============================================================
   WALL STREET STYLE — Trading Terminal Application v3.0 Pro
   Actualizaciones suaves sin pestañeos
   ============================================================ */

// ============================================================
//   DATA LAYER — Market data, watchlist, persistence
// ============================================================

// ----- Static maps for known symbols -----
const STOCK_MAP = {
    'AAPL': { name: 'Apple Inc.', sector: 'Tecnología' },
    'MSFT': { name: 'Microsoft Corp.', sector: 'Tecnología' },
    'GOOGL': { name: 'Alphabet Inc.', sector: 'Tecnología' },
    'AMZN': { name: 'Amazon.com Inc.', sector: 'Consumo' },
    'META': { name: 'Meta Platforms', sector: 'Tecnología' },
    'NVDA': { name: 'NVIDIA Corp.', sector: 'Semiconductores' },
    'TSLA': { name: 'Tesla Inc.', sector: 'Automotriz' },
    'NFLX': { name: 'Netflix Inc.', sector: 'Entretenimiento' },
    'AMD': { name: 'AMD Inc.', sector: 'Semiconductores' },
    'DIS': { name: 'Walt Disney Co.', sector: 'Entretenimiento' },
    'JPM': { name: 'JPMorgan Chase', sector: 'Finanzas' },
    'V': { name: 'Visa Inc.', sector: 'Finanzas' },
    'PG': { name: 'Procter & Gamble', sector: 'Consumo' },
    'UNH': { name: 'UnitedHealth Group', sector: 'Salud' },
    'HD': { name: 'Home Depot Inc.', sector: 'Consumo' },
    'COST': { name: 'Costco Wholesale', sector: 'Consumo' },
    'CRM': { name: 'Salesforce Inc.', sector: 'Tecnología' },
    'ADBE': { name: 'Adobe Inc.', sector: 'Tecnología' },
    'ORCL': { name: 'Oracle Corp.', sector: 'Tecnología' },
    'IBM': { name: 'IBM Corp.', sector: 'Tecnología' },
    'CSCO': { name: 'Cisco Systems', sector: 'Tecnología' },
    'QCOM': { name: 'Qualcomm Inc.', sector: 'Semiconductores' },
    'AVGO': { name: 'Broadcom Inc.', sector: 'Semiconductores' },
    'UBER': { name: 'Uber Technologies', sector: 'Transporte' },
    'ABNB': { name: 'Airbnb Inc.', sector: 'Consumo' },
    'GME': { name: 'GameStop Corp.', sector: 'Consumo' },
    'AMC': { name: 'AMC Entertainment', sector: 'Entretenimiento' },
    'SPY': { name: 'SPDR S&P 500 ETF', sector: 'ETF' },
    'QQQ': { name: 'Invesco QQQ ETF', sector: 'ETF' }
};

const INDEX_MAP = {
    '^GSPC': { name: 'S&P 500', sector: 'Índice' },
    '^IXIC': { name: 'Nasdaq Composite', sector: 'Índice' },
    '^DJI': { name: 'Dow Jones', sector: 'Índice' },
    '^RUT': { name: 'Russell 2000', sector: 'Índice' },
    '^VIX': { name: 'CBOE Volatility Index', sector: 'Volatilidad' }
};

const CRYPTO_MAP = {
    'bitcoin': { name: 'Bitcoin · BTC', sector: 'Cripto' },
    'ethereum': { name: 'Ethereum · ETH', sector: 'Cripto' },
    'solana': { name: 'Solana · SOL', sector: 'Cripto' },
    'dogecoin': { name: 'Dogecoin · DOGE', sector: 'Cripto' },
    'ripple': { name: 'XRP', sector: 'Cripto' }
};

const DEFAULT_WATCHLIST = [
    { cat: 'accion', symbol: 'AAPL' },
    { cat: 'accion', symbol: 'MSFT' },
    { cat: 'accion', symbol: 'GOOGL' },
    { cat: 'accion', symbol: 'AMZN' },
    { cat: 'accion', symbol: 'META' },
    { cat: 'accion', symbol: 'NVDA' },
    { cat: 'accion', symbol: 'TSLA' },
    { cat: 'accion', symbol: 'NFLX' },
    { cat: 'accion', symbol: 'AMD' },
    { cat: 'accion', symbol: 'DIS' },
    { cat: 'accion', symbol: 'JPM' },
    { cat: 'accion', symbol: 'V' },
    { cat: 'accion', symbol: 'PG' },
    { cat: 'accion', symbol: 'UNH' },
    { cat: 'accion', symbol: 'HD' },
    { cat: 'accion', symbol: 'COST' },
    { cat: 'accion', symbol: 'SPY' },
    { cat: 'accion', symbol: 'QQQ' },
    { cat: 'indice', symbol: '^GSPC' },
    { cat: 'indice', symbol: '^IXIC' },
    { cat: 'indice', symbol: '^DJI' },
    { cat: 'cripto', symbol: 'bitcoin' },
    { cat: 'cripto', symbol: 'ethereum' },
    { cat: 'cripto', symbol: 'solana' }
];

// ----- Persistence -----
function safeGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function safeSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// ----- State -----
let watchlist = safeGet('wallstreet_watchlist', DEFAULT_WATCHLIST);
let alerts = safeGet('wallstreet_alerts', {});
let theme = safeGet('wallstreet_theme', 'dark');
let extraMeta = safeGet('wallstreet_extrameta', {});
let portfolio = safeGet('wallstreet_portfolio', { positions: {}, cash: 10000 });

let dataStore = {};
let activeCat = 'todos';
let searchTerm = '';
let sortMode = 'default';
let refreshTimer = null;
let chartUpdateInterval = null;
let chartItem = null;
let chartRange = '1D';

// ----- Helpers -----
function esc(str) {
    if (!str) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

function keyOf(item) { return item.cat + ':' + item.symbol; }

function metaFor(item) {
    const stored = extraMeta[keyOf(item)];
    if (stored) return stored;
    if (item.cat === 'accion') return STOCK_MAP[item.symbol] || { name: item.symbol, sector: '—' };
    if (item.cat === 'indice') return INDEX_MAP[item.symbol] || { name: item.symbol, sector: '—' };
    return CRYPTO_MAP[item.symbol] || { name: item.symbol, sector: 'Cripto' };
}

function formatCurrency(value) {
    return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(value) {
    if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(1) + 'M';
    if (Math.abs(value) >= 1e3) return (value / 1e3).toFixed(1) + 'K';
    return value.toFixed(2);
}

// ----- Toast System -----
function showToast(msg, type = 'info') {
    const wrap = document.getElementById('toastWrap');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
    wrap.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(30px)';
        setTimeout(() => t.remove(), 300);
    }, 5000);
}

// ============================================================
//   DATA FETCHING
// ============================================================

async function fetchJsonWithFallback(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('http ' + res.status);
        return await res.json();
    } catch (e) {
        const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res2 = await fetch(proxied);
        if (!res2.ok) throw new Error('proxy failed');
        return await res2.json();
    }
}

async function fetchYahoo(symbol) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=15m&range=1d`;
    return fetchJsonWithFallback(url);
}

async function fetchYahooHistory(symbol, range = '1d') {
    const intervals = { '1D': '15m', '5D': '1h', '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1d', 'ALL': '1wk' };
    const interval = intervals[range] || '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range === 'ALL' ? 'max' : range}`;
    return fetchJsonWithFallback(url);
}

async function searchYahoo(query) {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const json = await fetchJsonWithFallback(url);
    return (json.quotes || [])
        .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'INDEX'))
        .map(q => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exch: q.exchDisp || q.exchange || '',
            cat: q.quoteType === 'INDEX' ? 'indice' : 'accion'
        }));
}

async function searchCoingecko(query) {
    const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const json = await fetchJsonWithFallback(url);
    return (json.coins || []).slice(0, 8).map(c => ({
        symbol: c.id,
        name: `${c.name} · ${(c.symbol || '').toUpperCase()}`,
        exch: 'Cripto',
        cat: 'cripto'
    }));
}

async function fetchOptionChain(symbol, date) {
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}${date ? '?date=' + date : ''}`;
    const json = await fetchJsonWithFallback(url);
    const result = json.optionChain?.result?.[0];
    if (!result) throw new Error('sin datos');
    return result;
}

function extractOhlc(quote, limit) {
    if (!quote) return [];
    const { close = [], open = [], high = [], low = [] } = quote;
    const ohlc = [];
    for (let i = 0; i < close.length; i++) {
        if (open[i] != null && high[i] != null && low[i] != null && close[i] != null) {
            ohlc.push({ open: open[i], high: high[i], low: low[i], close: close[i] });
        }
    }
    return ohlc.slice(-limit);
}

async function loadStockOrIndex(item) {
    try {
        const json = await fetchYahoo(item.symbol);
        const result = json.chart.result[0];
        const meta = result.meta;
        const quote = result.indicators.quote[0];
        const ohlc = extractOhlc(quote, 30);
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose ?? meta.chartPreviousClose;
        const change = price - prevClose;
        const changePct = (change / prevClose) * 100;
        const m = metaFor(item);
        const volume = quote.volume?.[quote.volume.length - 1] || null;
        return { ok: true, name: m.name, sector: m.sector, price, change, changePct, spark: ohlc.map(c => c.close), ohlc, volume, high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow };
    } catch (e) { return { ok: false }; }
}

async function loadStockHistory(symbol, range) {
    try {
        const json = await fetchYahooHistory(symbol, range);
        const result = json.chart.result[0];
        const quote = result.indicators.quote[0];
        return extractOhlc(quote, 1000);
    } catch (e) { return []; }
}

async function loadCryptoOhlc(id, days = 1) {
    try {
        const url = `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
        const res = await fetch(url);
        const arr = await res.json();
        const limit = days === 1 ? 24 : days === 7 ? 168 : days === 30 ? 720 : 1000;
        return arr.slice(-limit).map(row => ({ open: row[1], high: row[2], low: row[3], close: row[4] }));
    } catch (e) { return null; }
}

async function loadCryptoBatch(ids) {
    if (ids.length === 0) return {};
    try {
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&sparkline=true&price_change_percentage=24h`;
        const res = await fetch(url);
        const arr = await res.json();
        const out = {};
        arr.forEach(c => {
            const m = CRYPTO_MAP[c.id] || { name: c.name, sector: 'Cripto' };
            out[c.id] = {
                ok: true,
                name: m.name,
                sector: m.sector,
                price: c.current_price,
                change: c.price_change_24h,
                changePct: c.price_change_percentage_24h,
                spark: (c.sparkline_in_7d?.price || []).slice(-30),
                volume: c.total_volume,
                high: c.high_24h,
                low: c.low_24h
            };
        });
        return out;
    } catch (e) { return {}; }
}

// ----- Market Status -----
function updateMarketStatus() {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = hours + ':' + String(minutes).padStart(2, '0');
    
    const statusEl = document.getElementById('marketStatus');
    const footerStatus = document.getElementById('marketStatusFooter');
    
    let status = '🔴 Cerrado';
    let cls = '';
    
    if (day >= 1 && day <= 5) {
        if (timeStr >= '09:30' && timeStr < '16:00') {
            status = '🟢 Abierto';
            cls = 'open';
        } else if (timeStr >= '04:00' && timeStr < '09:30') {
            status = '🟡 Pre-Market';
            cls = 'pre';
        } else if (timeStr >= '16:00' && timeStr < '20:00') {
            status = '🟡 After-Hours';
            cls = 'pre';
        }
    }
    
    if (statusEl) {
        statusEl.textContent = status;
        statusEl.className = 'market-status' + (cls ? ' ' + cls : '');
    }
    if (footerStatus) {
        footerStatus.textContent = 'Mercado: ' + status.replace(/[🟢🟡🔴]/g, '').trim();
    }
}

// ----- Actualización suave (sin pestañeo) -----
function updateDataSmoothly() {
    const grid = document.getElementById('grid');
    const cards = grid.querySelectorAll('.card');
    
    cards.forEach(card => {
        const key = card.dataset.key;
        if (!key) return;
        const d = dataStore[key];
        if (!d) return;
        
        // Actualizar precio
        const priceEl = card.querySelector('.card-price');
        if (priceEl) {
            priceEl.textContent = d.price.toLocaleString('en-US', { maximumFractionDigits: d.price < 5 ? 4 : 2 });
        }
        
        // Actualizar cambio
        const changeEl = card.querySelector('.card-change');
        if (changeEl) {
            const isUp = d.change >= 0;
            changeEl.className = `card-change ${isUp ? 'up' : 'down'}`;
            changeEl.innerHTML = `<span class="change-glow">${isUp ? '▲' : '▼'} ${Math.abs(d.change).toFixed(2)} (${Math.abs(d.changePct).toFixed(2)}%)</span>`;
        }
        
        // Actualizar volumen
        const volEl = card.querySelector('.card-volume');
        if (volEl && d.volume) {
            volEl.textContent = `Vol: ${formatCompact(d.volume)}`;
        }
    });
}

async function refreshAll() {
    const stockIndexItems = watchlist.filter(i => i.cat === 'accion' || i.cat === 'indice');
    const cryptoItems = watchlist.filter(i => i.cat === 'cripto');

    const results = await Promise.all(stockIndexItems.map(loadStockOrIndex));
    stockIndexItems.forEach((item, idx) => { if (results[idx].ok) mergeData(item, results[idx]); });

    const cryptoData = await loadCryptoBatch(cryptoItems.map(i => i.symbol));
    cryptoItems.forEach(item => { const r = cryptoData[item.symbol]; if (r?.ok) mergeData(item, r); });

    // Actualizar sparklines
    const cryptoOhlcResults = await Promise.all(cryptoItems.map(i => loadCryptoOhlc(i.symbol)));
    cryptoItems.forEach((item, idx) => {
        const ohlc = cryptoOhlcResults[idx];
        if (ohlc?.length > 1 && dataStore[keyOf(item)]) {
            dataStore[keyOf(item)].ohlc = ohlc;
            dataStore[keyOf(item)].spark = ohlc.map(c => c.close);
        }
    });

    checkAlerts();
    
    // Actualizar UI de forma suave
    updateDataSmoothly();
    renderStats();
    renderTicker();
    updateMarketStatus();
    
    document.getElementById('lastUpdated').textContent = '🔄 ' + new Date().toLocaleTimeString('es-ES');
    document.getElementById('assetCount').textContent = watchlist.length + ' activos';
    
    // Si hay un gráfico abierto, actualizarlo
    if (chartDialog?.open && chartItem) {
        updateChartPrice(chartItem);
    }
}

function mergeData(item, fresh) {
    const k = keyOf(item);
    const prev = dataStore[k];
    dataStore[k] = { ...fresh, prevPrice: prev?.price || fresh.price, cat: item.cat, symbol: item.symbol };
}

// ============================================================
//   ALERTS
// ============================================================

function checkAlerts() {
    Object.keys(alerts).forEach(k => {
        const a = alerts[k];
        const d = dataStore[k];
        if (!d || a.triggered) return;
        const hit = a.direction === 'above' ? d.price >= a.target : d.price <= a.target;
        if (hit) {
            a.triggered = true;
            showToast(`🔔 ${d.symbol.replace('^', '')} ${a.direction === 'above' ? 'superó' : 'cayó por debajo de'} ${formatCurrency(a.target)}`, 'warning');
        }
    });
    safeSet('wallstreet_alerts', alerts);
}

// ============================================================
//   RENDER ENGINE
// ============================================================

function drawCandles(canvas, ohlc) {
    if (!ohlc || ohlc.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);
    
    const highs = ohlc.map(c => c.high), lows = ohlc.map(c => c.low);
    const min = Math.min(...lows), max = Math.max(...highs);
    const range = (max - min) || 1;
    const n = ohlc.length;
    const slot = w / n;
    const bodyW = Math.max(slot * 0.5, 2);
    const y = v => h - ((v - min) / range) * h * 0.9 - h * 0.05;

    ctx.fillStyle = 'rgba(37, 45, 61, 0.2)';
    ctx.fillRect(0, h * 0.95, w, 1);

    ohlc.forEach((c, i) => {
        const cx = slot * i + slot / 2;
        const up = c.close >= c.open;
        const color = up ? '#00D490' : '#FF5C6A';
        const alpha = 0.8 + 0.2 * (i / n);
        
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(slot * 0.06, 1);
        ctx.beginPath();
        ctx.moveTo(cx, y(c.high));
        ctx.lineTo(cx, y(c.low));
        ctx.stroke();
        
        const yOpen = y(c.open), yClose = y(c.close);
        const top = Math.min(yOpen, yClose);
        const bh = Math.max(Math.abs(yClose - yOpen), 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillRect(cx - bodyW / 2, top, bodyW, bh);
        
        if (i === n - 1) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fillRect(cx - bodyW / 2, top, bodyW, bh);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    });
}

function renderStats() {
    const entries = watchlist.map(i => dataStore[keyOf(i)]).filter(Boolean);
    const ups = entries.filter(d => d.change >= 0).length;
    const downs = entries.length - ups;
    const valid = entries.filter(d => typeof d.changePct === 'number' && !isNaN(d.changePct));
    const best = valid.length ? valid.reduce((a, b) => b.changePct > a.changePct ? b : a) : null;
    const worst = valid.length ? valid.reduce((a, b) => b.changePct < a.changePct ? b : a) : null;
    const totalVal = entries.reduce((sum, d) => sum + (d.price || 0), 0);

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <div class="stat-label">📊 En alza / en baja</div>
            <div class="stat-value">
                <span class="up">${ups} ▲</span> 
                <span class="down">${downs} ▼</span>
            </div>
            <div class="stat-sub">${entries.length} activos totales</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">🚀 Mejor desempeño</div>
            ${best ? `
                <div class="stat-value up">${esc(best.symbol.replace('^', ''))} +${best.changePct.toFixed(2)}%</div>
                <div class="stat-sub">${esc(best.name)}</div>
            ` : '<div class="stat-value" style="font-size:14px;color:var(--text-muted);">—</div>'}
        </div>
        <div class="stat-card">
            <div class="stat-label">📉 Peor desempeño</div>
            ${worst ? `
                <div class="stat-value down">${esc(worst.symbol.replace('^', ''))} ${worst.changePct.toFixed(2)}%</div>
                <div class="stat-sub">${esc(worst.name)}</div>
            ` : '<div class="stat-value" style="font-size:14px;color:var(--text-muted);">—</div>'}
        </div>
        <div class="stat-card">
            <div class="stat-label">💰 Portafolio estimado</div>
            <div class="stat-value gold">${formatCurrency(totalVal)}</div>
            <div class="stat-sub">${entries.length} activos · ${portfolio.cash ? formatCurrency(portfolio.cash) : '$0.00'} disponible</div>
        </div>
    `;
}

function renderTicker() {
    const tape = document.getElementById('ticker');
    const entries = watchlist.map(item => dataStore[keyOf(item)]).filter(Boolean);
    if (entries.length === 0) { tape.innerHTML = ''; return; }
    const list = entries.concat(entries);
    tape.innerHTML = list.map(d => {
        const isUp = d.change >= 0;
        return `<span class="ticker-item ${isUp ? 'up' : 'down'}">
            <span class="sym">${esc(d.symbol.replace('^', ''))}</span>
            <span class="price">${d.price.toLocaleString('en-US', { maximumFractionDigits: d.price < 5 ? 4 : 2 })}</span>
            <span class="change-icon">${isUp ? '▲' : '▼'}</span>
            <span>${Math.abs(d.changePct).toFixed(2)}%</span>
        </span>`;
    }).join('');
}

function render() {
    const grid = document.getElementById('grid');
    const emptyMsg = document.getElementById('emptyMsg');
    let items = watchlist.filter(i => activeCat === 'todos' || i.cat === activeCat);

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        items = items.filter(i => {
            const d = dataStore[keyOf(i)];
            const hay = (i.symbol + ' ' + (d?.name || '')).toLowerCase();
            return hay.includes(term);
        });
    }

    if (sortMode !== 'default') {
        items = [...items].sort((a, b) => {
            const da = dataStore[keyOf(a)], db = dataStore[keyOf(b)];
            if (sortMode === 'alpha') return a.symbol.localeCompare(b.symbol);
            if (!da || !db) return 0;
            if (sortMode === 'price-desc') return db.price - da.price;
            if (sortMode === 'price-asc') return da.price - db.price;
            return sortMode === 'change-desc' ? db.changePct - da.changePct : da.changePct - db.changePct;
        });
    }

    grid.innerHTML = '';
    emptyMsg.style.display = items.length ? 'none' : 'block';

    items.forEach(item => {
        const k = keyOf(item);
        const d = dataStore[k];
        const card = document.createElement('div');
        const alertEntry = alerts[k];
        card.className = 'card' + (alertEntry?.triggered ? ' alert-hit' : '');
        card.dataset.key = k;
        
        if (!d) {
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-sym">${esc(item.symbol)}</div>
                        <div class="card-name">Cargando…</div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
            return;
        }
        
        const isUp = d.change >= 0;
        const kEsc = esc(k);
        const catLabels = { accion: 'Stock', indice: 'Index', cripto: 'Crypto' };
        
        card.innerHTML = `
            <span class="card-badge">${catLabels[item.cat] || item.cat}</span>
            <div class="card-header">
                <div>
                    <div class="card-sym">${esc(item.symbol.replace('^', ''))}</div>
                    <div class="card-name">${esc(d.name)}</div>
                    <div class="card-sector">${esc(d.sector || '')}</div>
                </div>
                <div class="card-actions">
                    <button class="chart-btn" title="Gráfico en tiempo real" data-key="${kEsc}">📈</button>
                    <button class="alert-btn" title="Alerta" data-key="${kEsc}">🔔</button>
                    <button class="remove" title="Quitar" data-key="${kEsc}">✕</button>
                </div>
            </div>
            <div class="card-price" data-key="${kEsc}">
                ${d.price.toLocaleString('en-US', { maximumFractionDigits: d.price < 5 ? 4 : 2 })}
            </div>
            <div class="card-change ${isUp ? 'up' : 'down'}">
                <span class="change-glow">${isUp ? '▲' : '▼'} ${Math.abs(d.change).toFixed(2)} (${Math.abs(d.changePct).toFixed(2)}%)</span>
            </div>
            ${d.volume ? `<div class="card-volume" style="font-size:9px;color:var(--text-muted);margin-top:2px;">Vol: ${formatCompact(d.volume)}</div>` : ''}
            <canvas class="spark"></canvas>
            ${alertEntry ? `
                <div class="card-alert">
                    <span>${alertEntry.triggered ? '✔ Activada' : '⏳ Activa'}: ${alertEntry.direction === 'above' ? '≥' : '≤'} ${formatCurrency(alertEntry.target)}</span>
                    <button data-key="${kEsc}" class="alert-remove">✕ quitar</button>
                </div>
            ` : ''}
            <div class="alert-form" data-key="${kEsc}">
                <select class="alert-dir">
                    <option value="above">📈 Sube de</option>
                    <option value="below">📉 Baja de</option>
                </select>
                <input class="alert-target" type="number" step="any" placeholder="Precio">
                <button type="button" class="alert-save">Guardar</button>
            </div>
        `;
        grid.appendChild(card);
        const canvas = card.querySelector('canvas.spark');
        requestAnimationFrame(() => drawCandles(canvas, d.ohlc));
    });

    // --- Event Listeners ---
    grid.querySelectorAll('.remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const k = btn.dataset.key;
            const item = watchlist.find(i => keyOf(i) === k);
            if (item) showToast(`🗑️ ${item.symbol} eliminado`, 'info');
            watchlist = watchlist.filter(i => keyOf(i) !== k);
            delete dataStore[k];
            delete alerts[k];
            delete extraMeta[k];
            safeSet('wallstreet_watchlist', watchlist);
            safeSet('wallstreet_alerts', alerts);
            safeSet('wallstreet_extrameta', extraMeta);
            render();
            renderTicker();
            renderStats();
        });
    });

    grid.querySelectorAll('.alert-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = grid.querySelector(`.alert-form[data-key="${CSS.escape(btn.dataset.key)}"]`);
            if (form) {
                const isHidden = form.style.display === 'none' || !form.style.display;
                form.style.display = isHidden ? 'flex' : 'none';
                if (isHidden) form.querySelector('.alert-target')?.focus();
            }
        });
    });

    grid.querySelectorAll('.alert-save').forEach(btn => {
        btn.addEventListener('click', () => {
            const form = btn.closest('.alert-form');
            const k = form.dataset.key;
            const dir = form.querySelector('.alert-dir').value;
            const target = parseFloat(form.querySelector('.alert-target').value);
            if (isNaN(target) || target <= 0) {
                showToast('⚠️ Ingresá un precio válido', 'error');
                return;
            }
            alerts[k] = { target, direction: dir, triggered: false };
            safeSet('wallstreet_alerts', alerts);
            showToast(`🔔 Alerta configurada para ${dir === 'above' ? 'subir de' : 'bajar de'} ${formatCurrency(target)}`, 'success');
            render();
        });
    });

    grid.querySelectorAll('.alert-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            delete alerts[btn.dataset.key];
            safeSet('wallstreet_alerts', alerts);
            showToast('🔔 Alerta eliminada', 'info');
            render();
        });
    });

    grid.querySelectorAll('.card-price').forEach(el => {
        el.addEventListener('click', () => {
            const k = el.dataset.key;
            const match = watchlist.find(i => keyOf(i) === k);
            if (match) openTradeModal(match);
        });
    });

    grid.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const k = btn.dataset.key;
            const match = watchlist.find(i => keyOf(i) === k);
            if (match) openChartModal(match);
        });
    });

    renderStats();
    renderTicker();
    updateMarketStatus();
}

// ============================================================
//   FILTERS & CONTROLS
// ============================================================

document.querySelectorAll('.topbar-center button[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.topbar-center button[data-cat]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.cat;
        render();
    });
});

document.getElementById('searchBox').addEventListener('input', e => { 
    searchTerm = e.target.value; 
    render(); 
});

document.getElementById('sortSel').addEventListener('change', e => { 
    sortMode = e.target.value; 
    render(); 
});

document.getElementById('autoRefresh').addEventListener('change', e => {
    if (e.target.checked) {
        refreshTimer = setInterval(() => refreshAll(), 5000);
        showToast('🔄 Actualización automática activada (5s)', 'success');
    } else {
        clearInterval(refreshTimer);
        showToast('⏸️ Actualización automática desactivada', 'info');
    }
});

document.getElementById('refreshBtn').addEventListener('click', () => {
    refreshAll();
    showToast('🔄 Datos actualizados', 'success');
});

// ============================================================
//   THEME
// ============================================================

function applyTheme() {
    document.body.dataset.theme = theme;
    const btn = document.getElementById('themeBtn');
    btn.innerHTML = `<span>${theme === 'dark' ? '☀' : '🌙'}</span>`;
}

document.getElementById('themeBtn').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    safeSet('wallstreet_theme', theme);
    applyTheme();
    showToast(`🎨 Tema ${theme === 'dark' ? 'oscuro' : 'claro'} activado`, 'info');
});

// ============================================================
//   FULLSCREEN
// ============================================================

document.getElementById('fullscreenBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
});

// ============================================================
//   AUTOCOMPLETE
// ============================================================

function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function renderAcList(listEl, results, onSelect) {
    if (results === null) {
        listEl.innerHTML = '<div class="ac-loading">🔍 Buscando…</div>';
        listEl.style.display = 'block';
        return;
    }
    if (results.length === 0) {
        listEl.innerHTML = '<div class="ac-empty">Sin resultados — escribí el símbolo exacto</div>';
        listEl.style.display = 'block';
        return;
    }
    listEl.innerHTML = results.map((r, idx) => `
        <div class="ac-item" data-idx="${idx}">
            <div>
                <div class="ac-sym">${esc(r.symbol)}</div>
                <div class="ac-name">${esc(r.name)}</div>
            </div>
            <div class="ac-exch">${esc(r.exch || '')}</div>
        </div>
    `).join('');
    listEl.style.display = 'block';
    listEl.querySelectorAll('.ac-item').forEach(el => {
        el.addEventListener('click', () => onSelect(results[parseInt(el.dataset.idx, 10)]));
    });
}

function attachAutocomplete(inputEl, listEl, getResultsFn, onSelect) {
    const doSearch = debounce(async (q) => {
        if (!q || !q.trim()) { listEl.style.display = 'none'; return; }
        renderAcList(listEl, null, onSelect);
        try {
            const results = await getResultsFn(q.trim());
            renderAcList(listEl, results, onSelect);
        } catch (e) {
            listEl.innerHTML = '<div class="ac-empty">❌ Error al buscar — escribí el símbolo directamente</div>';
            listEl.style.display = 'block';
        }
    }, 350);
    inputEl.addEventListener('input', () => doSearch(inputEl.value));
    document.addEventListener('click', (e) => {
        if (e.target !== inputEl && !listEl.contains(e.target)) listEl.style.display = 'none';
    });
}

// ============================================================
//   ADD FORM
// ============================================================

let addAcSelected = null;
const addSymbolInput = document.getElementById('addSymbol');
const addTypeSelect = document.getElementById('addType');

attachAutocomplete(addSymbolInput, document.getElementById('acList'),
    (q) => addTypeSelect.value === 'cripto' ? searchCoingecko(q) : searchYahoo(q),
    (item) => {
        addSymbolInput.value = item.symbol;
        addTypeSelect.value = item.cat;
        addAcSelected = item;
        document.getElementById('acList').style.display = 'none';
    }
);
addSymbolInput.addEventListener('input', () => { addAcSelected = null; });
addTypeSelect.addEventListener('change', () => { addAcSelected = null; });

document.getElementById('addForm').addEventListener('submit', e => {
    e.preventDefault();
    const raw = addSymbolInput.value.trim();
    if (!raw) {
        showToast('⚠️ Ingresá un símbolo para agregar', 'error');
        return;
    }
    let cat, symbol;
    if (addAcSelected && addAcSelected.symbol === raw) {
        cat = addAcSelected.cat;
        symbol = cat === 'cripto' ? addAcSelected.symbol.toLowerCase() : addAcSelected.symbol.toUpperCase();
        extraMeta[cat + ':' + symbol] = { name: addAcSelected.name, sector: addAcSelected.exch || (cat === 'cripto' ? 'Cripto' : '—') };
        safeSet('wallstreet_extrameta', extraMeta);
    } else {
        cat = addTypeSelect.value;
        symbol = cat === 'cripto' ? raw.toLowerCase() : raw.toUpperCase();
    }
    if (watchlist.some(i => i.cat === cat && i.symbol === symbol)) {
        showToast(`⚠️ ${symbol} ya está en la lista`, 'warning');
        return;
    }
    watchlist.push({ cat, symbol });
    safeSet('wallstreet_watchlist', watchlist);
    addSymbolInput.value = '';
    addAcSelected = null;
    document.getElementById('acList').style.display = 'none';
    showToast(`✅ ${symbol} agregado a la lista`, 'success');
    render();
    refreshAll();
});

// ============================================================
//   TRADE MODAL
// ============================================================

const tradeDialog = document.getElementById('tradeDialog');
const tradeSymbolDisplay = document.getElementById('tradeSymbolDisplay');
const tradePriceDisplay = document.getElementById('tradePriceDisplay');
const tradeQty = document.getElementById('tradeQty');
const tradeLimitPrice = document.getElementById('tradeLimitPrice');
const tradeOrderType = document.getElementById('tradeOrderType');
const tradeSide = document.getElementById('tradeSide');
const tradeTotal = document.getElementById('tradeTotal');
let tradeTargetSymbol = null;

function openTradeModal(item) {
    tradeTargetSymbol = item;
    const d = dataStore[keyOf(item)];
    tradeSymbolDisplay.textContent = item.symbol.replace('^', '');
    tradePriceDisplay.textContent = `Precio actual: ${d ? formatCurrency(d.price) : '$0.00'}`;
    updateTradeTotal();
    tradeDialog.showModal();
}

document.getElementById('tradeBtn').addEventListener('click', () => {
    const first = watchlist.find(i => dataStore[keyOf(i)]) || watchlist[0];
    if (first) openTradeModal(first);
    else showToast('⚠️ No hay activos para trade', 'warning');
});

document.getElementById('tradeClose').addEventListener('click', () => tradeDialog.close());
tradeDialog.addEventListener('click', (e) => {
    if (e.target === tradeDialog) tradeDialog.close();
});

tradeQty.addEventListener('input', updateTradeTotal);
tradeLimitPrice.addEventListener('input', updateTradeTotal);
tradeOrderType.addEventListener('change', () => {
    tradeLimitPrice.disabled = tradeOrderType.value !== 'limit';
    if (tradeOrderType.value !== 'limit') tradeLimitPrice.value = '';
    updateTradeTotal();
});
tradeSide.addEventListener('change', updateTradeTotal);

function updateTradeTotal() {
    const qty = parseInt(tradeQty.value) || 1;
    const d = tradeTargetSymbol ? dataStore[keyOf(tradeTargetSymbol)] : null;
    const price = tradeOrderType.value === 'limit' ? parseFloat(tradeLimitPrice.value) || 0 : (d ? d.price : 0);
    const total = price * qty;
    tradeTotal.textContent = formatCurrency(total);
}

document.querySelectorAll('.payment-methods .pm').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.payment-methods .pm').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.getElementById('tradeExecuteBuy').addEventListener('click', () => {
    const d = tradeTargetSymbol ? dataStore[keyOf(tradeTargetSymbol)] : null;
    const qty = parseInt(tradeQty.value) || 1;
    const price = tradeOrderType.value === 'limit' ? parseFloat(tradeLimitPrice.value) || (d?.price || 0) : (d?.price || 0);
    const total = price * qty;
    showToast(`🟢 Compra: ${qty} ${tradeTargetSymbol?.symbol.replace('^', '') || ''} a ${formatCurrency(price)} = ${formatCurrency(total)}`, 'success');
    tradeDialog.close();
});

document.getElementById('tradeExecuteSell').addEventListener('click', () => {
    const d = tradeTargetSymbol ? dataStore[keyOf(tradeTargetSymbol)] : null;
    const qty = parseInt(tradeQty.value) || 1;
    const price = tradeOrderType.value === 'limit' ? parseFloat(tradeLimitPrice.value) || (d?.price || 0) : (d?.price || 0);
    const total = price * qty;
    showToast(`🔴 Venta: ${qty} ${tradeTargetSymbol?.symbol.replace('^', '') || ''} a ${formatCurrency(price)} = ${formatCurrency(total)}`, 'info');
    tradeDialog.close();
});

// ============================================================
//   CHART MODAL — CON ACTUALIZACIÓN EN TIEMPO REAL
// ============================================================

const chartDialog = document.getElementById('chartDialog');
const chartCanvas = document.getElementById('chartCanvas');
const chartSymbol = document.getElementById('chartSymbol');
const chartPrice = document.getElementById('chartPrice');
const chartChange = document.getElementById('chartChange');
const chartHigh = document.getElementById('chartHigh');
const chartLow = document.getElementById('chartLow');
const chartVolume = document.getElementById('chartVolume');

function openChartModal(item) {
    chartItem = item;
    const d = dataStore[keyOf(item)];
    chartSymbol.textContent = `📈 ${item.symbol.replace('^', '')}`;
    chartPrice.textContent = d ? formatCurrency(d.price) : '$0.00';
    if (d) {
        const isUp = d.change >= 0;
        chartChange.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(d.change).toFixed(2)} (${Math.abs(d.changePct).toFixed(2)}%)`;
        chartChange.style.color = isUp ? 'var(--green)' : 'var(--red)';
        chartHigh.textContent = `Máx: ${d.high ? formatCurrency(d.high) : '--'}`;
        chartLow.textContent = `Mín: ${d.low ? formatCurrency(d.low) : '--'}`;
        chartVolume.textContent = `Vol: ${d.volume ? formatCompact(d.volume) : '--'}`;
    }
    chartRange = '1D';
    document.querySelectorAll('.chart-time').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.time === '1D');
    });
    chartDialog.showModal();
    loadChartData(item, '1D');
    
    if (chartUpdateInterval) clearInterval(chartUpdateInterval);
    chartUpdateInterval = setInterval(() => {
        if (chartDialog.open && chartItem) {
            updateChartPrice(chartItem);
        }
    }, 5000);
}

function updateChartPrice(item) {
    const d = dataStore[keyOf(item)];
    if (d) {
        chartPrice.textContent = formatCurrency(d.price);
        const isUp = d.change >= 0;
        chartChange.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(d.change).toFixed(2)} (${Math.abs(d.changePct).toFixed(2)}%)`;
        chartChange.style.color = isUp ? 'var(--green)' : 'var(--red)';
        chartHigh.textContent = `Máx: ${d.high ? formatCurrency(d.high) : '--'}`;
        chartLow.textContent = `Mín: ${d.low ? formatCurrency(d.low) : '--'}`;
        chartVolume.textContent = `Vol: ${d.volume ? formatCompact(d.volume) : '--'}`;
    }
}

document.getElementById('chartClose').addEventListener('click', () => {
    if (chartUpdateInterval) { clearInterval(chartUpdateInterval); chartUpdateInterval = null; }
    chartDialog.close();
});
chartDialog.addEventListener('click', (e) => {
    if (e.target === chartDialog) {
        if (chartUpdateInterval) { clearInterval(chartUpdateInterval); chartUpdateInterval = null; }
        chartDialog.close();
    }
});

document.querySelectorAll('.chart-time').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-time').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chartRange = btn.dataset.time;
        if (chartItem) loadChartData(chartItem, chartRange);
    });
});

async function loadChartData(item, range) {
    try {
        let ohlc;
        if (item.cat === 'cripto') {
            const days = range === '1D' ? 1 : range === '5D' ? 7 : range === '1M' ? 30 : range === '3M' ? 90 : range === '6M' ? 180 : range === '1Y' ? 365 : 1000;
            ohlc = await loadCryptoOhlc(item.symbol, days);
        } else {
            ohlc = await loadStockHistory(item.symbol, range);
        }
        if (ohlc?.length > 1) {
            drawChart(ohlc);
        } else {
            showToast('⚠️ No hay datos suficientes para este período', 'warning');
        }
    } catch (e) {
        showToast('❌ Error cargando gráfico', 'error');
    }
}

function drawChart(ohlc) {
    const canvas = chartCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width - 20;
    const h = 420;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 20, bottom: 30, left: 50, right: 20 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const highs = ohlc.map(c => c.high);
    const lows = ohlc.map(c => c.low);
    const closes = ohlc.map(c => c.close);
    const min = Math.min(...lows) * 0.998;
    const max = Math.max(...highs) * 1.002;
    const range = (max - min) || 1;
    const n = ohlc.length;
    const slot = chartW / n;

    const y = v => padding.top + chartH - ((v - min) / range) * chartH;
    const x = i => padding.left + slot * i + slot / 2;

    // Background grid
    ctx.strokeStyle = 'rgba(37, 45, 61, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
        const yPos = padding.top + chartH * (i / 4);
        ctx.beginPath();
        ctx.moveTo(padding.left, yPos);
        ctx.lineTo(w - padding.right, yPos);
        ctx.stroke();
    }

    // Price line
    ctx.strokeStyle = '#D4A84B';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    closes.forEach((c, i) => {
        const px = x(i);
        const py = y(c);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Area fill
    ctx.fillStyle = 'rgba(212, 168, 75, 0.1)';
    ctx.beginPath();
    const firstX = x(0);
    const lastX = x(n - 1);
    ctx.moveTo(firstX, y(closes[0]));
    closes.forEach((c, i) => ctx.lineTo(x(i), y(c)));
    ctx.lineTo(lastX, padding.top + chartH);
    ctx.lineTo(firstX, padding.top + chartH);
    ctx.closePath();
    ctx.fill();

    // Draw candlesticks
    const showCandles = n < 100;
    if (showCandles) {
        ohlc.forEach((c, i) => {
            const cx = x(i);
            const up = c.close >= c.open;
            const color = up ? '#00D490' : '#FF5C6A';
            const bodyTop = Math.min(y(c.open), y(c.close));
            const bodyH = Math.max(Math.abs(y(c.close) - y(c.open)), 1);
            const wickW = Math.max(slot * 0.04, 0.5);

            ctx.strokeStyle = color;
            ctx.lineWidth = wickW;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(cx, y(c.high));
            ctx.lineTo(cx, y(c.low));
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.8;
            const bodyW = Math.max(slot * 0.4, 1.5);
            ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
            ctx.globalAlpha = 1;
        });
    }

    // SMA line
    const smaPeriod = Math.min(20, n);
    if (n > smaPeriod) {
        const smaData = [];
        for (let i = smaPeriod; i < n; i++) {
            let sum = 0;
            for (let j = i - smaPeriod; j < i; j++) sum += ohlc[j].close;
            smaData.push({ index: i, value: sum / smaPeriod });
        }
        if (smaData.length > 1) {
            ctx.strokeStyle = 'rgba(74, 140, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            smaData.forEach((p, idx) => {
                const px = x(p.index);
                const py = y(p.value);
                idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            });
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1;
        }
    }

    // Price labels
    ctx.fillStyle = 'var(--text-muted)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
        const val = min + (max - min) * (1 - i / 4);
        const yPos = padding.top + chartH * (i / 4);
        ctx.fillText('$' + val.toFixed(2), padding.left - 6, yPos);
    }

    // Date labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.floor(n / 8));
    for (let i = 0; i < n; i += step) {
        const label = i === 0 ? 'Inicio' : i === n - 1 ? 'Ahora' : '';
        if (label) {
            ctx.fillText(label, x(i), padding.top + chartH + 6);
        }
    }
}

// ============================================================
//   OPTIONS CHAIN
// ============================================================

const optDialog = document.getElementById('optDialog');
const optSymbolInput = document.getElementById('optSymbolInput');
const optExpirySel = document.getElementById('optExpiry');
const optMeta = document.getElementById('optMeta');
const optTable = document.getElementById('optTable');
const optEmpty = document.getElementById('optEmpty');
const optHeadRow = document.getElementById('optHeadRow');
const optBody = document.getElementById('optBody');
let optState = { symbol: null, expirations: [], underlyingPrice: null, side: 'both' };

attachAutocomplete(optSymbolInput, document.getElementById('optAcList'),
    (q) => searchYahoo(q),
    (item) => {
        optSymbolInput.value = item.symbol;
        document.getElementById('optAcList').style.display = 'none';
        loadOptionSymbol(item.symbol);
    }
);

document.getElementById('optBtn').addEventListener('click', () => {
    optDialog.showModal();
    if (!optState.symbol && watchlist.length) {
        const first = watchlist.find(i => i.cat === 'accion') || watchlist[0];
        if (first) {
            optSymbolInput.value = first.symbol.replace('^', '');
            loadOptionSymbol(first.symbol.replace('^', ''));
        }
    }
});

document.getElementById('optClose').addEventListener('click', () => optDialog.close());
optDialog.addEventListener('click', (e) => {
    if (e.target === optDialog) optDialog.close();
});

optExpirySel.addEventListener('change', () => {
    if (optState.symbol) loadOptionChainData(optState.symbol, optExpirySel.value);
});

document.querySelectorAll('#optTypeToggle button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#optTypeToggle button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        optState.side = btn.dataset.side;
        renderOptionTable();
    });
});

async function loadOptionSymbol(symbol) {
    optEmpty.style.display = 'block';
    optEmpty.innerHTML = '<div class="empty-icon">⏳</div><div>Cargando vencimientos…</div>';
    optTable.style.display = 'none';
    optMeta.innerHTML = '';
    optExpirySel.disabled = true;
    optExpirySel.innerHTML = '<option>📅 Vencimiento…</option>';
    try {
        const result = await fetchOptionChain(symbol);
        optState.symbol = symbol;
        optState.expirations = result.expirationDates || [];
        optState.underlyingPrice = result.quote?.regularMarketPrice || null;
        if (optState.expirations.length === 0) throw new Error('sin vencimientos');
        optExpirySel.innerHTML = optState.expirations.map(ts => {
            const d = new Date(ts * 1000);
            return `<option value="${ts}">${d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' })}</option>`;
        }).join('');
        optExpirySel.disabled = false;
        renderOptionsFromResult(result);
    } catch (e) {
        optEmpty.style.display = 'block';
        optEmpty.innerHTML = '<div class="empty-icon">📊</div><div>No se encontraron opciones para ese símbolo.<br>Probá con un ticker válido (AAPL, TSLA, SPY).</div>';
        optTable.style.display = 'none';
    }
}

async function loadOptionChainData(symbol, expiryTs) {
    optEmpty.style.display = 'block';
    optEmpty.innerHTML = '<div class="empty-icon">⏳</div><div>Cargando cadena…</div>';
    optTable.style.display = 'none';
    try {
        const result = await fetchOptionChain(symbol, expiryTs);
        optState.underlyingPrice = result.quote?.regularMarketPrice || optState.underlyingPrice;
        renderOptionsFromResult(result);
    } catch (e) {
        optEmpty.style.display = 'block';
        optEmpty.innerHTML = '<div class="empty-icon">❌</div><div>No se pudo cargar esa cadena. Probá otro vencimiento.</div>';
    }
}

let optCurrentChain = { calls: [], puts: [] };

function renderOptionsFromResult(result) {
    const opt = result.options?.[0] || { calls: [], puts: [] };
    optCurrentChain = { calls: opt.calls || [], puts: opt.puts || [] };
    const price = optState.underlyingPrice;
    optMeta.innerHTML = `
        <span>📌 Subyacente: <b>${esc(result.quote?.symbol || optState.symbol)}</b></span>
        ${price != null ? `<span>💰 Precio: <b>${formatCurrency(price)}</b></span>` : ''}
        <span>📊 Contratos: <b>${optCurrentChain.calls.length}</b> calls · <b>${optCurrentChain.puts.length}</b> puts</span>
    `;
    renderOptionTable();
}

function fmtNum(v, decimals) {
    return (v == null || isNaN(v)) ? '—' : Number(v).toFixed(decimals);
}

function optRowCells(c, kind, price) {
    if (!c) return `<td></td><td></td><td></td><td></td><td></td><td></td>`;
    const chgClass = c.change > 0 ? 'chg-up' : (c.change < 0 ? 'chg-down' : '');
    const itm = kind === 'call' ? (price != null && c.strike < price) : (price != null && c.strike > price);
    const itmClass = itm ? (kind === 'call' ? 'itm-call' : 'itm-put') : '';
    return `
        <td class="${itmClass}">${fmtNum(c.lastPrice, 2)}</td>
        <td class="${itmClass} ${chgClass}">${c.change != null ? (c.change >= 0 ? '+' : '') + fmtNum(c.change, 2) : '—'}</td>
        <td class="${itmClass}">${fmtNum(c.bid, 2)}</td>
        <td class="${itmClass}">${fmtNum(c.ask, 2)}</td>
        <td class="${itmClass}">${c.volume ?? '—'}</td>
        <td class="${itmClass}">${c.openInterest ?? '—'}</td>
        <td class="${itmClass}">${c.impliedVolatility != null ? fmtNum(c.impliedVolatility * 100, 1) + '%' : '—'}</td>
    `;
}

function renderOptionTable() {
    const { calls, puts } = optCurrentChain;
    if (calls.length === 0 && puts.length === 0) {
        optTable.style.display = 'none';
        optEmpty.style.display = 'block';
        optEmpty.innerHTML = '<div class="empty-icon">📭</div><div>Sin contratos para este vencimiento.</div>';
        return;
    }
    optEmpty.style.display = 'none';
    optTable.style.display = 'table';

    const showCalls = optState.side === 'both' || optState.side === 'calls';
    const showPuts = optState.side === 'both' || optState.side === 'puts';
    const price = optState.underlyingPrice;
    const colLabels = ['Last', 'Chg', 'Bid', 'Ask', 'Vol', 'OI', 'IV'];
    let head = '';
    if (showCalls) head += colLabels.map(c => `<th>${c}</th>`).reverse().join('');
    head += `<th>Strike</th>`;
    if (showPuts) head += colLabels.map(c => `<th>${c}</th>`).join('');
    optHeadRow.innerHTML = head;

    const byStrike = {};
    calls.forEach(c => { byStrike[c.strike] = byStrike[c.strike] || {}; byStrike[c.strike].call = c; });
    puts.forEach(p => { byStrike[p.strike] = byStrike[p.strike] || {}; byStrike[p.strike].put = p; });
    const strikes = Object.keys(byStrike).map(Number).sort((a, b) => a - b);
    let atmStrike = null;
    if (price != null && strikes.length) {
        atmStrike = strikes.reduce((a, b) => Math.abs(b - price) < Math.abs(a - price) ? b : a);
    }

    optBody.innerHTML = strikes.map(strike => {
        const row = byStrike[strike];
        let cellsCall = '', cellsPut = '';
        if (showCalls) {
            const parts = (optRowCells(row.call, 'call', price).match(/<td[\s\S]*?<\/td>/g) || []);
            cellsCall = parts.reverse().join('');
        }
        if (showPuts) cellsPut = optRowCells(row.put, 'put', price);
        const isAtm = atmStrike === strike;
        return `<tr class="${isAtm ? 'atm' : ''}">
            ${showCalls ? cellsCall : ''}
            <td class="strike">${strike.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
            ${showPuts ? cellsPut : ''}
        </tr>`;
    }).join('');
}

// ============================================================
//   KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        document.querySelector('.topbar-center button[data-cat="todos"]')?.click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        document.querySelector('.topbar-center button[data-cat="accion"]')?.click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        document.querySelector('.topbar-center button[data-cat="indice"]')?.click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        document.querySelector('.topbar-center button[data-cat="cripto"]')?.click();
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        document.getElementById('tradeBtn')?.click();
    }
    if (e.key === 'Escape') {
        if (tradeDialog.open) tradeDialog.close();
        if (optDialog.open) optDialog.close();
        if (chartDialog.open) {
            if (chartUpdateInterval) { clearInterval(chartUpdateInterval); chartUpdateInterval = null; }
            chartDialog.close();
        }
    }
});

// ============================================================
//   INIT
// ============================================================

applyTheme();
render();
refreshAll();
refreshTimer = setInterval(() => refreshAll(), 5000);

// Handle window resize for charts
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (chartDialog.open && chartItem) {
            loadChartData(chartItem, chartRange);
        }
        render();
    }, 300);
});

console.log('🐂 Wall Street Style v3.0 Pro — Trading Terminal');
console.log('📊 Actualizaciones suaves sin pestañeos');
console.log('🔔 Shortcuts: Ctrl+Shift+D (Dashboard), S (Stocks), I (Indices), C (Crypto), T (Trade)');