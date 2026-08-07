// ==========================================
// AI EQUITY SCANNER PRO V5
// LIVE UPSTOX STOCK SCANNER
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
            <h2>🔎 Searching...</h2>
            <p>Finding ${query}</p>
        </div>
    `;


    try {

        // ======================================
        // STEP 1: SEARCH STOCK
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
                    <p>No stock found for "${query}"</p>
                </div>
            `;

            return;
        }


        // First matching stock
        const stock =
            searchData.results[0];


        // ======================================
        // STEP 2: GET LIVE UPSTOX DATA
        // ======================================

        const liveResponse =
            await fetch(
                "/api/live?instrument=" +
                encodeURIComponent(stock.instrument)
            );


        const liveData =
            await liveResponse.json();


        console.log("SEARCH DATA:", searchData);
        console.log("LIVE DATA:", liveData);


        if (!liveData.success) {

            result.innerHTML = `
                <div class="status-card">
                    <h2>⚠ API Error</h2>
                    <p>
                        ${liveData.message || "Unable to fetch live data"}
                    </p>
                </div>
            `;

            return;
        }


        // ======================================
        // STEP 3: FIND QUOTE
        // ======================================

        const quoteData =
            liveData.data?.data || {};


        let quote = null;


        // Exact instrument key
        if (quoteData[stock.instrument]) {

            quote =
                quoteData[stock.instrument];

        } else {

            // Try first available quote
            const keys =
                Object.keys(quoteData);

            if (keys.length > 0) {

                quote =
                    quoteData[keys[0]];

            }

        }


        // ======================================
        // NO QUOTE
        // ======================================

        if (!quote) {

            result.innerHTML = `
                <div class="status-card">

                    <h2>⚠ No Quote Data</h2>

                    <p>
                        Data is currently unavailable for
                        <b>${stock.name}</b>
                    </p>

                    <p>
                        Market may be closed or Upstox
                        has not returned a quote.
                    </p>

                </div>
            `;

            return;
        }


        // ======================================
        // PRICE DATA
        // ======================================

        const price =
            Number(quote.last_price || 0);

        const volume =
            quote.volume || 0;

        const oi =
            quote.oi || 0;

        const close =
            Number(
                quote.ohlc?.close || 0
            );

        const change =
            close > 0
                ? price - close
                : 0;


        // ======================================
        // SIMPLE SIGNAL
        // ======================================

        let signal = "HOLD";

        if (change > 0) {

            signal = "BUY";

        } else if (change < 0) {

            signal = "SELL";

        }


        // ======================================
        // DISPLAY
        // ======================================

        result.innerHTML = `

            <div class="status-card">

                <h2>📊 ${stock.name}</h2>

                <h1>
                    ₹${price.toFixed(2)}
                </h1>

                <p>
                    <b>Change:</b>
                    ${change.toFixed(2)}
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
                    Signal:
                    ${signal}
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

                <h2>⚠ Connection Error</h2>

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
