// ==========================================
// AI EQUITY SCANNER PRO V5
// Frontend JavaScript
// ==========================================

const searchInput = document.getElementById("search");
const resultBox = document.getElementById("result");


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
            await fetch("/api/status");

        const data =
            await response.json();

        marketStatus.innerText =
            data.market || "Market Status Unknown";

        lastUpdate.innerText =
            `${data.date || ""} • ${data.time || ""}`;

    } catch (error) {

        marketStatus.innerText =
            "🔴 Server Connection Error";

        lastUpdate.innerText =
            "Unable to load market status";

    }
}


// ==========================================
// SEARCH STOCK
// ==========================================

async function searchStock() {

    const query =
        searchInput.value.trim();

    if (!query) {

        resultBox.innerHTML = `
            <div class="status-card">
                <h2>⚠️ Enter Stock Name</h2>
                <p>Example: RELIANCE, SBIN, INFY</p>
            </div>
        `;

        return;
    }


    resultBox.innerHTML = `
        <div class="status-card">
            <h2>🔎 Searching...</h2>
            <p>Finding ${query.toUpperCase()}</p>
        </div>
    `;


    try {

        // --------------------------------------
        // STEP 1: SEARCH STOCK
        // --------------------------------------

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

            resultBox.innerHTML = `
                <div class="status-card">
                    <h2>❌ Stock Not Found</h2>
                    <p>
                        No stock found for
                        <b>${query.toUpperCase()}</b>
                    </p>
                </div>
            `;

            return;
        }


        // --------------------------------------
        // FIRST SEARCH RESULT
        // --------------------------------------

        const stock =
            searchData.results[0];

        const instrument =
            stock.instrument;


        // --------------------------------------
        // STEP 2: GET LIVE QUOTE
        // --------------------------------------

        const liveResponse =
            await fetch(
                "/api/live?instrument=" +
                encodeURIComponent(instrument)
            );


        const liveData =
            await liveResponse.json();


        if (!liveData.success) {

            resultBox.innerHTML = `
                <div class="status-card">
                    <h2>⚠️ API Error</h2>
                    <p>
                        ${liveData.message || "Unable to fetch live data"}
                    </p>
                </div>
            `;

            return;
        }


        // --------------------------------------
        // STEP 3: EXTRACT UPSTOX DATA
        // --------------------------------------

        const quoteData =
            liveData.data?.data || {};

        const quote =
            quoteData[instrument];


        if (!quote) {

            resultBox.innerHTML = `
                <div class="status-card">
                    <h2>⚠️ No Quote Data</h2>
                    <p>
                        Live data not available for
                        ${stock.name}
                    </p>
                </div>
            `;

            return;
        }


        // --------------------------------------
        // PRICE
        // --------------------------------------

        const price =
            quote.last_price ?? 0;


        // --------------------------------------
        // PREVIOUS CLOSE
        // --------------------------------------

        const previousClose =
            quote.ohlc?.close ?? 0;


        // --------------------------------------
        // CHANGE
        // --------------------------------------

        const change =
            previousClose
                ? (price - previousClose).toFixed(2)
                : "0.00";


        // --------------------------------------
        // CHANGE %
        // --------------------------------------

        const changePercent =
            previousClose
                ? (((price - previousClose) /
                    previousClose) * 100).toFixed(2)
                : "0.00";


        // --------------------------------------
        // VOLUME
        // --------------------------------------

        const volume =
            quote.volume ?? 0;


        // --------------------------------------
        // OI
        // --------------------------------------

        const oi =
            quote.oi ?? 0;


        // --------------------------------------
        // SIMPLE SIGNAL
        // --------------------------------------

        let signal = "HOLD";

        if (changePercent >= 1) {

            signal = "STRONG BUY";

        } else if (changePercent > 0) {

            signal = "BUY";

        } else if (changePercent <= -1) {

            signal = "STRONG SELL";

        } else if (changePercent < 0) {

            signal = "SELL";

        }


        // --------------------------------------
        // DISPLAY RESULT
        // --------------------------------------

        resultBox.innerHTML = `

            <div class="status-card">

                <h2>
                    📊 ${stock.symbol}
                </h2>

                <p>
                    ${stock.name}
                </p>

                <hr>

                <h1>
                    ₹${Number(price).toFixed(2)}
                </h1>

                <p>
                    <b>Change:</b>
                    ${change}
                    (${changePercent}%)
                </p>

                <p>
                    <b>Volume:</b>
                    ${Number(volume).toLocaleString("en-IN")}
                </p>

                <p>
                    <b>OI:</b>
                    ${Number(oi).toLocaleString("en-IN")}
                </p>

                <hr>

                <h2>
                    Signal: ${signal}
                </h2>

                <p>
                    🟢 Live Upstox Market Data
                </p>

                <p>
                    <small>
                        NSE • ${stock.symbol}
                    </small>
                </p>

            </div>

        `;

    } catch (error) {

        console.error(
            "Scanner Error:",
            error
        );

        resultBox.innerHTML = `

            <div class="status-card">

                <h2>❌ Connection Error</h2>

                <p>
                    Unable to connect to server.
                </p>

            </div>

        `;

    }
}


// ==========================================
// ENTER KEY SEARCH
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
// INITIAL LOAD
// ==========================================

window.addEventListener(
    "load",
    function() {

        loadMarketStatus();

    }
);


// ==========================================
// AUTO UPDATE MARKET STATUS
// ==========================================

setInterval(
    loadMarketStatus,
    30000
);
