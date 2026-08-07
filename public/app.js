// ==========================================
// AI EQUITY SCANNER PRO V5
// COMPLETE APP.JS
// LIVE UPSTOX STOCK ANALYSIS
// ==========================================

const searchInput = document.getElementById("search");
const result = document.getElementById("result");

// ==========================================
// MARKET STATUS
// ==========================================

async function loadMarketStatus() {
    try {
        const response = await fetch("/api/status");
        const data = await response.json();

        const marketStatus =
            document.getElementById("marketStatus");

        const lastUpdate =
            document.getElementById("lastUpdate");

        if (marketStatus) {
            marketStatus.innerText =
                data.market || "Market Status Unknown";
        }

        if (lastUpdate) {
            lastUpdate.innerText =
                `${data.date || ""} • ${data.time || ""}`;
        }

    } catch (error) {

        console.error("Market Status Error:", error);

        const marketStatus =
            document.getElementById("marketStatus");

        const lastUpdate =
            document.getElementById("lastUpdate");

        if (marketStatus) {
            marketStatus.innerText =
                "⚠ Server Connection Error";
        }

        if (lastUpdate) {
            lastUpdate.innerText =
                "Unable to connect";
        }
    }
}

// ==========================================
// SEARCH STOCK
// ==========================================

async function searchStock() {

    const query =
        searchInput.value.trim();

    if (!query) {

        result.innerHTML = `
            <div class="status-card">

                <h2>⚠ Enter Stock Name</h2>

                <p>
                    Example:
                    Reliance, TCS, SBI, Infosys
                </p>

            </div>
        `;

        return;
    }

    result.innerHTML = `
        <div class="status-card">

            <h2>🔎 Searching...</h2>

            <p>
                Finding ${escapeHtml(query)}
            </p>

        </div>
    `;

    try {

        // ======================================
        // STEP 1 — STOCK SEARCH
        // ======================================

        const searchResponse =
            await fetch(
                "/api/search?q=" +
                encodeURIComponent(query)
            );

        const searchData =
            await searchResponse.json();

        console.log(
            "SEARCH RESPONSE:",
            searchData
        );

        if (
            !searchData.success ||
            !searchData.results ||
            searchData.results.length === 0
        ) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>❌ Stock Not Found</h2>

                    <p>
                        No stock found for
                        "${escapeHtml(query)}"
                    </p>

                    <small>
                        Try RELIANCE, TCS, SBIN,
                        INFY, HDFCBANK
                    </small>

                </div>
            `;

            return;
        }

        // First matching stock
        const stock =
            searchData.results[0];

        // ======================================
        // STEP 2 — LIVE UPSTOX DATA
        // ======================================

        result.innerHTML = `
            <div class="status-card">

                <h2>📡 Connecting to Upstox...</h2>

                <p>
                    Loading live data for
                    <b>${escapeHtml(stock.name)}</b>
                </p>

            </div>
        `;

        const liveResponse =
            await fetch(
                "/api/live?instrument=" +
                encodeURIComponent(
                    stock.instrument
                )
            );

        const liveData =
            await liveResponse.json();

        console.log(
            "LIVE RESPONSE:",
            liveData
        );

        if (!liveData.success) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>⚠ Live Data Error</h2>

                    <p>
                        ${
                            escapeHtml(
                                liveData.message ||
                                "Unable to fetch live data"
                            )
                        }
                    </p>

                    <small>
                        Upstox API response unavailable.
                    </small>

                </div>
            `;

            return;
        }

        // ======================================
        // STEP 3 — ANALYSIS DATA
        // ======================================

        const data =
            liveData.data || {};

        const price =
            Number(data.price || 0);

        const netChange =
            Number(data.netChange || 0);

        const changePercent =
            Number(data.changePercent || 0);

        const open =
            Number(data.open || 0);

        const high =
            Number(data.high || 0);

        const low =
            Number(data.low || 0);

        const close =
            Number(data.close || 0);

        const volume =
            Number(data.volume || 0);

        const oi =
            Number(data.oi || 0);

        const support =
            Number(data.support || 0);

        const resistance =
            Number(data.resistance || 0);

        const aiScore =
            Number(data.aiScore || 0);

        const entry =
            Number(data.entry || 0);

        const target1 =
            Number(data.target1 || 0);

        const target2 =
            Number(data.target2 || 0);

        const stopLoss =
            Number(data.stopLoss || 0);

        const riskReward =
            Number(data.riskReward || 0);

        const trend =
            data.trend || "SIDEWAYS";

        const signal =
            data.signal || "HOLD";

        const buyQuantity =
            Number(
                data.marketDepth?.buyQuantity || 0
            );

        const sellQuantity =
            Number(
                data.marketDepth?.sellQuantity || 0
            );

        // ======================================
        // SIGNAL DISPLAY
        // ======================================

        let signalIcon = "🟡";

        if (signal === "BUY") {
            signalIcon = "🟢";
        }

        if (signal === "SELL") {
            signalIcon = "🔴";
        }

        // ======================================
        // TREND DISPLAY
        // ======================================

        let trendIcon = "🟡";

        if (trend === "BULLISH") {
            trendIcon = "🟢";
        }

        if (trend === "BEARISH") {
            trendIcon = "🔴";
        }

        // ======================================
        // CHANGE DISPLAY
        // ======================================

        const changeIcon =
            netChange >= 0
                ? "▲"
                : "▼";

        // ======================================
        // FINAL DISPLAY
        // ======================================

        result.innerHTML = `

            <div class="status-card">

                <h2>
                    📊 ${escapeHtml(stock.name)}
                </h2>

                <p>
                    <b>
                        ${escapeHtml(stock.exchange)}
                        •
                        ${escapeHtml(stock.symbol)}
                    </b>
                </p>

                <hr>

                <h1>
                    ₹${formatPrice(price)}
                </h1>

                <h3>
                    ${changeIcon}
                    ${formatPrice(netChange)}
                    (${formatPrice(changePercent)}%)
                </h3>

                <hr>

                <h2>
                    ${signalIcon}
                    Signal:
                    <b>${escapeHtml(signal)}</b>
                </h2>

                <p>
                    ${trendIcon}
                    Trend:
                    <b>${escapeHtml(trend)}</b>
                </p>

                <p>
                    🤖 AI Score:
                    <b>${formatNumber(aiScore)}/100</b>
                </p>

                <hr>

                <h3>🎯 Trading Levels</h3>

                <p>
                    <b>Entry:</b>
                    ₹${formatPrice(entry)}
                </p>

                <p>
                    <b>Target 1:</b>
                    ₹${formatPrice(target1)}
                </p>

                <p>
                    <b>Target 2:</b>
                    ₹${formatPrice(target2)}
                </p>

                <p>
                    <b>Stop Loss:</b>
                    ₹${formatPrice(stopLoss)}
                </p>

                <p>
                    <b>Risk / Reward:</b>
                    1 : ${formatPrice(riskReward)}
                </p>

                <hr>

                <h3>📈 Technical Data</h3>

                <p>
                    <b>Open:</b>
                    ₹${formatPrice(open)}
                </p>

                <p>
                    <b>High:</b>
                    ₹${formatPrice(high)}
                </p>

                <p>
                    <b>Low:</b>
                    ₹${formatPrice(low)}
                </p>

                <p>
                    <b>Previous Close:</b>
                    ₹${formatPrice(close)}
                </p>

                <p>
                    <b>Support:</b>
                    ₹${formatPrice(support)}
                </p>

                <p>
                    <b>Resistance:</b>
                    ₹${formatPrice(resistance)}
                </p>

                <hr>

                <h3>📊 Market Data</h3>

                <p>
                    <b>Volume:</b>
                    ${formatNumber(volume)}
                </p>

                <p>
                    <b>OI:</b>
                    ${formatNumber(oi)}
                </p>

                <hr>

                <h3>📦 Market Depth</h3>

                <p>
                    🟢 Buy Quantity:
                    <b>${formatNumber(buyQuantity)}</b>
                </p>

                <p>
                    🔴 Sell Quantity:
                    <b>${formatNumber(sellQuantity)}</b>
                </p>

                <hr>

                <p>
                    🟢 Live Upstox Market Data
                </p>

                <small>
                    Instrument:
                    ${escapeHtml(stock.instrument)}
                </small>

            </div>
        `;

    } catch (error) {

        console.error(
            "Scanner Error:",
            error
        );

        result.innerHTML = `

            <div class="status-card">

                <h2>⚠ Connection Error</h2>

                <p>
                    Unable to connect to server.
                </p>

                <small>
                    ${escapeHtml(error.message)}
                </small>

            </div>

        `;
    }
}

// ==========================================
// PRICE FORMAT
// ==========================================

function formatPrice(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0.00";
    }

    return number.toLocaleString(
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

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString(
        "en-IN"
    );
}

// ==========================================
// SAFE HTML
// ==========================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// ENTER KEY SEARCH
// ==========================================

if (searchInput) {

    searchInput.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                searchStock();

            }

        }
    );

}

// ==========================================
// PAGE LOAD
// ==========================================

window.addEventListener(
    "load",
    function() {

        loadMarketStatus();

    }
);

// ==========================================
// AUTO REFRESH MARKET STATUS
// ==========================================

setInterval(
    loadMarketStatus,
    30000
);

// ==========================================
// AUTO REFRESH CURRENT STOCK
// ==========================================

let lastSearch =
    "";

setInterval(
    function() {

        if (
            searchInput &&
            searchInput.value.trim() !== ""
        ) {

            const current =
                searchInput.value.trim();

            if (current === lastSearch) {

                searchStock();

            } else {

                lastSearch =
                    current;

            }

        }

    },
    60000
);
