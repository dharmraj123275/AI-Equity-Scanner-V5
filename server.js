require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// FRONTEND
// ===============================

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {

    res.json({
        status: "OK",
        app: "AI Equity Scanner",
        version: "5.0"
    });

});

// ===============================
// MARKET STATUS
// ===============================

app.get("/api/status", (req, res) => {

    const now = new Date();

    const indiaTime = new Date(
        now.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        })
    );

    const day = indiaTime.getDay();
    const hours = indiaTime.getHours();
    const minutes = indiaTime.getMinutes();

    const currentMinutes =
        hours * 60 + minutes;

    const marketOpen =
        9 * 60 + 15;

    const marketClose =
        15 * 60 + 30;

    const isWeekday =
        day >= 1 && day <= 5;

    const isOpen =
        isWeekday &&
        currentMinutes >= marketOpen &&
        currentMinutes <= marketClose;

    res.json({

        success: true,

        market:
            isOpen
                ? "🟢 MARKET LIVE"
                : "🔴 MARKET CLOSED",

        nifty:
            isOpen
                ? "🟢 Live"
                : "🔴 Closed",

        bankNifty:
            isOpen
                ? "🟢 Live"
                : "🔴 Closed",

        time:
            indiaTime.toLocaleTimeString("en-IN"),

        date:
            indiaTime.toLocaleDateString("en-IN")

    });

});

// ===============================
// UPSTOX LOGIN
// ===============================

app.get("/login", (req, res) => {

    const clientId =
        process.env.UPSTOX_API_KEY;

    const redirectUri =
        process.env.UPSTOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {

        return res.status(500).send(
            "Upstox API Key or Redirect URI is missing."
        );

    }

    const loginUrl =
        "https://api.upstox.com/v2/login/authorization/dialog" +
        "?response_type=code" +
        "&client_id=" +
        encodeURIComponent(clientId) +
        "&redirect_uri=" +
        encodeURIComponent(redirectUri);

    res.redirect(loginUrl);

});

// ===============================
// UPSTOX CALLBACK
// ===============================

app.get("/callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {

        return res.status(400).send(`
            <h2>❌ Authorization Failed</h2>
            <p>No authorization code received.</p>
        `);

    }

    try {

        const response = await axios.post(

            "https://api.upstox.com/v2/login/authorization/token",

            new URLSearchParams({

                code: code,

                client_id:
                    process.env.UPSTOX_API_KEY,

                client_secret:
                    process.env.UPSTOX_API_SECRET,

                redirect_uri:
                    process.env.UPSTOX_REDIRECT_URI,

                grant_type:
                    "authorization_code"

            }),

            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",

                    "Accept":
                        "application/json"
                }
            }

        );

        console.log(
            "Upstox OAuth Login Successful"
        );

        // IMPORTANT:
        // Access token is NOT sent to browser.

        res.send(`
            <html>

            <head>

                <title>
                    Upstox Connected
                </title>

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1.0"
                >

            </head>

            <body
                style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                "
            >

                <h2>✅ Upstox Connected</h2>

                <p>
                    Authorization successful.
                </p>

                <p>
                    You can close this page.
                </p>

            </body>

            </html>
        `);

    } catch (error) {

        console.error(
            "OAuth Token Error:",
            error.response?.data ||
            error.message
        );

        res.status(500).send(`
            <h2>❌ Upstox Connection Failed</h2>

            <p>
                Please check Render environment variables.
            </p>
        `);

    }

});

// ==========================================
// LIVE QUOTE + AI ANALYSIS
// ==========================================

app.get("/api/live", async (req, res) => {

    try {

        const instrument = req.query.instrument;

        if (!instrument) {
            return res.status(400).json({
                success: false,
                message: "Instrument key is required"
            });
        }

        const token = process.env.UPSTOX_ACCESS_TOKEN;

        if (!token) {
            return res.status(500).json({
                success: false,
                message: "Upstox Access Token is missing"
            });
        }

        const response = await axios.get(
            "https://api.upstox.com/v2/market-quote/quotes",
            {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                params: {
                    instrument_key: instrument
                }
            }
        );

        const quoteData = response.data?.data || {};

        const keys = Object.keys(quoteData);

        if (keys.length === 0) {
            return res.json({
                success: false,
                message: "No quote data available"
            });
        }

        const quote = quoteData[instrument] || quoteData[keys[0]];

        const price = Number(quote.last_price || 0);

        const ohlc = quote.ohlc || {};

        const open = Number(ohlc.open || 0);
        const high = Number(ohlc.high || 0);
        const low = Number(ohlc.low || 0);
        const close = Number(ohlc.close || 0);

        // IMPORTANT: Actual Upstox change
        const netChange =
            Number(
                quote.net_change ??
                (price - close)
            );

        const changePercent =
            close > 0
                ? (netChange / close) * 100
                : 0;

        const volume =
            Number(quote.volume || 0);

        const oi =
            Number(quote.oi || 0);

        // ==========================================
        // SUPPORT / RESISTANCE
        // ==========================================

        const support = low;

        const resistance = high;

        // ==========================================
        // TREND
        // ==========================================

        let trend = "SIDEWAYS";

        if (price > open && price >= close) {
            trend = "BULLISH";
        }

        if (price < open && price <= close) {
            trend = "BEARISH";
        }

        // ==========================================
        // AI SCORE
        // ==========================================

        let score = 50;

        if (netChange > 0) score += 15;
        if (netChange < 0) score -= 15;

        if (price > open) score += 10;
        if (price < open) score -= 10;

        if (price > close) score += 5;
        if (price < close) score -= 5;

        score = Math.max(0, Math.min(100, score));

        // ==========================================
        // ENTRY / TARGET / STOP LOSS
        // ==========================================

        let entry = price;
        let target1 = price;
        let target2 = price;
        let stopLoss = price;
        let signal = "HOLD";

        if (trend === "BULLISH") {

            signal = "BUY";

            entry = price;

            target1 =
                price + ((resistance - price) * 0.50);

            target2 =
                resistance;

            stopLoss =
                support;

        } else if (trend === "BEARISH") {

            signal = "SELL";

            entry = price;

            target1 =
                price - ((price - support) * 0.50);

            target2 =
                support;

            stopLoss =
                resistance;

        }

        // ==========================================
        // RISK REWARD
        // ==========================================

        let riskReward = 0;

        if (signal === "BUY") {

            const risk =
                entry - stopLoss;

            const reward =
                target1 - entry;

            if (risk > 0) {
                riskReward =
                    reward / risk;
            }

        }

        if (signal === "SELL") {

            const risk =
                stopLoss - entry;

            const reward =
                entry - target1;

            if (risk > 0) {
                riskReward =
                    reward / risk;
            }

        }

        // ==========================================
        // MARKET DEPTH
        // ==========================================

        const depth = quote.depth || {};

        const buy =
            depth.buy || [];

        const sell =
            depth.sell || [];

        const buyQuantity =
            buy.reduce(
                (sum, item) =>
                    sum + Number(item.quantity || 0),
                0
            );

        const sellQuantity =
            sell.reduce(
                (sum, item) =>
                    sum + Number(item.quantity || 0),
                0
            );

        // ==========================================
        // FINAL RESPONSE
        // ==========================================

        res.json({

            success: true,

            data: {

                price,

                netChange,

                changePercent,

                open,

                high,

                low,

                close,

                volume,

                oi,

                support,

                resistance,

                trend,

                aiScore: score,

                signal,

                entry,

                target1,

                target2,

                stopLoss,

                riskReward,

                marketDepth: {

                    buyQuantity,

                    sellQuantity

                },

                raw: quote

            }

        });

    } catch (error) {

        console.error(
            "Live Quote Error:",
            error.response?.data ||
            error.message
        );

        res.status(500).json({

            success: false,

            message: "Live quote failed",

            error:
                error.response?.data ||
                error.message

        });

    }

});

// ===============================
// STOCK SEARCH
// ===============================

app.get("/api/search", async (req, res) => {

    const query =
        (req.query.q || "")
        .trim()
        .toUpperCase();

    if (!query) {

        return res.status(400).json({

            success: false,

            message:
                "Search query required"

        });

    }

    const stocks = [

        {
            symbol: "RELIANCE",
            name: "Reliance Industries",
            exchange: "NSE",
            instrument:
                "NSE_EQ|INE002A01018"
        },

        {
            symbol: "SBIN",
            name: "State Bank of India",
            exchange: "NSE",
            instrument:
                "NSE_EQ|INE062A01020"
        },

        {
            symbol: "INFY",
            name: "Infosys",
            exchange: "NSE",
            instrument:
                "NSE_EQ|INE009A01021"
        }

    ];

    const results =
        stocks.filter(stock =>

            stock.symbol.includes(query) ||

            stock.name
                .toUpperCase()
                .includes(query)

        );

    res.json({

        success: true,

        count:
            results.length,

        results:
            results

    });

});

// ===============================
// STOCK SCAN
// ===============================

app.get("/api/scan", async (req, res) => {

    try {

        const stock =
            (req.query.stock || "")
            .trim()
            .toUpperCase();

        if (!stock) {

            return res.status(400).json({

                success: false,

                message:
                    "Please enter stock symbol"

            });

        }

        if (!ACCESS_TOKEN) {

            return res.status(500).json({

                success: false,

                message:
                    "UPSTOX_ACCESS_TOKEN is missing"

            });

        }

        // Known NSE instruments

        const instruments = {

            RELIANCE:
                "NSE_EQ|INE002A01018",

            SBIN:
                "NSE_EQ|INE062A01020",

            INFY:
                "NSE_EQ|INE009A01021"

        };

        const instrument =
            instruments[stock];

        if (!instrument) {

            return res.status(404).json({

                success: false,

                message:
                    `${stock} is not available in current scanner list`

            });

        }

        const response =
            await axios.get(

                "https://api.upstox.com/v2/market-quote/quotes",

                {

                    headers: {

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${ACCESS_TOKEN}`

                    },

                    params: {

                        instrument_key:
                            instrument

                    }

                }

            );

        const data =
            response.data?.data;

        if (!data ||
            Object.keys(data).length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Live data not found"

            });

        }

        const quote =
            Object.values(data)[0];

        const price =
            Number(
                quote.last_price || 0
            );

        const change =
            Number(
                quote.net_change || 0
            );

        const volume =
            Number(
                quote.volume || 0
            );

        const oi =
            Number(
                quote.oi || 0
            );

        let signal = "HOLD";

        if (change > 0) {

            signal = "BUY";

        } else if (change < 0) {

            signal = "SELL";

        }

        res.json({

            success: true,

            name: stock,

            symbol: stock,

            price: price,

            change: change,

            volume: volume,

            oi: oi,

            signal: signal,

            source:
                "Upstox Live Market Data"

        });

    } catch (error) {

        console.error(

            "SCAN ERROR:",

            error.response?.data ||
            error.message

        );

        res.status(500).json({

            success: false,

            message:
                "Unable to fetch live stock data",

            error:
                error.response?.data ||
                error.message

        });

    }

});

// ===============================
// SERVER START
// ===============================

app.listen(PORT, () => {

    console.log(
        "AI Equity Scanner running on port " +
        PORT
    );

});
