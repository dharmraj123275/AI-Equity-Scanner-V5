// ==========================================
// AI EQUITY SCANNER PRO V5
// PART 7 - LIVE STOCK ANALYSIS
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

        document.getElementById("marketStatus").innerText =
            data.market || "Market Status Unknown";

        document.getElementById("lastUpdate").innerText =
            `${data.date || ""} • ${data.time || ""}`;

    } catch (error) {

        document.getElementById("marketStatus").innerText =
            "⚠ Server Connection Error";

        document.getElementById("lastUpdate").innerText =
            "Unable to connect";

    }
}


// ==========================================
// NUMBER FORMAT
// ==========================================

function formatNumber(value) {

    return Number(value || 0)
        .toLocaleString("en-IN");
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
                    Example: Reliance, TCS, SBI, Infosys
                </p>

            </div>
        `;

        return;
    }


    result.innerHTML = `
        <div class="status-card">

            <h2>🔎 Scanning ${query}...</h2>

            <p>
                Fetching Upstox market data
            </p>

        </div>
    `;


    try {

        // ======================================
        // STEP 1 - SEARCH STOCK
        // ======================================

        const searchResponse =
            await fetch(
                "/api/search?q=" +
                encodeURIComponent(query)
            );


        const searchData =
            await searchResponse.json();


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
                        <b>${query}</b>
                    </p>

                </div>
            `;

            return;
        }


        // First matching stock
        const stock =
            searchData.results[0];


        // ======================================
        // STEP 2 - LIVE UPSTOX DATA
        // ======================================

        const liveResponse =
            await fetch(
                "/api/live?instrument=" +
                encodeURIComponent(stock.instrument)
            );


        const liveData =
            await liveResponse.json();


        console.log("LIVE DATA:", liveData);


        if (!liveData.success) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>⚠ API Error</h2>

                    <p>
                        ${liveData.message ||
                        "Unable to fetch live data"}
                    </p>

                </div>
            `;

            return;
        }


        // ======================================
        // STEP 3 - GET QUOTE
        // ======================================

        const quoteData =
            liveData.data?.data || {};


        let quote = null;


        if (quoteData[stock.instrument]) {

            quote =
                quoteData[stock.instrument];

        } else {

            const keys =
                Object.keys(quoteData);

            if (keys.length > 0) {

                quote =
                    quoteData[keys[0]];

            }

        }


        if (!quote) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>⚠ No Quote Data</h2>

                    <p>
                        Live data unavailable for
                        <b>${stock.name}</b>
                    </p>

                </div>
            `;

            return;
        }


        // ======================================
        // PRICE
        // ======================================

        const price =
            Number(quote.last_price || 0);


        const open =
            Number(quote.ohlc?.open || 0);


        const high =
            Number(quote.ohlc?.high || 0);


        const low =
            Number(quote.ohlc?.low || 0);


        const previousClose =
            Number(quote.ohlc?.close || 0);


        const volume =
            Number(quote.volume || 0);


        const oi =
            Number(quote.oi || 0);


        // ======================================
        // CHANGE
        // ======================================

        const change =
            previousClose > 0
                ? price - previousClose
                : 0;


        const changePercent =
            previousClose > 0
                ? (change / previousClose) * 100
                : 0;


        // ======================================
        // DAY RANGE
        // ======================================

        const dayRange =
            high > low
                ? high - low
                : 0;


        const rangePosition =
            dayRange > 0
                ? ((price - low) / dayRange) * 100
                : 50;


        // ======================================
        // SUPPORT / RESISTANCE
        // ======================================

        const support =
            low > 0
                ? low
                : price * 0.99;


        const resistance =
            high > 0
                ? high
                : price * 1.01;


        // ======================================
        // SIMPLE TREND
        // ======================================

        let trend =
            "SIDEWAYS";


        if (changePercent >= 1) {

            trend =
                "STRONG BULLISH";

        } else if (changePercent > 0) {

            trend =
                "BULLISH";

        } else if (changePercent <= -1) {

            trend =
                "STRONG BEARISH";

        } else if (changePercent < 0) {

            trend =
                "BEARISH";

        }


        // ======================================
        // AI SCORE
        // ======================================

        let aiScore = 50;


        if (changePercent > 0) {

            aiScore += 15;

        }

        if (changePercent >= 1) {

            aiScore += 10;

        }

        if (rangePosition >= 70) {

            aiScore += 10;

        }

        if (rangePosition <= 30) {

            aiScore -= 10;

        }

        if (changePercent < -1) {

            aiScore -= 15;

        }


        // Keep score between 0 and 100
        aiScore =
            Math.max(
                0,
                Math.min(
                    100,
                    aiScore
                )
            );


        // ======================================
        // SIGNAL
        // ======================================

        let signal =
            "HOLD";


        if (
            aiScore >= 75 &&
            changePercent > 0
        ) {

            signal =
                "STRONG BUY";

        } else if (
            aiScore >= 60 &&
            changePercent > 0
        ) {

            signal =
                "BUY";

        } else if (
            aiScore <= 30 &&
            changePercent < 0
        ) {

            signal =
                "STRONG SELL";

        } else if (
            aiScore <= 40 &&
            changePercent < 0
        ) {

            signal =
                "SELL";

        }


        // ======================================
        // ENTRY / TARGET / STOP LOSS
        // ======================================

        let entry =
            price;


        let target =
            price;


        let stopLoss =
            price;


        if (signal === "BUY" ||
            signal === "STRONG BUY") {

            entry =
                price;

            target =
                resistance > price
                    ? resistance
                    : price * 1.02;

            stopLoss =
                support < price
                    ? support
                    : price * 0.98;

        }


        if (signal === "SELL" ||
            signal === "STRONG SELL") {

            entry =
                price;

            target =
                support < price
                    ? support
                    : price * 0.98;

            stopLoss =
                resistance > price
                    ? resistance
                    : price * 1.02;

        }


        // ======================================
        // SIGNAL EMOJI
        // ======================================

        let signalEmoji =
            "🟡";


        if (
            signal === "BUY" ||
            signal === "STRONG BUY"
        ) {

            signalEmoji =
                "🟢";

        }


        if (
            signal === "SELL" ||
            signal === "STRONG SELL"
        ) {

            signalEmoji =
                "🔴";

        }


        // ======================================
        // DISPLAY RESULT
        // ======================================

        result.innerHTML = `

            <div class="status-card">

                <h2>
                    📊 ${stock.name}
                </h2>

                <h1>
                    ₹${price.toFixed(2)}
                </h1>


                <p>
                    <b>Change:</b>
                    ${change.toFixed(2)}
                    (${changePercent.toFixed(2)}%)
                </p>


                <p>
                    <b>Open:</b>
                    ₹${open.toFixed(2)}
                </p>


                <p>
                    <b>Day High:</b>
                    ₹${high.toFixed(2)}
                </p>


                <p>
                    <b>Day Low:</b>
                    ₹${low.toFixed(2)}
                </p>


                <p>
                    <b>Volume:</b>
                    ${formatNumber(volume)}
                </p>


                <p>
                    <b>OI:</b>
                    ${formatNumber(oi)}
                </p>


                <hr>


                <h3>
                    📈 Trend:
                    ${trend}
                </h3>


                <h3>
                    🤖 AI Score:
                    ${aiScore}/100
                </h3>


                <hr>


                <p>
                    <b>🟢 Support:</b>
                    ₹${support.toFixed(2)}
                </p>


                <p>
                    <b>🔴 Resistance:</b>
                    ₹${resistance.toFixed(2)}
                </p>


                <p>
                    <b>🎯 Entry:</b>
                    ₹${entry.toFixed(2)}
                </p>


                <p>
                    <b>🎯 Target:</b>
                    ₹${target.toFixed(2)}
                </p>


                <p>
                    <b>🛑 Stop Loss:</b>
                    ₹${stopLoss.toFixed(2)}
                </p>


                <hr>


                <h2>
                    ${signalEmoji}
                    Signal: ${signal}
                </h2>


                <p>
                    🟢 Upstox Market Data
                </p>


                <small>
                    NSE • ${stock.symbol}
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

                <h2>
                    ⚠ Connection Error
                </h2>

                <p>
                    Unable to connect to server.
                </p>

                <small>
                    ${error.message}
                </small>

            </div>

        `;

    }

}


// ==========================================
// ENTER KEY
// ==========================================

searchInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            searchStock();

        }

    }
);


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
