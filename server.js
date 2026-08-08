// ============================================================
// AI EQUITY SCANNER PRO V6
// COMPLETE SERVER.JS
// UPSTOX LIVE STOCK SCANNER
//
// FEATURES
// ------------------------------------------------------------
// 1. Upstox OAuth Login
// 2. Automatic OAuth callback
// 3. Automatic access-token storage in server memory
// 4. Token validity check
// 5. Clear 401 / token-expired handling
// 6. NSE Equity
// 7. NSE SME
// 8. NSE ETF
// 9. NIFTY
// 10. BANKNIFTY
// 11. FINNIFTY
// 12. MIDCPNIFTY
// 13. INDIA VIX
// 14. Dynamic Upstox Instrument Search
// 15. stocks.json fallback
// 16. Live Full Market Quote
// 17. AI-style technical analysis
// 18. Market depth
// 19. Support / Resistance
// 20. Entry / Target / Stop Loss
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const fs = require("fs");
const technical = require("./technical.js");

const app = express();

app.use(cors());
app.use(express.json());


// ============================================================
// CONFIG
// ============================================================

const PORT =
    process.env.PORT || 3000;

const UPSTOX_BASE_URL =
    "https://api.upstox.com/v2";


// ============================================================
// FRONTEND
// ============================================================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ============================================================
// TOKEN STORAGE
// ============================================================
//
// IMPORTANT:
//
// The token is intentionally kept server-side.
//
// Render environment variable:
// UPSTOX_ACCESS_TOKEN
//
// After OAuth login, a fresh token is stored in memory.
//
// Because Upstox tokens expire at 3:30 AM the following day,
// the user may need to login again after expiry.
//
// ============================================================

let runtimeAccessToken =
    String(
        process.env.UPSTOX_ACCESS_TOKEN || ""
    ).trim();

let tokenCreatedAt =
    null;

let lastAuthError =
    null;


// ============================================================
// LOAD FALLBACK STOCKS
// ============================================================

let fallbackStocks = [];

try {

    const stocksFile =
        path.join(
            __dirname,
            "stocks.json"
        );

    if (
        fs.existsSync(
            stocksFile
        )
    ) {

        const stocksData =
            JSON.parse(
                fs.readFileSync(
                    stocksFile,
                    "utf8"
                )
            );

        fallbackStocks =
            Array.isArray(
                stocksData.aliases
            )
                ? stocksData.aliases
                : [];

        console.log(
            `stocks.json loaded: ${fallbackStocks.length} aliases`
        );

    } else {

        console.log(
            "stocks.json not found. Local fallback disabled."
        );

    }

} catch (error) {

    console.error(
        "stocks.json load error:",
        error.message
    );

}


// ============================================================
// HELPER: GET ACCESS TOKEN
// ============================================================

function getAccessToken() {

    return String(
        runtimeAccessToken || ""
    ).trim();

}


// ============================================================
// HELPER: TOKEN AVAILABLE
// ============================================================

function hasAccessToken() {

    return Boolean(
        getAccessToken()
    );

}


// ============================================================
// HELPER: CLEAR TOKEN
// ============================================================

function clearRuntimeToken() {

    runtimeAccessToken = "";

    tokenCreatedAt = null;

}


// ============================================================
// UPSTOX API ERROR NORMALIZER
// ============================================================

function normalizeUpstoxError(
    error
) {

    const status =
        error?.response?.status ||
        error?.statusCode ||
        500;

    const apiData =
        error?.response?.data ||
        null;

    const apiMessage =
        apiData?.errors?.[0]?.message ||
        apiData?.message ||
        error?.message ||
        "Unknown Upstox API error";

    return {
        status,
        message: apiMessage,
        data: apiData
    };

}


// ============================================================
// 401 ERROR DETECTOR
// ============================================================

function isUnauthorizedError(
    error
) {

    return (
        error?.response?.status === 401 ||
        error?.statusCode === 401
    );

}


// ============================================================
// CLEAR 401 RESPONSE
// ============================================================

function sendTokenExpired(
    res
) {

    return res.status(401).json({

        success: false,

        code:
            "UPSTOX_TOKEN_EXPIRED",

        message:
            "Your Upstox access token is missing or expired.",

        action:
            "LOGIN_REQUIRED",

        loginUrl:
            "/login",

        instructions:
            "Open /login and complete Upstox authorization.",

        tokenCreatedAt:
            tokenCreatedAt

    });

}


// ============================================================
// UPSTOX AUTHORIZATION URL
// ============================================================

function buildUpstoxLoginUrl() {

    const clientId =
        process.env.UPSTOX_API_KEY;

    const redirectUri =
        process.env.UPSTOX_REDIRECT_URI;

    if (
        !clientId ||
        !redirectUri
    ) {

        return null;

    }

    const params =
        new URLSearchParams({

            response_type:
                "code",

            client_id:
                clientId,

            redirect_uri:
                redirectUri

        });

    return (
        "https://api.upstox.com/v2/login/authorization/dialog?" +
        params.toString()
    );

}


// ============================================================
// HOME
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success:
                true,

            status:
                "OK",

            app:
                "AI Equity Scanner Pro",

            version:
                "6.0",

            serverTime:
                new Date().toISOString(),

            upstoxToken:
                hasAccessToken()
                    ? "AVAILABLE"
                    : "MISSING"

        });

    }
);


// ============================================================
// AUTH STATUS
// ============================================================

app.get(
    "/api/auth/status",
    (req, res) => {

        res.json({

            success:
                true,

            authenticated:
                hasAccessToken(),

            tokenStatus:
                hasAccessToken()
                    ? "AVAILABLE"
                    : "LOGIN_REQUIRED",

            tokenCreatedAt:
                tokenCreatedAt,

            lastAuthError:
                lastAuthError,

            loginUrl:
                "/login"

        });

    }
);


// ============================================================
// UPSTOX LOGIN
// ============================================================

app.get(
    "/login",
    (req, res) => {

        const clientId =
            process.env.UPSTOX_API_KEY;

        const redirectUri =
            process.env.UPSTOX_REDIRECT_URI;

        if (
            !clientId ||
            !redirectUri
        ) {

            return res.status(500).send(`

                <html>

                <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    "
                >

                    <h2>
                        ❌ Upstox Configuration Missing
                    </h2>

                    <p>
                        Please configure:
                    </p>

                    <p>
                        UPSTOX_API_KEY
                    </p>

                    <p>
                        UPSTOX_API_SECRET
                    </p>

                    <p>
                        UPSTOX_REDIRECT_URI
                    </p>

                </body>

                </html>

            `);

        }

        const loginUrl =
            buildUpstoxLoginUrl();

        res.redirect(
            loginUrl
        );

    }
);


// ============================================================
// UPSTOX CALLBACK
// ============================================================

app.get(
    "/callback",
    async (req, res) => {

        const code =
            String(
                req.query.code || ""
            ).trim();

        const errorParam =
            req.query.error;

        if (
            errorParam
        ) {

            lastAuthError =
                String(
                    errorParam
                );

            return res.status(400).send(`

                <html>

                <head>

                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >

                </head>

                <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    "
                >

                    <h2>
                        ❌ Upstox Authorization Failed
                    </h2>

                    <p>
                        ${escapeHtml(
                            errorParam
                        )}
                    </p>

                    <a href="/login">
                        🔐 Try Login Again
                    </a>

                </body>

                </html>

            `);

        }

        if (
            !code
        ) {

            return res.status(400).send(`

                <html>

                <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    "
                >

                    <h2>
                        ❌ Authorization Code Missing
                    </h2>

                    <p>
                        Please start again from Upstox Login.
                    </p>

                    <a href="/login">
                        🔐 Login with Upstox
                    </a>

                </body>

                </html>

            `);

        }

        try {

            const clientId =
                process.env.UPSTOX_API_KEY;

            const clientSecret =
                process.env.UPSTOX_API_SECRET;

            const redirectUri =
                process.env.UPSTOX_REDIRECT_URI;

            if (
                !clientId ||
                !clientSecret ||
                !redirectUri
            ) {

                throw new Error(
                    "Upstox OAuth environment variables are missing."
                );

            }

            const response =
                await axios.post(

                    `${UPSTOX_BASE_URL}/login/authorization/token`,

                    new URLSearchParams({

                        code:

                            code,

                        client_id:

                            clientId,

                        client_secret:

                            clientSecret,

                        redirect_uri:

                            redirectUri,

                        grant_type:

                            "authorization_code"

                    }),

                    {

                        headers: {

                            "Accept":
                                "application/json",

                            "Content-Type":
                                "application/x-www-form-urlencoded"

                        },

                        timeout:
                            15000

                    }

                );

            const newToken =
                String(
                    response.data?.access_token ||
                    ""
                ).trim();

            if (
                !newToken
            ) {

                throw new Error(
                    "Upstox did not return an access token."
                );

            }

            // Store token only on server.
            runtimeAccessToken =
                newToken;

            tokenCreatedAt =
                new Date().toISOString();

            lastAuthError =
                null;

            console.log(
                "=========================================="
            );

            console.log(
                "UPSTOX OAUTH SUCCESS"
            );

            console.log(
                "Fresh access token received."
            );

            console.log(
                "Token stored server-side."
            );

            console.log(
                "=========================================="
            );

            res.send(`

                <html>

                <head>

                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >

                    <title>
                        Upstox Connected
                    </title>

                </head>

                <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    "
                >

                    <h2>
                        ✅ Upstox Connected
                    </h2>

                    <p>
                        Fresh access token received.
                    </p>

                    <p>
                        AI Equity Scanner is ready.
                    </p>

                    <br>

                    <a
                        href="/"
                        style="
                        display:inline-block;
                        padding:12px 20px;
                        background:#111;
                        color:white;
                        text-decoration:none;
                        border-radius:8px;
                        "
                    >
                        📈 Open Scanner
                    </a>

                </body>

                </html>

            `);

        } catch (error) {

            const normalized =
                normalizeUpstoxError(
                    error
                );

            lastAuthError =
                normalized.message;

            console.error(
                "OAUTH TOKEN ERROR:",
                normalized.data ||
                normalized.message
            );

            res.status(
                normalized.status
            ).send(`

                <html>

                <head>

                    <meta
                        name="viewport"
                        content="width=device-width,initial-scale=1"
                    >

                </head>

                <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    "
                >

                    <h2>
                        ❌ Upstox Login Failed
                    </h2>

                    <p>
                        ${escapeHtml(
                            normalized.message
                        )}
                    </p>

                    <br>

                    <a href="/login">
                        🔐 Try Upstox Login Again
                    </a>

                </body>

                </html>

            `);

        }

    }
);


// ============================================================
// AUTHENTICATED UPSTOX REQUEST
// ============================================================

async function upstoxRequest(
    config
) {

    const token =
        getAccessToken();

    if (
        !token
    ) {

        const error =
            new Error(
                "UPSTOX_ACCESS_TOKEN is missing."
            );

        error.statusCode =
            401;

        throw error;

    }

    try {

        return await axios({

            ...config,

            baseURL:
                UPSTOX_BASE_URL,

            headers: {

                Accept:
                    "application/json",

                Authorization:
                    `Bearer ${token}`,

                ...(config.headers || {})

            },

            timeout:
                config.timeout || 15000

        });

    } catch (error) {

        // ========================================
        // IMPORTANT 401 HANDLING
        // ========================================

        if (
            isUnauthorizedError(
                error
            )
        ) {

            console.error(
                "UPSTOX 401: Access token expired or invalid."
            );

            clearRuntimeToken();

            const authError =
                new Error(
                    "Upstox access token expired or invalid."
                );

            authError.statusCode =
                401;

            authError.upstox =
                error.response?.data ||
                null;

            throw authError;

        }

        throw error;

    }

}


// ============================================================
// TEST TOKEN
// ============================================================
//
// This endpoint actually calls Upstox profile API.
//
// Use:
//
// /api/token/test
//
// ============================================================

app.get(
    "/api/token/test",
    async (req, res) => {

        try {

            if (
                !hasAccessToken()
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const response =
                await upstoxRequest({

                    method:
                        "GET",

                    url:
                        "/user/profile"

                });

            res.json({

                success:
                    true,

                authenticated:
                    true,

                message:
                    "Upstox access token is valid.",

                profile:
                    response.data?.data ||
                    null

            });

        } catch (error) {

            if (
                error.statusCode === 401
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const normalized =
                normalizeUpstoxError(
                    error
                );

            res.status(
                normalized.status
            ).json({

                success:
                    false,

                message:
                    normalized.message,

                error:
                    normalized.data

            });

        }

    }
);

// ============================================================
// MARKET STATUS
// ============================================================

app.get(
    "/api/status",
    async (req, res) => {

        // First try Upstox exchange status.
        // If authentication is unavailable,
        // fall back to NSE trading hours.

        try {

            if (
                hasAccessToken()
            ) {

                const response =
                    await upstoxRequest({

                        method:
                            "GET",

                        url:
                            "/market/status/NSE"

                    });

                const statusData =
                    response.data?.data ||
                    {};

                return res.json({

                    success:
                        true,

                    source:
                        "Upstox",

                    market:
                        statusData.status ||
                        "UNKNOWN",

                    exchange:
                        statusData.exchange ||
                        "NSE",

                    time:
                        new Date().toLocaleTimeString(
                            "en-IN",
                            {
                                timeZone:
                                    "Asia/Kolkata"
                            }
                        ),

                    date:
                        new Date().toLocaleDateString(
                            "en-IN",
                            {
                                timeZone:
                                    "Asia/Kolkata"
                            }
                        )

                });

            }

        } catch (error) {

            if (
                error.statusCode === 401
            ) {

                clearRuntimeToken();

            }

        }

        // ========================================
        // FALLBACK TIME STATUS
        // ========================================

        try {

            const now =
                new Date();

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
                hours * 60 +
                minutes;

            const marketOpen =
                9 * 60 + 15;

            const marketClose =
                15 * 60 + 30;

            const isWeekday =
                day >= 1 &&
                day <= 5;

            const isOpen =
                isWeekday &&
                currentMinutes >=
                    marketOpen &&
                currentMinutes <=
                    marketClose;

            res.json({

                success:
                    true,

                source:
                    "Local market hours",

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

                authenticated:
                    hasAccessToken(),

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

                success:
                    false,

                message:
                    "Unable to determine market status"

            });

        }

    }
);


// ============================================================
// GET FULL MARKET QUOTE
// ============================================================

async function getUpstoxQuote(
    instrument
) {

    if (
        !instrument
    ) {

        const error =
            new Error(
                "Instrument key is required."
            );

        error.statusCode =
            400;

        throw error;

    }

    const response =
        await upstoxRequest({

            method:
                "GET",

            url:
                "/market-quote/quotes",

            params: {

                instrument_key:
                    instrument

            }

        });

    const quoteData =
        response.data?.data ||
        {};

    const keys =
        Object.keys(
            quoteData
        );

    if (
        keys.length === 0
    ) {

        const error =
            new Error(
                "Upstox returned no quote data for this instrument."
            );

        error.statusCode =
            404;

        throw error;

    }

    return (
        quoteData[instrument] ||
        quoteData[keys[0]]
    );

}

// ==========================================
// V7.1 HISTORICAL CANDLES - UPSTOX V3
// ==========================================

async function getHistoricalCandles(
    instrument,
    interval = "1minute"
) {

    if (!instrument) {

        const error =
            new Error(
                "Instrument key is required for historical candles."
            );

        error.statusCode = 400;

        throw error;
    }

    const token =
        process.env.UPSTOX_ACCESS_TOKEN;

    if (!token) {

        const error =
            new Error(
                "UPSTOX_ACCESS_TOKEN is missing."
            );

        error.statusCode = 500;

        throw error;
    }

    // --------------------------------------
    // DATE
    // --------------------------------------

    const now = new Date();

    const indiaNow =
        new Date(
            now.toLocaleString(
                "en-US",
                {
                    timeZone:
                        "Asia/Kolkata"
                }
            )
        );

    // Today's date
    const toDate =
        indiaNow
            .toISOString()
            .split("T")[0];

    // 7 days back
    const fromDateObj =
        new Date(indiaNow);

    fromDateObj.setDate(
        fromDateObj.getDate() - 7
    );

    const fromDate =
        fromDateObj
            .toISOString()
            .split("T")[0];

    // --------------------------------------
    // V3 INTERVAL CONVERSION
    // --------------------------------------

    let unit = "minutes";
    let intervalValue = "1";

    if (
        interval === "1minute"
    ) {

        unit = "minutes";
        intervalValue = "1";

    } else if (
        interval === "5minute"
    ) {

        unit = "minutes";
        intervalValue = "5";

    } else if (
        interval === "15minute"
    ) {

        unit = "minutes";
        intervalValue = "15";

    } else if (
        interval === "30minute"
    ) {

        unit = "minutes";
        intervalValue = "30";

    } else if (
        interval === "day"
    ) {

        unit = "days";
        intervalValue = "1";

    }

    // --------------------------------------
    // ENCODE INSTRUMENT KEY
    // --------------------------------------

    const encodedInstrument =
        encodeURIComponent(
            instrument
        );

    // --------------------------------------
    // UPSTOX V3 URL
    // --------------------------------------

    const url =
        `https://api.upstox.com/v3/historical-candle/` +
        `${encodedInstrument}/` +
        `${unit}/` +
        `${intervalValue}/` +
        `${toDate}/` +
        `${fromDate}`;

    console.log(
        "HISTORICAL URL:",
        url
    );

    // --------------------------------------
    // REQUEST
    // --------------------------------------

    try {

        const response =
            await axios.get(
                url,
                {
                    headers: {

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    timeout: 15000
                }
            );

        const candles =
            response.data?.data?.candles ||
            [];

        if (
            !Array.isArray(candles) ||
            candles.length === 0
        ) {

            const error =
                new Error(
                    "Upstox returned no historical candles."
                );

            error.statusCode = 404;

            throw error;
        }

        console.log(
            `Historical candles received: ${candles.length}`
        );

        return candles;

    } catch (error) {

        console.error(
            "HISTORICAL CANDLE ERROR:",
            error.response?.data ||
            error.message
        );

        if (
            error.response?.status === 401
        ) {

            const authError =
                new Error(
                    "Upstox access token is invalid or expired."
                );

            authError.statusCode = 401;

            throw authError;
        }

        if (
            error.response?.status === 404
        ) {

            const notFound =
                new Error(
                    "Upstox historical candle resource not found. Check instrument key and V3 endpoint."
                );

            notFound.statusCode = 404;

            throw notFound;
        }

        throw error;
    }
}

// ==========================================
// AI EQUITY SCANNER PRO V7
// SMART TRADING ENGINE
// ==========================================

function round2(value) {
    return Number(Number(value || 0).toFixed(2));
}

// ==========================================
// HELPER: ROUND TO 2 DECIMALS
// ==========================================

function round2(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return 0;
    }

    return Number(n.toFixed(2));
}
// ==========================================
// BUILD ANALYSIS
// ==========================================

function buildAnalysis(quote) {

    // ==========================================
    // BASIC MARKET DATA
    // ==========================================

    const price = Number(quote?.last_price || 0);

    const ohlc = quote?.ohlc || {};

    const open = Number(ohlc.open || 0);
    const high = Number(ohlc.high || 0);
    const low = Number(ohlc.low || 0);
    const close = Number(ohlc.close || 0);

    const volume = Number(quote?.volume || 0);
    const oi = Number(quote?.oi || 0);

    const netChange = Number(
        quote?.net_change ??
        (price - close)
    );

    const changePercent =
        close > 0
            ? (netChange / close) * 100
            : 0;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
        price <= 0 ||
        high <= 0 ||
        low <= 0
    ) {
        return {
            success: false,
            signal: "AVOID",
            reason: "Insufficient market data"
        };
    }

    // ==========================================
    // MARKET RANGE
    // ==========================================

    const range = Math.max(
        high - low,
        price * 0.001
    );

    const rangePercent =
        (range / price) * 100;

    // Position inside today's range
    const rangePosition =
        (price - low) / range;

    // ==========================================
    // TREND
    // ==========================================

    let trend = "SIDEWAYS";

    if (
        price > open &&
        price > low &&
        rangePosition >= 0.60
    ) {
        trend = "BULLISH";
    }

    if (
        price < open &&
        price < high &&
        rangePosition <= 0.40
    ) {
        trend = "BEARISH";
    }

    // ==========================================
    // MARKET DEPTH
    // ==========================================

    const depth =
        quote?.depth || {};

    const buy =
        Array.isArray(depth.buy)
            ? depth.buy
            : [];

    const sell =
        Array.isArray(depth.sell)
            ? depth.sell
            : [];

    const buyQuantity =
        buy.reduce(
            (sum, item) =>
                sum +
                Number(item?.quantity || 0),
            0
        );

    const sellQuantity =
        sell.reduce(
            (sum, item) =>
                sum +
                Number(item?.quantity || 0),
            0
        );

    const totalDepth =
        buyQuantity +
        sellQuantity;

    const buyPercent =
        totalDepth > 0
            ? (buyQuantity / totalDepth) * 100
            : 50;

    const sellPercent =
        totalDepth > 0
            ? (sellQuantity / totalDepth) * 100
            : 50;

    let depthTrend = "NEUTRAL";

    if (buyPercent >= 60) {
        depthTrend = "BUYERS_STRONG";
    } else if (sellPercent >= 60) {
        depthTrend = "SELLERS_STRONG";
    }

    // ==========================================
    // SMART SUPPORT / RESISTANCE
    // ==========================================

    const support =
        low;

    const resistance =
        high;

    // ==========================================
    // BREAKOUT LEVEL
    // ==========================================

    const breakoutBuffer =
        Math.max(
            range * 0.05,
            price * 0.001
        );

    const breakoutLevel =
        resistance + breakoutBuffer;

    const breakdownLevel =
        support - breakoutBuffer;

    // ==========================================
    // VOLUME SCORE
    //
    // A single quote does not provide average
    // volume, so we DO NOT pretend this is
    // relative-volume analysis.
    // ==========================================

    let volumeScore = 0;

    if (volume > 0) {
        volumeScore = 10;
    }

    // ==========================================
    // PRICE MOMENTUM SCORE
    // ==========================================

    let score = 50;

    if (netChange > 0) {
        score += 15;
    }

    if (netChange < 0) {
        score -= 15;
    }

    if (price > open) {
        score += 10;
    }

    if (price < open) {
        score -= 10;
    }

    if (rangePosition >= 0.70) {
        score += 10;
    }

    if (rangePosition <= 0.30) {
        score -= 10;
    }

    if (depthTrend === "BUYERS_STRONG") {
        score += 5;
    }

    if (depthTrend === "SELLERS_STRONG") {
        score -= 5;
    }

    score += volumeScore;

    score = Math.max(
        0,
        Math.min(
            100,
            Math.round(score)
        )
    );

    // ==========================================
    // ATR-LIKE RISK PROXY
    //
    // This is NOT true ATR because the quote
    // endpoint only gives current OHLC.
    // ==========================================

    const riskDistance =
        Math.max(
            range * 0.35,
            price * 0.003
        );

    // ==========================================
    // BUY SETUP
    // ==========================================

    const buyEntry =
        price;

    const buyStop =
        Math.max(
            0,
            Math.min(
                support,
                buyEntry - riskDistance
            )
        );

    const buyRisk =
        Math.max(
            buyEntry - buyStop,
            price * 0.001
        );

    const buyTarget1 =
        buyEntry +
        (buyRisk * 1.5);

    const buyTarget2 =
        buyEntry +
        (buyRisk * 2.0);

    const buyRR1 =
        (buyTarget1 - buyEntry) /
        buyRisk;

    const buyRR2 =
        (buyTarget2 - buyEntry) /
        buyRisk;

    // ==========================================
    // SELL SETUP
    // ==========================================

    const sellEntry =
        price;

    const sellStop =
        sellEntry +
        riskDistance;

    const sellRisk =
        Math.max(
            sellStop - sellEntry,
            price * 0.001
        );

    const sellTarget1 =
        sellEntry -
        (sellRisk * 1.5);

    const sellTarget2 =
        sellEntry -
        (sellRisk * 2.0);

    const sellRR1 =
        (sellEntry - sellTarget1) /
        sellRisk;

    const sellRR2 =
        (sellEntry - sellTarget2) /
        sellRisk;

    // ==========================================
    // CONDITIONS
    // ==========================================

    const bullish =
        trend === "BULLISH";

    const bearish =
        trend === "BEARISH";

    const strongBuy =
        bullish &&
        score >= 80 &&
        (
            depthTrend ===
            "BUYERS_STRONG" ||
            totalDepth === 0
        ) &&
        buyRR1 >= 1.5;

    const normalBuy =
        bullish &&
        score >= 65 &&
        buyRR1 >= 1.5;

    const strongSell =
        bearish &&
        score <= 20 &&
        (
            depthTrend ===
            "SELLERS_STRONG" ||
            totalDepth === 0
        ) &&
        sellRR1 >= 1.5;

    const normalSell =
        bearish &&
        score <= 35 &&
        sellRR1 >= 1.5;

    // ==========================================
    // BREAKOUT DETECTION
    // ==========================================

    const nearResistance =
        price >=
        resistance - breakoutBuffer;

    const nearSupport =
        price <=
        support + breakoutBuffer;

    /*
     * Because current OHLC does not prove a
     * confirmed breakout, we label this as
     * BREAKOUT BUY only when price is at/above
     * the calculated breakout zone and momentum
     * is bullish.
     */

    const breakoutBuy =
        bullish &&
        score >= 70 &&
        nearResistance &&
        price >= resistance &&
        buyRR1 >= 1.5;

    // ==========================================
    // FINAL SIGNAL
    // ==========================================

    let signal = "WAIT";
    let reason = "";

    if (breakoutBuy) {

        signal = "BREAKOUT BUY";

        reason =
            "Price is testing/breaking resistance with bullish momentum.";

    } else if (strongBuy) {

        signal = "STRONG BUY";

        reason =
            "Strong bullish score with acceptable risk/reward.";

    } else if (normalBuy) {

        signal = "BUY";

        reason =
            "Bullish trend with minimum 1:1.5 risk/reward.";

    } else if (strongSell) {

    signal = "STRONG SELL";

    reason =
        "Strong bearish momentum with strong seller confirmation and acceptable risk/reward.";

    } else if (normalSell) {

        signal = "SELL";

        reason =
            "Bearish trend with minimum 1:1.5 risk/reward.";

    } else if (
        bullish &&
        buyRR1 < 1.5
    ) {

        signal = "WAIT";

        reason =
            "Bullish trend but reward is too small compared with risk.";

    } else if (
        bearish &&
        sellRR1 < 1.5
    ) {

        signal = "WAIT";

        reason =
            "Bearish trend but reward is too small compared with risk.";

    } else if (
        score >= 45 &&
        score <= 55
    ) {

        signal = "WAIT";

        reason =
            "Market direction is unclear.";

    } else {

        signal = "AVOID";

        reason =
            "Setup does not meet minimum trading conditions.";

    }

    // ==========================================
    // AVOID EXTREME RISK
    // ==========================================

    if (
        signal !== "WAIT" &&
        signal !== "AVOID"
    ) {

        if (
            signal.includes("BUY") &&
            buyRR1 < 1.5
        ) {
            signal = "AVOID";
            reason =
                "BUY setup rejected because R:R is below 1:1.5.";
        }

        if (
            signal === "SELL" &&
            sellRR1 < 1.5
        ) {
            signal = "AVOID";
            reason =
                "SELL setup rejected because R:R is below 1:1.5.";
        }

    }

    // ==========================================
    // CONFIDENCE
    // ==========================================

    let confidence =
        Math.round(
            Math.min(
                95,
                Math.max(
                    50,
                    score
                )
            )
        );

    if (
        signal === "WAIT" ||
        signal === "AVOID"
    ) {
        confidence =
            Math.min(
                confidence,
                70
            );
    }

    // ==========================================
// SELECT TRADE LEVELS - V7.1
// ==========================================

let entry = price;
let target1 = price;
let target2 = price;
let stopLoss = price;
let riskReward = 0;

// ------------------------------------------
// ACTIVE BUY SIGNALS
// ------------------------------------------

if (
    signal === "BUY" ||
    signal === "STRONG BUY" ||
    signal === "BREAKOUT BUY"
) {

    entry = buyEntry;

    target1 = buyTarget1;

    target2 = buyTarget2;

    stopLoss = buyStop;

    riskReward = buyRR1;

}

// ------------------------------------------
// SELL SIGNAL
// ------------------------------------------

else if (
    signal === "SELL" ||
    signal === "STRONG SELL"
) {

    entry = sellEntry;

    target1 = sellTarget1;

    target2 = sellTarget2;

    stopLoss = sellStop;

    riskReward = sellRR1;

}

// ------------------------------------------
// WAIT
// ------------------------------------------
// WAITમાં પણ useful trading levels બતાવો.
// Signal WAIT રહેશે, પરંતુ levels zero/price-price નહીં રહે.

else if (
    signal === "WAIT"
) {

    if (bullish) {

        entry =
            Math.min(
                price,
                resistance
            );

        stopLoss =
            buyStop;

        target1 =
            buyTarget1;

        target2 =
            buyTarget2;

        riskReward =
            buyRR1;

    }

    else if (bearish) {

        entry =
            sellEntry;

        stopLoss =
            sellStop;

        target1 =
            sellTarget1;

        target2 =
            sellTarget2;

        riskReward =
            sellRR1;

    }

    else {

        // SIDEWAYS → levels based on range

        entry =
            price;

        stopLoss =
            Math.max(
                0,
                price - riskDistance
            );

        target1 =
            price + riskDistance;

        target2 =
            price + (riskDistance * 1.5);

        riskReward =
            1;

    }

}

// ------------------------------------------
// AVOID
// ------------------------------------------

else if (
    signal === "AVOID"
) {

    entry = price;

    target1 = price;

    target2 = price;

    stopLoss = price;

    riskReward = 0;

}

// ------------------------------------------
// SAFETY ROUNDING
// ------------------------------------------

entry =
    Number(entry) > 0
        ? entry
        : price;

target1 =
    Number(target1) > 0
        ? target1
        : price;

target2 =
    Number(target2) > 0
        ? target2
        : price;

stopLoss =
    Number(stopLoss) > 0
        ? stopLoss
        : price;

riskReward =
    Number.isFinite(
        Number(riskReward)
    )
        ? Number(riskReward)
        : 0;

    // ==========================================
    // TRADE QUALITY
    // ==========================================

    let tradeQuality =
        "LOW";

    if (
        riskReward >= 2
    ) {
        tradeQuality =
            "EXCELLENT";
    } else if (
        riskReward >= 1.5
    ) {
        tradeQuality =
            "GOOD";
    } else if (
        riskReward >= 1
    ) {
        tradeQuality =
            "WEAK";
    }

    // ==========================================
    // RETURN
    // ==========================================

    return {

        price:
            round2(price),

        netChange:
            round2(netChange),

        changePercent:
            round2(changePercent),

        open:
            round2(open),

        high:
            round2(high),

        low:
            round2(low),

        close:
            round2(close),

        volume,

        oi,

        support:
            round2(support),

        resistance:
            round2(resistance),

        breakoutLevel:
            round2(breakoutLevel),

        breakdownLevel:
            round2(breakdownLevel),

        trend,

        aiScore:
            score,

        confidence,

        signal,

        reason,

        tradeQuality,

        entry:
            round2(entry),

        target1:
            round2(target1),

        target2:
            round2(target2),

        stopLoss:
            round2(stopLoss),

        riskReward:
            round2(riskReward),

        riskRewardTarget1:
    round2(
        signal === "SELL" ||
        signal === "STRONG SELL"
            ? sellRR1
            : buyRR1
    ),

        riskRewardTarget2:
    round2(
        signal === "SELL" ||
        signal === "STRONG SELL"
            ? sellRR2
            : buyRR2
    ),

        marketDepth: {

            buyQuantity:
                buyQuantity,

            sellQuantity:
                sellQuantity,

            buyPercent:
                round2(buyPercent),

            sellPercent:
                round2(sellPercent),

            trend:
                depthTrend

        },

        strategy: {

            minimumRR:
                1.5,

            preferredRR:
                2.0,

            nearResistance,

            nearSupport

        },

        raw:
            quote

    };
}

// ============================================================
// API LIVE
// ============================================================

app.get(
    "/api/live",
    async (req, res) => {

        try {

            const instrument =
                String(
                    req.query.instrument ||
                    ""
                ).trim();

            if (
                !instrument
            ) {

                return res.status(400).json({

                    success:
                        false,

                    code:
                        "INSTRUMENT_REQUIRED",

                    message:
                        "Instrument key is required."

                });

            }

            if (
                !hasAccessToken()
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const quote =
                await getUpstoxQuote(
                    instrument
                );

            const analysis =
                buildAnalysis(
                    quote
                );

            res.json({

                success:
                    true,

                instrument,

                data:
                    analysis

            });

        } catch (error) {

            if (
                error.statusCode === 401
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const normalized =
                normalizeUpstoxError(
                    error
                );

            console.error(
                "LIVE QUOTE ERROR:",
                normalized.data ||
                normalized.message
            );

            res.status(
                normalized.status
            ).json({

                success:
                    false,

                code:
                    normalized.status === 401
                        ? "UPSTOX_TOKEN_EXPIRED"
                        : "LIVE_QUOTE_ERROR",

                message:
                    normalized.message,

                error:
                    normalized.data

            });

        }

    }
);
// ==========================================
// V7.1 TECHNICAL ANALYSIS
// ==========================================

app.get(
    "/api/technical",
    async (req, res) => {

        try {

            const instrument =
                (
                    req.query.instrument ||
                    ""
                ).trim();

            if (!instrument) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Instrument key is required"

                });

            }

            // Get historical candles
            const candles =
                await getHistoricalCandles(
                    instrument,
                    "1minute"
                );

            // ----------------------------------
            // Upstox candle format
            // ----------------------------------
            // [timestamp, open, high, low, close, volume, oi]

            const formattedCandles =
                candles.map(candle => ({

                    timestamp:
                        candle[0],

                    open:
                        Number(candle[1]),

                    high:
                        Number(candle[2]),

                    low:
                        Number(candle[3]),

                    close:
                        Number(candle[4]),

                    volume:
                        Number(candle[5] || 0),

                    oi:
                        Number(candle[6] || 0)

                })).reverse();

            if (
                formattedCandles.length < 21
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Not enough historical candles for technical analysis.",

                    candles:
                        formattedCandles.length

                });

            }

            const closes =
                formattedCandles.map(
                    candle => candle.close
                );

            // ----------------------------------
            // INDICATORS
            // ----------------------------------

            const ema9 =
                technical.ema(
                    closes,
                    9
                );

            const ema21 =
                technical.ema(
                    closes,
                    21
                );

            const rsi14 =
                technical.rsi(
                    closes,
                    14
                );

            const vwapValue =
                technical.vwap(
                    formattedCandles
                );

            const atr14 =
                technical.atr(
                    formattedCandles,
                    14
                );

            const avgVolume =
                technical.averageVolume(
                    formattedCandles,
                    20
                );

            const current =
                formattedCandles[
                    formattedCandles.length - 1
                ];

            const currentPrice =
                current.close;

            const volumeRatio =
                avgVolume > 0
                    ? current.volume /
                      avgVolume
                    : 0;

            // ----------------------------------
            // TREND
            // ----------------------------------

            let trend =
                "SIDEWAYS";

            if (
                ema9 &&
                ema21 &&
                ema9 > ema21 &&
                currentPrice > vwapValue
            ) {

                trend =
                    "BULLISH";

            } else if (
                ema9 &&
                ema21 &&
                ema9 < ema21 &&
                currentPrice < vwapValue
            ) {

                trend =
                    "BEARISH";

            }

            // ----------------------------------
            // VOLUME
            // ----------------------------------

            const volumeConfirmed =
                volumeRatio >= 1.5;

            // ----------------------------------
            // RSI
            // ----------------------------------

            let rsiSignal =
                "NEUTRAL";

            if (rsi14 >= 60) {

                rsiSignal =
                    "BULLISH";

            } else if (rsi14 <= 40) {

                rsiSignal =
                    "BEARISH";

            }

            // ----------------------------------
            // RESULT
            // ----------------------------------

            res.json({

                success: true,

                instrument,

                candles:
                    formattedCandles.length,

                data: {

                    price:
                        currentPrice,

                    ema9,

                    ema21,

                    rsi14,

                    vwap:
                        vwapValue,

                    atr14,

                    volume:
                        current.volume,

                    averageVolume:
                        avgVolume,

                    volumeRatio,

                    volumeConfirmed,

                    rsiSignal,

                    trend

                }

            });

        } catch (error) {

            console.error(
                "TECHNICAL ERROR:",
                error.response?.data ||
                error.message
            );

            const status =
                error.statusCode ||
                error.response?.status ||
                500;

            res.status(status).json({

                success: false,

                message:
                    error.message ||
                    "Technical analysis failed",

                error:
                    error.response?.data ||
                    error.message

            });

        }

    }
);

// ============================================================
// UPSTOX INSTRUMENT SEARCH
// ============================================================

async function searchUpstoxInstruments(
    query,
    options = {}
) {

    const params = {

        query:
            String(
                query
            ).trim(),

        exchanges:
            options.exchanges ||
            "NSE,BSE",

        segments:
            options.segments ||
            "EQ,INDEX",

        page_number:
            Number(
                options.pageNumber ||
                1
            ),

        records:
            Number(
                options.records ||
                30
            )

    };

    if (
        options.instrumentTypes
    ) {

        params.instrument_types =
            options.instrumentTypes;

    }

    if (
        options.expiry
    ) {

        params.expiry =
            options.expiry;

    }

    if (
        options.atmOffset !== undefined
    ) {

        params.atm_offset =
            options.atmOffset;

    }

    const response =
        await upstoxRequest({

            method:
                "GET",

            url:
                "/instruments/search",

            params

        });

    return response.data;

}


// ============================================================
// INSTRUMENT SEARCH API
// ============================================================

app.get(
    "/api/search",
    async (req, res) => {

        try {

            const query =
                String(
                    req.query.q ||
                    ""
                ).trim();

            if (
                !query
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Search query required."

                });

            }


            // =================================================
            // OPTIONS
            // =================================================

            const exchange =
                String(
                    req.query.exchange ||
                    "NSE"
                ).toUpperCase();

            const type =
                String(
                    req.query.type ||
                    "ALL"
                ).toUpperCase();


            let segments =
                "EQ,INDEX";

            let instrumentTypes =
                null;


            // =================================================
            // NSE EQUITY
            // =================================================

            if (
                type === "NSE" ||
                type === "EQ"
            ) {

                segments =
                    "EQ";

            }


            // =================================================
            // SME
            // =================================================
            //
            // SME shares are searched through NSE/BSE equity
            // instruments. The final instrument returned by
            // Upstox identifies the actual listing.
            //
            // =================================================

            if (
                type === "SME"
            ) {

                segments =
                    "EQ";

            }


            // =================================================
            // ETF
            // =================================================

            if (
                type === "ETF"
            ) {

                segments =
                    "EQ";

            }


            // =================================================
            // INDICES
            // =================================================

            if (
                type === "INDEX" ||
                type === "NIFTY" ||
                type === "BANKNIFTY"
            ) {

                segments =
                    "INDEX";

            }


            // =================================================
            // OPTIONS
            // =================================================

            if (
                type === "OPTION"
            ) {

                segments =
                    "FO";

                instrumentTypes =
                    "CE,PE";

            }


            // =================================================
            // FUTURES
            // =================================================

            if (
                type === "FUTURE"
            ) {

                segments =
                    "FO";

                instrumentTypes =
                    "FUT";

            }


            // =================================================
            // UPSTOX SEARCH
            // =================================================

            try {

                if (
                    !hasAccessToken()
                ) {

                    return sendTokenExpired(
                        res
                    );

                }

                const data =
                    await searchUpstoxInstruments(

                        query,

                        {

                            exchanges:
                                exchange === "ALL"
                                    ? "NSE,BSE"
                                    : exchange,

                            segments,

                            instrumentTypes,

                            records:
                                30

                        }

                    );

                const instruments =
                    Array.isArray(
                        data?.data
                    )
                        ? data.data
                        : [];


                const results =
                    instruments.map(
                        item => ({

                            symbol:
                                item.trading_symbol ||
                                item.short_name ||
                                "",

                            name:
                                item.name ||
                                item.short_name ||
                                item.trading_symbol ||
                                "",

                            exchange:
                                item.exchange ||
                                "",

                            segment:
                                item.segment ||
                                "",

                            instrument_type:
                                item.instrument_type ||
                                "",

                            instrument:
                                item.instrument_key ||
                                "",

                            isin:
                                item.isin ||
                                "",

                            lot_size:
                                item.lot_size ||
                                0,

                            tick_size:
                                item.tick_size ||
                                0,

                            expiry:
                                item.expiry ||
                                null,

                            strike_price:
                                item.strike_price ??
                                null,

                            short_name:
                                item.short_name ||
                                ""

                        })
                    );


                if (
                    results.length > 0
                ) {

                    return res.json({

                        success:
                            true,

                        authenticated:
                            true,

                        source:
                            "Upstox Instrument Search",

                        count:
                            results.length,

                        results

                    });

                }

            } catch (searchError) {

                if (
                    searchError.statusCode === 401
                ) {

                    return sendTokenExpired(
                        res
                    );

                }

                console.error(
                    "UPSTOX SEARCH ERROR:",
                    searchError.response?.data ||
                    searchError.message
                );

            }


            // =================================================
            // LOCAL FALLBACK
            // =================================================

            const upperQuery =
                query.toUpperCase();

            const fallbackResults =
                fallbackStocks.filter(
                    stock => {

                        const symbol =
                            String(
                                stock.symbol ||
                                ""
                            ).toUpperCase();

                        const name =
                            String(
                                stock.name ||
                                ""
                            ).toUpperCase();

                        const search =
                            String(
                                stock.search ||
                                ""
                            ).toUpperCase();

                        return (
                            symbol.includes(
                                upperQuery
                            ) ||
                            name.includes(
                                upperQuery
                            ) ||
                            search.includes(
                                upperQuery
                            )
                        );

                    }
                );


            return res.json({

                success:
                    true,

                authenticated:
                    hasAccessToken(),

                source:
                    "Local fallback",

                count:
                    fallbackResults.length,

                results:
                    fallbackResults.map(
                        stock => ({

                            symbol:
                                stock.symbol ||
                                "",

                            name:
                                stock.name ||
                                "",

                            exchange:
                                stock.exchange ||
                                "",

                            segment:
                                stock.segment ||
                                "",

                            instrument:
                                stock.instrument ||
                                ""

                        })
                    )

            });

        } catch (error) {

            if (
                error.statusCode === 401
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const normalized =
                normalizeUpstoxError(
                    error
                );

            res.status(
                normalized.status
            ).json({

                success:
                    false,

                message:
                    normalized.message,

                error:
                    normalized.data

            });

        }

    }
);


// ============================================================
// API SCAN
// ============================================================

app.get(
    "/api/scan",
    async (req, res) => {

        try {

            const stock =
                String(
                    req.query.stock ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (
                !stock
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please enter stock symbol."

                });

            }


            // =================================================
            // SEARCH UPSTOX
            // =================================================

            let instrument =
                "";

            let stockName =
                stock;

            let selectedInstrument =
                null;


            if (
                !hasAccessToken()
            ) {

                return sendTokenExpired(
                    res
                );

            }


            const searchData =
                await searchUpstoxInstruments(

                    stock,

                    {

                        exchanges:
                            "NSE,BSE",

                        segments:
                            "EQ,INDEX",

                        records:
                            30

                    }

                );


            const list =
                Array.isArray(
                    searchData?.data
                )
                    ? searchData.data
                    : [];


            // =================================================
            // EXACT SYMBOL MATCH
            // =================================================

            const exact =
                list.find(
                    item => {

                        const symbol =
                            String(
                                item.trading_symbol ||
                                ""
                            ).toUpperCase();

                        return (
                            symbol ===
                            stock
                        );

                    }
                );


            selectedInstrument =
                exact ||
                list[0] ||
                null;


            if (
                selectedInstrument
            ) {

                instrument =
                    selectedInstrument.instrument_key ||
                    "";

                stockName =
                    selectedInstrument.name ||
                    selectedInstrument.short_name ||
                    stock;

            }


            if (
                !instrument
            ) {

                return res.status(404).json({

                    success:
                        false,

                    code:
                        "INSTRUMENT_NOT_FOUND",

                    message:
                        `${stock} instrument not found in Upstox search.`

                });

            }


            // =================================================
            // LIVE QUOTE
            // =================================================

            const quote =
                await getUpstoxQuote(
                    instrument
                );

            const analysis =
                buildAnalysis(
                    quote
                );


            res.json({

                success:
                    true,

                name:
                    stockName,

                symbol:
                    stock,

                instrument,

                data:
                    analysis

            });

        } catch (error) {

            if (
                error.statusCode === 401
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const normalized =
                normalizeUpstoxError(
                    error
                );

            console.error(
                "SCAN ERROR:",
                normalized.data ||
                normalized.message
            );

            res.status(
                normalized.status
            ).json({

                success:
                    false,

                code:
                    normalized.status === 401
                        ? "UPSTOX_TOKEN_EXPIRED"
                        : "SCAN_ERROR",

                message:
                    normalized.message,

                error:
                    normalized.data

            });

        }

    }
);


// ============================================================
// QUICK INDEX ALIASES
// ============================================================
//
// These aliases are useful for the frontend.
//
// Upstox Instrument Search can resolve the actual
// instrument_key dynamically.
//
// ============================================================

const INDEX_ALIASES = {

    NIFTY50:
        "Nifty 50",

    NIFTY:
        "Nifty 50",

    BANKNIFTY:
        "Nifty Bank",

    FINNIFTY:
        "Nifty Financial Services",

    MIDCPNIFTY:
        "Nifty Midcap Select",

    INDIAVIX:
        "India VIX"

};


// ============================================================
// INDEX SEARCH
// ============================================================

app.get(
    "/api/index/:index",
    async (req, res) => {

        try {

            const requested =
                String(
                    req.params.index ||
                    ""
                )
                .trim()
                .toUpperCase();

            const query =
                INDEX_ALIASES[
                    requested
                ] ||
                requested;


            if (
                !query
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Index name required."

                });

            }


            if (
                !hasAccessToken()
            ) {

                return sendTokenExpired(
                    res
                );

            }


            const searchData =
                await searchUpstoxInstruments(

                    query,

                    {

                        exchanges:
                            "NSE",

                        segments:
                            "INDEX",

                        records:
                            30

                    }

                );


            const list =
                Array.isArray(
                    searchData?.data
                )
                    ? searchData.data
                    : [];


            if (
                list.length === 0
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        `${query} index instrument not found.`

                });

            }


            const selected =
                list.find(
                    item => {

                        const name =
                            String(
                                item.name ||
                                ""
                            ).toUpperCase();

                        const symbol =
                            String(
                                item.trading_symbol ||
                                ""
                            ).toUpperCase();

                        return (
                            name.includes(
                                query.toUpperCase()
                            ) ||
                            symbol.includes(
                                requested
                            )
                        );

                    }
                ) ||
                list[0];


            const instrument =
                selected.instrument_key ||
                "";


            if (
                !instrument
            ) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        "Index instrument key unavailable."

                });

            }


            const quote =
                await getUpstoxQuote(
                    instrument
                );


            const analysis =
                buildAnalysis(
                    quote
                );


            res.json({

                success:
                    true,

                symbol:
                    requested,

                name:
                    selected.name ||
                    query,

                instrument,

                data:
                    analysis

            });

        } catch (error) {

            if (
                error.statusCode === 401
            ) {

                return sendTokenExpired(
                    res
                );

            }

            const normalized =
                normalizeUpstoxError(
                    error
                );

            res.status(
                normalized.status
            ).json({

                success:
                    false,

                message:
                    normalized.message,

                error:
                    normalized.data

            });

        }

    }
);


// ============================================================
// API: SUPPORTED MARKETS
// ============================================================

app.get(
    "/api/markets",
    (req, res) => {

        res.json({

            success:
                true,

            markets: [

                {
                    id:
                        "NSE",

                    name:
                        "NSE Equity",

                    exchange:
                        "NSE",

                    segment:
                        "EQ"

                },

                {
                    id:
                        "SME",

                    name:
                        "NSE/BSE SME",

                    exchange:
                        "NSE,BSE",

                    segment:
                        "EQ"

                },

                {
                    id:
                        "ETF",

                    name:
                        "NSE ETF",

                    exchange:
                        "NSE",

                    segment:
                        "EQ"

                },

                {
                    id:
                        "NIFTY",

                    name:
                        "Nifty 50",

                    exchange:
                        "NSE",

                    segment:
                        "INDEX"

                },

                {
                    id:
                        "BANKNIFTY",

                    name:
                        "Nifty Bank",

                    exchange:
                        "NSE",

                    segment:
                        "INDEX"

                },

                {
                    id:
                        "FINNIFTY",

                    name:
                        "Nifty Financial Services",

                    exchange:
                        "NSE",

                    segment:
                        "INDEX"

                },

                {
                    id:
                        "MIDCPNIFTY",

                    name:
                        "Nifty Midcap Select",

                    exchange:
                        "NSE",

                    segment:
                        "INDEX"

                },

                {
                    id:
                        "INDIAVIX",

                    name:
                        "India VIX",

                    exchange:
                        "NSE",

                    segment:
                        "INDEX"

                }

            ]

        });

    }
);


// ============================================================
// 404 API
// ============================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success:
                false,

            message:
                "API endpoint not found.",

            endpoint:
                req.originalUrl

        });

    }
);


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "SERVER ERROR:",
            error
        );

        if (
            error.statusCode === 401
        ) {

            return sendTokenExpired(
                res
            );

        }

        res.status(500).json({

            success:
                false,

            message:
                "Internal server error."

        });

    }
);


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "=========================================="
        );

        console.log(
            "AI EQUITY SCANNER PRO V6"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Upstox token: ${
                hasAccessToken()
                    ? "AVAILABLE"
                    : "MISSING"
            }`
        );

        console.log(
            `Fallback stocks: ${fallbackStocks.length}`
        );

        console.log(
            "Supported:"
        );

        console.log(
            "NSE | SME | ETF | NIFTY | BANKNIFTY | FINNIFTY | MIDCPNIFTY | INDIA VIX"
        );

        console.log(
            "=========================================="
        );

    }
);
