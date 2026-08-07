// ==========================================
// AI EQUITY SCANNER PRO V5
// PART 7B - LIVE AI ANALYSIS FRONTEND
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
// SEARCH STOCK
// ==========================================

async function searchStock() {

    const query =
        searchInput.value.trim();

    if (!query) {

        result.innerHTML = `
            <div class="status-card">
                <h2>⚠ Enter Stock Name</h2>
                <p>Example: Reliance, TCS, SBI, Infosys</p>
            </div>
        `;

        return;
    }


    result.innerHTML = `
        <div class="status-card">
            <h2>🔎 Scanning ${query}</h2>
            <p>Getting Upstox market data...</p>
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
                        No stock found for "${query}"
                    </p>
                </div>
            `;

            return;
        }


        const stock =
            searchData.results[0];


        // ======================================
        // STEP 2 - LIVE API
        // ======================================

        const liveResponse =
            await fetch(
                "/api/live?instrument=" +
                encodeURIComponent(stock.instrument)
            );


        const liveData =
            await liveResponse.json();


        console.log(
            "LIVE API RESPONSE:",
            liveData
        );


        if (!liveData.success) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>⚠ No Quote Data</h2>

                    <p>
                        ${liveData.message ||
                        "Live data unavailable"}
                    </p>

                    <small>
                        ${stock.name}
                    </small>

                </div>
            `;

            return;
        }


        // ======================================
        // IMPORTANT
        // PART 7A RESPONSE
        // ======================================

        const data =
            liveData.data;


        if (!data) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>⚠ No Market Data</h2>

                    <p>
                        Upstox returned empty data.
                    </p>

                </div>
            `;

            return;
        }


        // ======================================
        // PRICE DATA
        // ======================================

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


        // ======================================
        // AI ANALYSIS
        // ======================================

        const support =
            Number(data.support || 0);

        const resistance =
            Number(data.resistance || 0);

        const trend =
            data.trend || "SIDEWAYS";

        const aiScore =
            Number(data.aiScore || 0);

        const signal =
            data.signal || "HOLD";


        // ======================================
        // TRADE LEVELS
        // ======================================

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


        // ======================================
        // MARKET DEPTH
        // ======================================

        const buyQuantity =
            Number(
                data.marketDepth?.buyQuantity || 0
            );

        const sellQuantity =
            Number(
                data.marketDepth?.sellQuantity || 0
            );


        // ======================================
        // FORMATTERS
        // ======================================

        function money(value) {

            return "₹" +
                Number(value || 0)
                .toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );

        }


        function number(value) {

            return Number(value || 0)
                .toLocaleString("en-IN");

        }


        const changeClass =
            netChange > 0
                ? "positive"
                : netChange < 0
                    ? "negative"
                    : "neutral";


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


        let trendIcon = "➡️";

        if (trend === "BULLISH") {
            trendIcon = "📈";
        }

        if (trend === "BEARISH") {
            trendIcon = "📉";
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
                    ${money(price)}
                </h1>


                <p class="${changeClass}">
                    <b>Change:</b>
                    ${netChange >= 0 ? "+" : ""}
                    ${netChange.toFixed(2)}
                    (${changePercent >= 0 ? "+" : ""}
                    ${changePercent.toFixed(2)}%)
                </p>


                <p>
                    <b>Open:</b>
                    ${money(open)}
                </p>


                <p>
                    <b>Day High:</b>
                    ${money(high)}
                </p>


                <p>
                    <b>Day Low:</b>
                    ${money(low)}
                </p>


                <p>
                    <b>Previous Close:</b>
                    ${money(close)}
                </p>


                <p>
                    <b>Volume:</b>
                    ${number(volume)}
                </p>


                <p>
                    <b>OI:</b>
                    ${number(oi)}
                </p>


                <hr>


                <h3>
                    ${trendIcon}
                    Trend: ${trend}
                </h3>


                <h3>
                    🤖 AI Score:
                    ${aiScore}/100
                </h3>


                <hr>


                <p>
                    🟢 <b>Support:</b>
                    ${money(support)}
                </p>


                <p>
                    🔴 <b>Resistance:</b>
                    ${money(resistance)}
                </p>


                <p>
                    🎯 <b>Entry:</b>
                    ${money(entry)}
                </p>


                <p>
                    🎯 <b>Target 1:</b>
                    ${money(target1)}
                </p>


                <p>
                    🎯 <b>Target 2:</b>
                    ${money(target2)}
                </p>


                <p>
                    🛑 <b>Stop Loss:</b>
                    ${money(stopLoss)}
                </p>


                <p>
                    ⚖️ <b>Risk : Reward:</b>
                    1 : ${riskReward.toFixed(2)}
                </p>


                <hr>


                <h2>
                    ${signalIcon}
                    Signal: ${signal}
                </h2>


                <p>
                    🟢 Upstox Market Data
                </p>


                <small>
                    NSE • ${stock.symbol}
                </small>


                <hr>


                <p>
                    🟢 <b>Buy Quantity:</b>
                    ${number(buyQuantity)}
                </p>


                <p>
                    🔴 <b>Sell Quantity:</b>
                    ${number(sellQuantity)}
                </p>

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
                    Unable to connect to scanner.
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
// AUTO REFRESH STATUS
// ==========================================

setInterval(
    loadMarketStatus,
    30000
);
