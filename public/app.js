// ==========================================
// AI EQUITY SCANNER PRO V5
// COMPLETE APP.JS
// ==========================================

let selectedInstrument = "";
let selectedSymbol = "";

// ==========================================
// MARKET STATUS
// ==========================================

async function loadMarketStatus() {

    try {

        const response =
            await fetch("/api/status");

        const data =
            await response.json();

        document.getElementById("marketStatus").textContent =
            data.market || "Market status unavailable";

        document.getElementById("lastUpdate").textContent =
            `${data.date || ""} ${data.time || ""}`;

    } catch (error) {

        console.error(
            "STATUS ERROR:",
            error
        );

        document.getElementById("marketStatus").textContent =
            "⚠ Market status unavailable";

    }

}


// ==========================================
// SEARCH STOCK
// ==========================================

async function searchStock() {

    const input =
        document.getElementById("search");

    const query =
        input.value.trim();

    if (!query) {

        showMessage(
            "⚠ Please enter stock symbol",
            "warning"
        );

        return;

    }

    const result =
        document.getElementById("result");

    result.innerHTML = `
        <div class="loading">
            🔎 Searching ${escapeHtml(query)}...
        </div>
    `;

    try {

        const response =
            await fetch(
                `/api/search?q=${encodeURIComponent(query)}`
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Search failed"
            );

        }

        const results =
            Array.isArray(data.results)
                ? data.results
                : [];

        if (results.length === 0) {

            result.innerHTML = `
                <div class="error-card">
                    ❌ No stock found for
                    <strong>${escapeHtml(query)}</strong>
                </div>
            `;

            return;

        }

        renderSearchResults(results);

    } catch (error) {

        console.error(
            "SEARCH ERROR:",
            error
        );

        result.innerHTML = `
            <div class="error-card">
                ⚠ Search Error
                <br>
                ${escapeHtml(error.message)}
            </div>
        `;

    }

}


// ==========================================
// RENDER SEARCH RESULTS
// ==========================================

function renderSearchResults(results) {

    const result =
        document.getElementById("result");

    let html = `
        <div class="search-results">

            <h3>🔎 Search Results</h3>
    `;

    results.forEach(
        (item, index) => {

            const symbol =
                item.symbol || "";

            const name =
                item.name || "";

            const exchange =
                item.exchange || "";

            const segment =
                item.segment || "";

            const instrument =
                item.instrument || "";

            html += `

                <div class="stock-result">

                    <div>

                        <strong>
                            ${escapeHtml(symbol)}
                        </strong>

                        <div>
                            ${escapeHtml(name)}
                        </div>

                        <small>
                            ${escapeHtml(exchange)}
                            •
                            ${escapeHtml(segment)}
                        </small>

                    </div>

                    <button
                        onclick="selectStock(${index})"
                    >
                        📊 Analyze
                    </button>

                </div>

            `;

        }
    );

    html += `
        </div>

        <div id="hiddenResults"
             style="display:none;">
    `;

    results.forEach(
        (item, index) => {

            html += `
                <div
                    id="stock-${index}"
                    data-symbol="${escapeAttr(item.symbol || "")}"
                    data-instrument="${escapeAttr(item.instrument || "")}"
                ></div>
            `;

        }
    );

    html += `
        </div>
    `;

    result.innerHTML = html;

    // Store search results globally
    window.searchResults = results;

}


// ==========================================
// SELECT STOCK
// ==========================================

async function selectStock(index) {

    const item =
        window.searchResults?.[index];

    if (!item) {

        showMessage(
            "⚠ Stock selection failed",
            "warning"
        );

        return;

    }

    const symbol =
        item.symbol || "";

    const instrument =
        item.instrument || "";

    selectedSymbol =
        symbol;

    selectedInstrument =
        instrument;

    console.log(
        "SELECTED STOCK:",
        item
    );

    // ======================================
    // IMPORTANT
    // ======================================

    if (!instrument) {

        document.getElementById(
            "result"
        ).innerHTML = `

            <div class="error-card">

                ⚠ <strong>
                    ${escapeHtml(symbol)}
                </strong> selected.

                <br><br>

                This search result does not contain
                an Upstox instrument key.

                <br><br>

                Source:
                <strong>
                    ${escapeHtml(
                        item.source ||
                        "Search"
                    )}
                </strong>

                <br><br>

                Please make sure Upstox search
                is working and try again.

            </div>

        `;

        return;

    }

    // ======================================
    // LOAD LIVE DATA
    // ======================================

    await loadLiveData(
        instrument,
        symbol,
        item.name || symbol
    );

}


// ==========================================
// LOAD LIVE DATA
// ==========================================

async function loadLiveData(
    instrument,
    symbol,
    name
) {

    const result =
        document.getElementById("result");

    result.innerHTML = `

        <div class="loading">

            📡 Loading live data...

            <br>

            <small>
                ${escapeHtml(symbol)}
            </small>

        </div>

    `;

    try {

        const response =
            await fetch(
                `/api/live?instrument=${encodeURIComponent(instrument)}`
            );

        const data =
            await response.json();

        console.log(
            "LIVE RESPONSE:",
            data
        );

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Live data unavailable"
            );

        }

        if (
            !data.success ||
            !data.data
        ) {

            throw new Error(
                data.message ||
                "Invalid live data"
            );

        }

        renderAnalysis(
            data.data,
            symbol,
            name,
            instrument
        );

    } catch (error) {

        console.error(
            "LIVE DATA ERROR:",
            error
        );

        result.innerHTML = `

            <div class="error-card">

                ⚠ <strong>
                    Live Data Error
                </strong>

                <br><br>

                ${escapeHtml(
                    error.message
                )}

                <br><br>

                <small>
                    Upstox API response unavailable.
                </small>

            </div>

        `;

    }

}


// ==========================================
// RENDER ANALYSIS
// ==========================================

function renderAnalysis(
    data,
    symbol,
    name,
    instrument
) {

    const result =
        document.getElementById("result");

    const signal =
        data.signal || "HOLD";

    const trend =
        data.trend || "SIDEWAYS";

    const signalClass =
        signal === "BUY"
            ? "buy"
            : signal === "SELL"
                ? "sell"
                : "hold";

    const depth =
        data.marketDepth || {};

    result.innerHTML = `

        <div class="analysis-card">

            <div class="analysis-header">

                <div>

                    <h2>
                        ${escapeHtml(symbol)}
                    </h2>

                    <p>
                        ${escapeHtml(name)}
                    </p>

                </div>

                <div class="signal ${signalClass}">
                    ${signal}
                </div>

            </div>


            <div class="price-section">

                <div class="price">

                    ₹${formatNumber(
                        data.price
                    )}

                </div>

                <div class="
                    ${data.netChange >= 0
                        ? "positive"
                        : "negative"}
                ">

                    ${data.netChange >= 0
                        ? "+"
                        : ""}

                    ${formatNumber(
                        data.netChange
                    )}

                    (${formatNumber(
                        data.changePercent
                    )}%)

                </div>

            </div>


            <div class="grid">

                ${metric(
                    "AI Score",
                    `${data.aiScore}/100`
                )}

                ${metric(
                    "Trend",
                    trend
                )}

                ${metric(
                    "Open",
                    `₹${formatNumber(data.open)}`
                )}

                ${metric(
                    "High",
                    `₹${formatNumber(data.high)}`
                )}

                ${metric(
                    "Low",
                    `₹${formatNumber(data.low)}`
                )}

                ${metric(
                    "Volume",
                    formatNumber(data.volume)
                )}

                ${metric(
                    "OI",
                    formatNumber(data.oi)
                )}

                ${metric(
                    "Risk/Reward",
                    `1 : ${formatNumber(
                        data.riskReward
                    )}`
                )}

            </div>


            <div class="levels">

                <h3>
                    🎯 Trading Levels
                </h3>

                ${level(
                    "Entry",
                    data.entry
                )}

                ${level(
                    "Target 1",
                    data.target1
                )}

                ${level(
                    "Target 2",
                    data.target2
                )}

                ${level(
                    "Stop Loss",
                    data.stopLoss
                )}

                ${level(
                    "Support",
                    data.support
                )}

                ${level(
                    "Resistance",
                    data.resistance
                )}

            </div>


            <div class="depth">

                <h3>
                    📊 Market Depth
                </h3>

                <div class="depth-grid">

                    <div>
                        🟢 Buy Qty
                        <strong>
                            ${formatNumber(
                                depth.buyQuantity
                            )}
                        </strong>
                    </div>

                    <div>
                        🔴 Sell Qty
                        <strong>
                            ${formatNumber(
                                depth.sellQuantity
                            )}
                        </strong>
                    </div>

                </div>

            </div>


            <div class="instrument">

                Instrument:

                <code>
                    ${escapeHtml(
                        instrument
                    )}
                </code>

            </div>

        </div>

    `;

}


// ==========================================
// METRIC
// ==========================================

function metric(
    title,
    value
) {

    return `

        <div class="metric">

            <span>
                ${escapeHtml(title)}
            </span>

            <strong>
                ${escapeHtml(
                    String(value)
                )}
            </strong>

        </div>

    `;

}


// ==========================================
// LEVEL
// ==========================================

function level(
    title,
    value
) {

    return `

        <div class="level">

            <span>
                ${escapeHtml(title)}
            </span>

            <strong>
                ₹${formatNumber(value)}
            </strong>

        </div>

    `;

}


// ==========================================
// NUMBER FORMAT
// ==========================================

function formatNumber(
    value
) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

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
// MESSAGE
// ==========================================

function showMessage(
    message,
    type = "info"
) {

    document.getElementById(
        "result"
    ).innerHTML = `

        <div class="${type}-card">

            ${escapeHtml(message)}

        </div>

    `;

}


// ==========================================
// SECURITY HELPERS
// ==========================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttr(
    value
) {

    return escapeHtml(
        value
    );

}


// ==========================================
// ENTER KEY SEARCH
// ==========================================

document
    .getElementById("search")
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                searchStock();

            }

        }
    );


// ==========================================
// INITIALIZE
// ==========================================

loadMarketStatus();

setInterval(
    loadMarketStatus,
    30000
);
