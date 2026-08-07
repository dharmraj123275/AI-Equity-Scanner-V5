async function scanStock() {

    const input = document.getElementById("search");
    const result = document.getElementById("result");

    const stock = input.value.trim();

    if (!stock) {
        result.innerHTML = `
            <h2>⚠️ Enter a stock name</h2>
            <p>Example: RELIANCE</p>
        `;
        return;
    }

    result.innerHTML = `
        <h2>🔄 Loading...</h2>
        <p>Fetching live market data...</p>
    `;

    try {

        const response = await fetch(
            "/api/live?symbol=" + encodeURIComponent(stock)
        );

        const data = await response.json();

        console.log("LIVE API:", data);

        if (!data.success || !data.data) {
            result.innerHTML = `
                <h2>⚠️ Data unavailable</h2>
                <p>${data.message || "Stock not found"}</p>
            `;
            return;
        }

        // Upstox response contains instrument inside data object
        const keys = Object.keys(data.data);

        if (keys.length === 0) {
            throw new Error("No market data found");
        }

        const market = data.data[keys[0]];

        const symbol =
            market.symbol ||
            stock.toUpperCase();

        const price =
            market.last_price ?? "-";

        const volume =
            market.volume ?? "-";

        const oi =
            market.oi ?? "-";

        const change =
            market.net_change ?? 0;

        let signal = "HOLD";

        if (Number(change) > 0) {
            signal = "BUY";
        } else if (Number(change) < 0) {
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

                <h2>Signal: ${signal}</h2>

                <p>
                    🟢 Live Upstox Market Data
                </p>

            </div>
        `;

    } catch (error) {

        console.error("Scanner Error:", error);

        result.innerHTML = `
            <h2>❌ Unable to load market data</h2>
            <p>Please try again.</p>
        `;
    }
}


// Search on Enter
document.addEventListener("DOMContentLoaded", () => {

    const input = document.getElementById("search");

    if (input) {

        input.addEventListener("keydown", function(event) {

            if (event.key === "Enter") {
                scanStock();
            }

        });

    }

});
