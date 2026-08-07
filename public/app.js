async function scanStock() {

    const input = document.getElementById("search");
    const result = document.getElementById("result");

    const stock = input.value.trim().toUpperCase();

    if (!stock) {
        result.innerHTML = `
            <h2>⚠️ Enter a stock name</h2>
            <p>Example: RELIANCE</p>
        `;
        return;
    }

    result.innerHTML = `
        <h2>🔄 Loading...</h2>
        <p>Fetching live Upstox data...</p>
    `;

    try {

        const response = await fetch(
            "/api/live?symbol=" + encodeURIComponent(stock)
        );

        const responseData = await response.json();

        console.log("UPSTOX RESPONSE:", responseData);

        if (!responseData.success) {
            result.innerHTML = `
                <h2>⚠️ API Error</h2>
                <p>${responseData.message || "Unable to fetch data"}</p>
            `;
            return;
        }

        /*
         * Actual API structure:
         *
         * responseData
         *   └── data
         *       └── data
         *           └── NSE_EQ|RELIANCE
         */

        const marketData = responseData.data?.data;

        if (!marketData) {
            throw new Error("Market data not found");
        }

        const keys = Object.keys(marketData);

        if (keys.length === 0) {
            throw new Error("No stock data found");
        }

        const market = marketData[keys[0]];

        const price = market.last_price ?? "-";
        const volume = market.volume ?? "-";
        const oi = market.oi ?? "-";
        const change = market.net_change ?? 0;

        const symbol =
            market.symbol ||
            stock;

        let signal = "HOLD";

        if (Number(change) > 0) {
            signal = "BUY";
        }

        if (Number(change) < 0) {
            signal = "SELL";
        }

        result.innerHTML = `

            <div class="stock-card">

                <h2>📊 ${symbol}</h2>

                <h1>₹${price}</h1>

                <p>
                    <b>Change:</b>
                    ${change}
                </p>

                <p>
                    <b>Volume:</b>
                    ${volume}
                </p>

                <p>
                    <b>OI:</b>
                    ${oi}
                </p>

                <hr>

                <h2>
                    Signal: ${signal}
                </h2>

                <p>
                    🟢 Live Upstox Market Data
                </p>

            </div>

        `;

    } catch (error) {

        console.error("SCAN ERROR:", error);

        result.innerHTML = `
            <h2>❌ Unable to load market data</h2>
            <p>${error.message}</p>
        `;
    }
}


// Press Enter to scan
document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("search");

    if (input) {

        input.addEventListener("keydown", (event) => {

            if (event.key === "Enter") {
                scanStock();
            }

        });

    }

});
