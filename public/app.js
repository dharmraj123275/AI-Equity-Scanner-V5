// ==========================================
// AI EQUITY SCANNER PRO V5
// COMPLETE APP.JS
// SEARCH + LIVE QUOTE + AI ANALYSIS
// ==========================================

let selectedInstrument = "";
let selectedStock = "";

// ==========================================
// API BASE
// ==========================================

const API_BASE = "";

// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    loadMarketStatus();

    setInterval(loadMarketStatus, 30000);

});

// ==========================================
// MARKET STATUS
// ==========================================

async function loadMarketStatus() {

    const marketStatus =
        document.getElementById("marketStatus");

    const lastUpdate =
        document.getElementById("lastUpdate");

    try {

        const response =
            await fetch(
                `${API_BASE}/api/status`
            );

        const data =
            await response.json();

        if (!data.success) {

            marketStatus.textContent =
                "⚠ Market status unavailable";

            return;
        }

        marketStatus.textContent =
            data.market || "Unknown";

        lastUpdate.textContent =
            `${data.date || ""} ${data.time || ""}`;

    } catch (error) {

        console.error(
            "MARKET STATUS ERROR:",
            error
        );

        marketStatus.textContent =
            "⚠ Server unavailable";

        lastUpdate.textContent =
            "Unable to connect to backend";

    }

}

// ==========================================
// SEARCH STOCK
// ==========================================

async function searchStock() {

    const input =
        document.getElementById("search");

    const result =
        document.getElementById("result");

    const query =
        input.value.trim();

    if (!query) {

        result.innerHTML = `
            <div class="error-card">
                ⚠ Please enter a stock name or symbol.
            </div>
        `;

        return;
    }

    result.innerHTML = `
        <div class="loading-card">
            🔎 Searching <b>${escapeHtml(query)}</b>...
        </div>
    `;

    try {

        const response =
            await fetch(
                `${API_BASE}/api/search?q=${encodeURIComponent(query)}`
            );

        const data =
            await response.json();

        console.log(
            "SEARCH RESPONSE:",
            data
        );

        if (!response.ok || !data.success) {

            result.innerHTML = `
                <div class="error-card">
                    ❌ ${escapeHtml(
                        data.message ||
                        "Stock search failed"
                    )}
                </div>
            `;

            return;
        }

        const results =
            Array.isArray(data.results)
                ? data.results
                : [];

        if (results.length === 0) {

            result.innerHTML = `
                <div class="error-card">
                    ❌ No stock found for
                    <b>${escapeHtml(query)}</b>
                </div>
            `;

            return;
        }

        displaySearchResults(results);

    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        result.innerHTML = `
            <div class="error-card">
                ❌ Unable to connect to scanner server.
            </div>
        `;

    }

}

// ==========================================
// DISPLAY SEARCH RESULTS
// ==========================================

function displaySearchResults(results) {

    const result =
        document.getElementById("result");

    let html = `
        <div class="search-results">

            <h3>🔎 Search Results</h3>
    `;

    results.forEach((stock, index) => {

        const instrument =
            stock.instrument ||
            stock.instrument_key ||
            "";

        const symbol =
            stock.symbol ||
            stock.trading_symbol ||
            "";

        const name =
            stock.name ||
            symbol ||
            "Unknown";

        const exchange =
            stock.exchange ||
            "";

        const segment =
            stock.segment ||
            "";

        html += `

            <div
                class="stock-result"
                onclick="selectStock(
                    '${escapeAttribute(instrument)}',
                    '${escapeAttribute(symbol)}',
                    '${escapeAttribute(name)}'
                )"
            >

                <div>

                    <strong>
                        ${escapeHtml(symbol)}
                    </strong>

                    <br>

                    <span>
                        ${escapeHtml(name)}
                    </span>

                </div>

                <div class="stock-meta">

                    ${escapeHtml(exchange)}

                    ${segment
                        ? " • " + escapeHtml(segment)
                        : ""
                    }

                </div>

            </div>

        `;

    });

    html += `
        </div>
    `;

    result.innerHTML = html;

}

// ==========================================
// SELECT STOCK
// ==========================================

function selectStock(
    instrument,
    symbol,
    name
) {

    console.log(
        "SELECTED STOCK:",
        {
            instrument,
            symbol,
            name
        }
    );

    selectedInstrument =
        instrument;

    selectedStock =
        symbol;

    const result =
        document.getElementById("result");

    // ======================================
    // IMPORTANT
    // ======================================

    if (!selectedInstrument) {

        result.innerHTML = `

            <div class="error-card">

                ⚠ <b>${escapeHtml(symbol)}</b>
                selected.

                <br><br>

                But this search result does not contain
                an Upstox instrument key.

                <br><br>

                Please make sure Upstox search is working
                and try again.

            </div>

        `;

        return;
    }

    // ======================================
    // SHOW LOADING
    // ======================================

    result.innerHTML = `

        <div class="loading-card">

            📡 Connecting to Upstox...

            <br><br>

            <b>${escapeHtml(symbol)}</b>

        </div>

    `;

    // ======================================
    // LOAD LIVE DATA
    // ======================================

    loadLiveData(
        selectedInstrument,
        symbol,
        name
    );

}

// ==========================================
// LIVE DATA
// ==========================================

async function loadLiveData(
    instrument,
    symbol = "",
    name = ""
) {

    const result =
        document.getElementById("result");

    if (!instrument) {

        result.innerHTML = `

            <div class="error-card">

                ⚠ Instrument key is required.

                <br><br>

                Please search and select the stock again.

            </div>

        `;

        return;
    }

    result.innerHTML = `

        <div class="loading-card">

            📡 Loading live market data...

            <br><br>

            <small>
                ${escapeHtml(symbol)}
            </small>

        </div>

    `;

    try {

        const url =
            `${API_BASE}/api/live?instrument=${encodeURIComponent(
                instrument
            )}`;

        console.log(
            "LIVE API:",
            url
        );

        const response =
            await fetch(url);

        const data =
            await response.json();

        console.log(
            "LIVE RESPONSE:",
            data
        );

        if (!response.ok || !data.success) {

            result.innerHTML = `

                <div class="error-card">

                    ⚠ <b>Live Data Error</b>

                    <br><br>

                    ${escapeHtml(
                        data.message ||
                        "Upstox API response unavailable."
                    )}

                    <br><br>

                    <small>
                        Instrument:
                        ${escapeHtml(instrument)}
                    </small>

                </div>

            `;

            return;
        }

        const analysis =
            data.data || {};

        displayAnalysis(
            analysis,
            symbol,
            name
        );

    } catch (error) {

        console.error(
            "LIVE DATA ERROR:",
            error
        );

        result.innerHTML = `

            <div class="error-card">

                ⚠ <b>Live Data Error</b>

                <br><br>

                Unable to connect to backend.

                <br><br>

                <small>
                    ${escapeHtml(
                        error.message
                    )}
                </small>

            </div>

        `;

    }

}

// ==========================================
// DISPLAY ANALYSIS
// ==========================================

function displayAnalysis(
    data,
    symbol,
    name
) {

    const result =
        document.getElementById("result");

    const price =
        number(data.price);

    const change =
        number(data.netChange);

    const changePercent =
        number(data.changePercent);

    const open =
        number(data.open);

    const high =
        number(data.high);

    const low =
        number(data.low);

    const close =
        number(data.close);

    const volume =
        number(data.volume);

    const oi =
        number(data.oi);

    const support =
        number(data.support);

    const resistance =
        number(data.resistance);

    const aiScore =
        number(data.aiScore);

    const entry =
        number(data.entry);

    const target1 =
        number(data.target1);

    const target2 =
        number(data.target2);

    const stopLoss =
        number(data.stopLoss);

    const riskReward =
        number(data.riskReward);

    const trend =
        data.trend ||
        "SIDEWAYS";

    const signal =
        data.signal ||
        "HOLD";

    const buyQuantity =
        number(
            data.marketDepth?.buyQuantity
        );

    const sellQuantity =
        number(
            data.marketDepth?.sellQuantity
        );

    // ======================================
    // SIGNAL CLASS
    // ======================================

    let signalClass =
        "hold";

    if (signal === "BUY") {
        signalClass = "buy";
    }

    if (signal === "SELL") {
        signalClass = "sell";
    }

    // ======================================
    // CHANGE CLASS
    // ======================================

    const changeClass =
        change > 0
            ? "positive"
            : change < 0
                ? "negative"
                : "neutral";

    // ======================================
    // HTML
    // ======================================

    result.innerHTML = `

        <div class="analysis-card">

            <div class="analysis-header">

                <div>

                    <h2>
                        📈 ${escapeHtml(
                            symbol || "Stock"
                        )}
                    </h2>

                    <p>
                        ${escapeHtml(
                            name || ""
                        )}
                    </p>

                </div>

                <div class="signal ${signalClass}">

                    ${signal}

                </div>

            </div>

            <div class="price-section">

                <div class="price">

                    ₹${formatPrice(price)}

                </div>

                <div class="${changeClass}">

                    ${change >= 0 ? "+" : ""}
                    ${formatPrice(change)}

                    (${changePercent >= 0 ? "+" : ""}
                    ${changePercent.toFixed(2)}%)

                </div>

            </div>

            <div class="metrics">

                <div class="metric">

                    <span>Trend</span>

                    <strong>
                        ${escapeHtml(trend)}
                    </strong>

                </div>

                <div class="metric">

                    <span>AI Score</span>

                    <strong>
                        ${aiScore}/100
                    </strong>

                </div>

                <div class="metric">

                    <span>Open</span>

                    <strong>
                        ₹${formatPrice(open)}
                    </strong>

                </div>

                <div class="metric">

                    <span>High</span>

                    <strong>
                        ₹${formatPrice(high)}
                    </strong>

                </div>

                <div class="metric">

                    <span>Low</span>

                    <strong>
                        ₹${formatPrice(low)}
                    </strong>

                </div>

                <div class="metric">

                    <span>Previous Close</span>

                    <strong>
                        ₹${formatPrice(close)}
                    </strong>

                </div>

                <div class="metric">

                    <span>Volume</span>

                    <strong>
                        ${formatNumber(volume)}
                    </strong>

                </div>

                <div class="metric">

                    <span>OI</span>

                    <strong>
                        ${formatNumber(oi)}
                    </strong>

                </div>

            </div>

            <h3>
                🎯 Trade Levels
            </h3>

            <div class="trade-levels">

                <div class="trade-box">

                    <span>Entry</span>

                    <strong>
                        ₹${formatPrice(entry)}
                    </strong>

                </div>

                <div class="trade-box">

                    <span>Target 1</span>

                    <strong>
                        ₹${formatPrice(target1)}
                    </strong>

                </div>

                <div class="trade-box">

                    <span>Target 2</span>

                    <strong>
                        ₹${formatPrice(target2)}
                    </strong>

                </div>

                <div class="trade-box">

                    <span>Stop Loss</span>

                    <strong>
                        ₹${formatPrice(stopLoss)}
                    </strong>

                </div>

                <div class="trade-box">

                    <span>Risk / Reward</span>

                    <strong>
                        1 : ${riskReward.toFixed(2)}
                    </strong>

                </div>

            </div>

            <h3>
                📊 Support / Resistance
            </h3>

            <div class="levels">

                <div>

                    <span>Support</span>

                    <strong>
                        ₹${formatPrice(support)}
                    </strong>

                </div>

                <div>

                    <span>Resistance</span>

                    <strong>
                        ₹${formatPrice(resistance)}
                    </strong>

                </div>

            </div>

            <h3>
                📚 Market Depth
            </h3>

            <div class="depth">

                <div>

                    <span>Buy Quantity</span>

                    <strong>
                        ${formatNumber(
                            buyQuantity
                        )}
                    </strong>

                </div>

                <div>

                    <span>Sell Quantity</span>

                    <strong>
                        ${formatNumber(
                            sellQuantity
                        )}
                    </strong>

                </div>

            </div>

            <button
                class="refresh-button"
                onclick="loadLiveData(
                    '${escapeAttribute(
                        instrumentFromCurrent()
                    )}',
                    '${escapeAttribute(
                        symbol
                    )}',
                    '${escapeAttribute(
                        name
                    )}'
                )"
            >

                🔄 Refresh Live Data

            </button>

        </div>

    `;

}

// ==========================================
// GET CURRENT INSTRUMENT
// ==========================================

function instrumentFromCurrent() {

    return selectedInstrument || "";

}

// ==========================================
// ENTER KEY SEARCH
// ==========================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Enter" &&
            document.activeElement?.id === "search"
        ) {

            searchStock();

        }

    }
);

// ==========================================
// NUMBER
// ==========================================

function number(value) {

    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : 0;

}

// ==========================================
// PRICE FORMAT
// ==========================================

function formatPrice(value) {

    const n =
        number(value);

    return n.toLocaleString(
        "en-IN",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}

// ==========================================
// NUMBER FORMAT
// ==========================================

function formatNumber(value) {

    const n =
        number(value);

    return n.toLocaleString(
        "en-IN",
        {
            maximumFractionDigits: 0
        }
    );

}

// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

// ==========================================
// ATTRIBUTE ESCAPE
// ==========================================

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/\n/g, " ");

}

// ==========================================
// GLOBAL ERROR LOG
// ==========================================

window.addEventListener(
    "error",
    function(event) {

        console.error(
            "APP ERROR:",
            event.error || event.message
        );

    }
);
