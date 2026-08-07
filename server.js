// ==========================================
// AI EQUITY SCANNER PRO V5
// COMPLETE UPSTOX LIVE STOCK SCANNER
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// FRONTEND
// ==========================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

const PORT =
    process.env.PORT || 3000;

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        status: "OK",

        app: "AI Equity Scanner",

        version: "5.0"

    });

});

// ==========================================
// MARKET STATUS
// ==========================================

app.get("/api/status", (req, res) => {

    try {

        const now = new Date();

        const indiaTime =
            new Date(
                now.toLocaleString(
                    "en-US",
                    {
                        timeZone:
                            "Asia/Kolkata"
                    }
                )
            );

        const day =
            indiaTime.getDay();

        const hours =
            indiaTime.getHours();

        const minutes =
            indiaTime.getMinutes();

        const currentMinutes =
            hours * 60 + minutes;

        // NSE
        const marketOpen =
            9 * 60 + 15;

        const marketClose =
            15 * 60 + 30;

        const isWeekday =
            day >= 1 &&
            day <= 5;

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
                indiaTime.toLocaleTimeString(
                    "en-IN"
                ),

            date:
                indiaTime.toLocaleDateString(
                    "en-IN"
                )

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message:
                "Market status failed"

        });

    }

});

// ==========================================
// UPSTOX LOGIN
// ==========================================

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

// ==========================================
// UPSTOX CALLBACK
// ==========================================

app.get(
    "/callback",
    async (req, res) => {

        const code =
            req.query.code;

        if (!code) {

            return res
                .status(400)
                .send(`
                    <html>
                    <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    ">

                    <h2>
                    ❌ Authorization Failed
                    </h2>

                    <p>
                    No authorization code received.
                    </p>

                    </body>
                    </html>
                `);

        }

        try {

            const response =
                await axios.post(

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

            const accessToken =
                response.data.access_token;

            console.log(
                "Upstox OAuth Login Successful"
            );

            console.log(
                "Access Token Received:",
                !!accessToken
            );

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
                ">

                <h2>
                ✅ Upstox Connected
                </h2>

                <p>
                Authorization successful.
                </p>

                <p>
                Your server is connected to Upstox.
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

            res
                .status(500)
                .send(`
                    <html>

                    <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    ">

                    <h2>
                    ❌ Upstox Connection Failed
                    </h2>

                    <p>
                    Please check Render environment variables.
                    </p>

                    </body>

                    </html>
                `);

        }

    }
);

// ==========================================
// STOCK SEARCH
// ==========================================

app.get(
    "/api/search",
    async (req, res) => {

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

        // Current scanner stocks
        // We will expand this later
        // to full NSE + BSE + SME list.

        const stocks = [

            {
                symbol: "RELIANCE",

                name:
                    "Reliance Industries",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE002A01018"

            },

            {
                symbol: "SBIN",

                name:
                    "State Bank of India",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE062A01020"

            },

            {
                symbol: "INFY",

                name:
                    "Infosys",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE009A01021"

            },

            {
                symbol: "TCS",

                name:
                    "Tata Consultancy Services",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE467B01029"

            },

            {
                symbol: "HDFCBANK",

                name:
                    "HDFC Bank",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE040A01034"

            },

            {
                symbol: "ICICIBANK",

                name:
                    "ICICI Bank",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE090A01021"

            },

            {
                symbol: "ITC",

                name:
                    "ITC",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE154A01025"

            },

            {
                symbol: "BHARTIARTL",

                name:
                    "Bharti Airtel",

                exchange: "NSE",

                instrument:
                    "NSE_EQ|INE397D01024"

            }

        ];

        const results =
            stocks.filter(
                stock =>

                    stock.symbol.includes(
                        query
                    ) ||

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

    }
);

// ==========================================
// LIVE QUOTE + AI ANALYSIS
// ==========================================

app.get(
    "/api/live",
    async (req, res) => {

        try {

            // ----------------------------------
            // Instrument
            // ----------------------------------

            const instrument =
                req.query.instrument;

            if (!instrument) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Instrument key is required"

                });

            }

            // ----------------------------------
            // Access Token
            // ----------------------------------

            const token =
                process.env.UPSTOX_ACCESS_TOKEN;

            if (!token) {

                return res.status(500).json({

                    success: false,

                    message:
                        "UPSTOX_ACCESS_TOKEN is missing in Render Environment."

                });

            }

            // ----------------------------------
            // UPSTOX API
            // ----------------------------------

            const response =
                await axios.get(

                    "https://api.upstox.com/v2/market-quote/quotes",

                    {

                        headers: {

                            "Accept":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`

                        },

                        params: {

                            instrument_key:
                                instrument

                        }

                    }

                );

            // ----------------------------------
            // Quote Data
            // ----------------------------------

            const quoteData =
                response.data?.data || {};

            const keys =
                Object.keys(quoteData);

            if (keys.length === 0) {

                return res.json({

                    success: false,

                    message:
                        "No quote data available"

                });

            }

            const quote =
                quoteData[instrument] ||
                quoteData[keys[0]];

            // ==================================
            // BASIC PRICE DATA
            // ==================================

            const price =
                Number(
                    quote.last_price || 0
                );

            const ohlc =
                quote.ohlc || {};

            const open =
                Number(
                    ohlc.open || 0
                );

            const high =
                Number(
                    ohlc.high || 0
                );

            const low =
                Number(
                    ohlc.low || 0
                );

            const close =
                Number(
                    ohlc.close || 0
                );

            // ==================================
            // ACTUAL CHANGE
            // ==================================

            const netChange =
                Number(
                    quote.net_change ??
                    (
                        price - close
                    )
                );

            // ==================================
            // PREVIOUS CLOSE
            // ==================================

            const previousClose =
                close > 0
                    ? close
                    : price - netChange;

            // ==================================
            // CHANGE %
            // ==================================

            const changePercent =
                previousClose > 0

                    ? (
                        netChange /
                        previousClose
                    ) * 100

                    : 0;

            // ==================================
            // VOLUME / OI
            // ==================================

            const volume =
                Number(
                    quote.volume || 0
                );

            const oi =
                Number(
                    quote.oi || 0
                );

            // ==================================
            // SUPPORT / RESISTANCE
            // ==================================

            const support =
                low;

            const resistance =
                high;

            // ==================================
            // TREND
            // ==================================

            let trend =
                "SIDEWAYS";

            if (
                price > open &&
                price >= previousClose
            ) {

                trend =
                    "BULLISH";

            }

            else if (
                price < open &&
                price <= previousClose
            ) {

                trend =
                    "BEARISH";

            }

            // ==================================
            // AI SCORE
            // ==================================

            let score = 50;

            if (netChange > 0) {

                score += 15;

            }

            else if (netChange < 0) {

                score -= 15;

            }

            if (price > open) {

                score += 10;

            }

            else if (price < open) {

                score -= 10;

            }

            if (price > previousClose) {

                score += 5;

            }

            else if (
                price < previousClose
            ) {

                score -= 5;

            }

            // Volume confirmation

            if (volume > 0) {

                score += 5;

            }

            score =
                Math.max(
                    0,
                    Math.min(
                        100,
                        score
                    )
                );

            // ==================================
            // SMART ENTRY / TARGET / STOP LOSS
            // ==================================

            let entry =
                price;

            let target1 =
                price;

            let target2 =
                price;

            let stopLoss =
                price;

            let signal =
                "HOLD";

            let riskReward =
                0;

            // ==================================
            // BULLISH
            // ==================================

            if (
                trend === "BULLISH"
            ) {

                entry =
                    price;

                // Maximum 0.5% initial risk

                const risk =
                    price * 0.005;

                stopLoss =
                    Math.max(
                        support,
                        price - risk
                    );

                const actualRisk =
                    entry -
                    stopLoss;

                // Target 1 = 1.5R

                target1 =
                    entry +
                    (
                        actualRisk * 1.5
                    );

                // Target 2

                target2 =
                    Math.max(
                        target1,
                        resistance
                    );

                const reward =
                    target1 -
                    entry;

                if (
                    actualRisk > 0
                ) {

                    riskReward =
                        reward /
                        actualRisk;

                }

                // BUY only if RR >= 1.5

                if (
                    riskReward >= 1.5
                ) {

                    signal =
                        "BUY";

                }

                else {

                    signal =
                        "HOLD";

                }

            }

            // ==================================
            // BEARISH
            // ==================================

            else if (
                trend === "BEARISH"
            ) {

                entry =
                    price;

                const risk =
                    price * 0.005;

                stopLoss =
                    Math.min(
                        resistance,
                        price + risk
                    );

                const actualRisk =
                    stopLoss -
                    entry;

                // Target 1 = 1.5R

                target1 =
                    entry -
                    (
                        actualRisk * 1.5
                    );

                // Target 2

                target2 =
                    Math.min(
                        target1,
                        support
                    );

                const reward =
                    entry -
                    target1;

                if (
                    actualRisk > 0
                ) {

                    riskReward =
                        reward /
                        actualRisk;

                }

                // SELL only if RR >= 1.5

                if (
                    riskReward >= 1.5
                ) {

                    signal =
                        "SELL";

                }

                else {

                    si
