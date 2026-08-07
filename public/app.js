// =====================================
// AI EQUITY SCANNER V5 - APP.JS
// =====================================

const resultBox = document.getElementById("result");
const searchBox = document.getElementById("search");

// =====================================
// STOCK SEARCH
// =====================================

async function searchStock() {

    const query = searchBox.value.trim();

    if (!query) {
        resultBox.innerHTML = `
            <h3>🔍 Enter a stock name or symbol</h3>
        `;
        return;
    }

    resultBox.innerHTML = `
        <h3>⏳ Searching ${query}...</h3>
    `;

    try {

        const response = await fetch(
            "/api/search?q=" +
            encodeURIComponent(query)
        );

        const data = await response.json();

        if (!data.success) {

            resultBox.innerHTML = `
                <h3>❌ Search failed</h3>
                <p>${data.message || ""}</p>
            `;

            return;
        }

        if (data.results.length === 0) {

            resultBox.innerHTML = `
                <h3>❌ Stock not found</h3>
                <p>Try another NSE stock symbol.</p>
            `;

            return;
        }

        showSearchResults(data.results);

    } catch (error) {

        console.error(error);

        resultBox.innerHTML = `
            <h3>❌ Server connection failed</h3>
            <p>Please try again.</p>
        `;

    }
}


// =====================================
// SHOW SEARCH RESULTS
// =====================================

function showSearchResults(stocks) {

    let html = `
        <h2>🔎 Search Results</h2>
    `;

    stocks.forEach(stock => {

        html += `
            <div
                style="
                    background:#0f172a;
                    padding:15px;
                    margin-top:10px;
                    border-radius:10px;
                    cursor:pointer;
                "
                onclick="loadLiveQuote('${stock.instrument}','${stock.symbol}')"
            >

                <h3>${stock.symbol}</h3>

                <p>
                    ${stock.name}
                </p>

                <small>
                    ${stock.exchange}
                </small>

            </div>
        `;

    });

    resultBox.innerHTML = html;
}


// =====================================
// LIVE QUOTE
// =====================================

async function loadLiveQuote(
    instrument,
    symbol
) {

    resultBox.innerHTML = `
        <h2>⏳ Loading ${symbol}...</h2>
    `;

    try {

        const response = await fetch(
            "/api/live?instrument=" +
            encodeURIComponent(instrument)
        );

        const data = await response.json();

        if (!data.success) {

            resultBox.innerHTML = `
                <h2>❌ Live Data Error</h2>
                <p>
                    ${data.message || "Unable to fetch data"}
                </p>
            `;

            return;
        }

        displayQuote(data.data, symbol);

    } catch (error) {

        console.error(error);

        resultBox.innerHTML = `
            <h2>❌ Connection Error</h2>
            <p>Unable to connect to Upstox.</p>
        `;

    }

}


// =====================================
// DISPLAY QUOTE
// =====================================

function displayQuote(data, symbol) {

    console.log("Upstox Data:", data);

    /*
       Upstox response structure can contain
       instrument-key based objects.

       We extract the first available quote.
    */

    const quoteData =
        Object.values(data.data || {})[0] || {};

    const lastPrice =
        quoteData.last_price ??
        quoteData.last_traded_price ??
        0;

    const volume =
        quoteData.volume ??
        0;

    const open =
        quoteData.ohlc?.open ??
        "-";

    const high =
        quoteData.ohlc?.high ??
        "-";

    const low =
        quoteData.ohlc?.low ??
        "-";

    const close =
        quoteData.ohlc?.close ??
        "-";

    resultBox.innerHTML = `

        <h2>📈 ${symbol}</h2>

        <div
            style="
                background:#0f172a;
                padding:20px;
                border-radius:12px;
                margin-top:15px;
            "
        >

            <h1>
                ₹${Number(lastPrice).toFixed(2)}
            </h1>

            <hr style="margin:15px 0;">

            <p>
                <b>Open:</b> ₹${open}
            </p>

            <p>
                <b>High:</b> ₹${high}
            </p>

            <p>
                <b>Low:</b> ₹${low}
            </p>

            <p>
                <b>Previous Close:</b> ₹${close}
            </p>

            <p>
                <b>Volume:</b> ${volume}
            </p>

        </div>

        <button
            onclick="loadLiveQuote('${Object.keys(data.data || {})[0]}','${symbol}')"
            style="
                margin-top:15px;
                padding:10px 15px;
                border:0;
                border-radius:8px;
                cursor:pointer;
            "
        >
            🔄 Refresh
        </button>
    `;
}


// =====================================
// MARKET STATUS
// =====================================

async function loadMarketStatus() {

    const statusBox =
        document.getElementById("marketStatus");

    const updateBox =
        document.getElementById("lastUpdate");

    if (!statusBox) return;

    try {

        const response =
            await fetch("/api/status");

        const data =
            await response.json();

        statusBox.innerHTML =
            `🟢 ${data.market || "Market Ready"}`;

        if (updateBox) {

            updateBox.innerHTML =
                "Server: 🟢 Online";

        }

    } catch (error) {

        statusBox.innerHTML =
            "🔴 Server Offline";

        if (updateBox) {

            updateBox.innerHTML =
                "Unable to connect";

        }

    }

}


// =====================================
// SEARCH ENTER KEY
// =====================================

if (searchBox) {

    searchBox.addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                searchStock();

            }

        }
    );

}


// =====================================
// START
// =====================================

window.addEventListener(
    "load",
    function() {

        loadMarketStatus();

    }
);
