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

        if (!data.success) {

            result.innerHTML = `
                <h2>⚠️ Unable to fetch data</h2>
                <p>${data.message || "Stock data unavailable"}</p>
            `;

            return;
        }

        const market = data.data;

        const symbol = market.symbol || stock;
        const price = market.last_price ?? "-";
        const volume = market.volume ?? "-";
        const oi = market.oi ?? "-";
        const change = market.net_change ?? "-";

        let signal = "HOLD";

        if (change > 0) {
            signal = "BUY";
        } else if (change < 0) {
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

        console.error(error);

        result.innerHTML = `
            <h2>❌ Connection Error</h2>
            <p>Unable to connect to server.</p>
            <p>Please try again.</p>
        `;
    }
}


// Search button / Enter key
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
