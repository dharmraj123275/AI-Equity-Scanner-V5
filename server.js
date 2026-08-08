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


// ============================================================
// BUILD AI ANALYSIS
// ============================================================

function buildAnalysis(
    quote
) {

    const price =
        Number(
            quote?.last_price ||
            0
        );

    const ohlc =
        quote?.ohlc ||
        {};

    const open =
        Number(
            ohlc.open ||
            0
        );

    const high =
        Number(
            ohlc.high ||
            0
        );

    const low =
        Number(
            ohlc.low ||
            0
        );

    const close =
        Number(
            ohlc.close ||
            0
        );

    const netChange =
        Number(
            quote?.net_change ??
            (
                price -
                close
            )
        );

    const changePercent =
        close > 0
            ? (
                netChange /
                close
            ) * 100
            : 0;

    const volume =
        Number(
            quote?.volume ||
            0
        );

    const oi =
        Number(
            quote?.oi ||
            0
        );


    // ========================================================
    // SUPPORT / RESISTANCE
    // ========================================================

    const support =
        low;

    const resistance =
        high;


    // ========================================================
    // TREND
    // ========================================================

    let trend =
        "SIDEWAYS";

    if (
        price > open &&
        price >= close
    ) {

        trend =
            "BULLISH";

    } else if (
        price < open &&
        price <= close
    ) {

        trend =
            "BEARISH";

    }


    // ========================================================
    // AI SCORE
    // ========================================================

    let score =
        50;

    if (
        netChange > 0
    ) {

        score += 15;

    } else if (
        netChange < 0
    ) {

        score -= 15;

    }

    if (
        price > open
    ) {

        score += 10;

    } else if (
        price < open
    ) {

        score -= 10;

    }

    if (
        price > close
    ) {

        score += 5;

    } else if (
        price < close
    ) {

        score -= 5;

    }

    score =
        Math.max(
            0,
            Math.min(
                100,
                score
            )
        );


    // ========================================================
    // TRADE LEVELS
    // ========================================================

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


    if (
        trend ===
        "BULLISH"
    ) {

        signal =
            "BUY";

        entry =
            price;

        target1 =
            price +
            (
                (
                    resistance -
                    price
                ) * 0.50
            );

        target2 =
            resistance;

        stopLoss =
            support;

    } else if (
        trend ===
        "BEARISH"
    ) {

        signal =
            "SELL";

        entry =
            price;

        target1 =
            price -
            (
                (
                    price -
                    support
                ) * 0.50
            );

        target2 =
            support;

        stopLoss =
            resistance;

    }


    // ========================================================
    // RISK REWARD
    // ========================================================

    let riskReward =
        0;

    if (
        signal ===
        "BUY"
    ) {

        const risk =
            entry -
            stopLoss;

        const reward =
            target1 -
            entry;

        if (
            risk > 0
        ) {

            riskReward =
                reward /
                risk;

        }

    }

    if (
        signal ===
        "SELL"
    ) {

        const risk =
            stopLoss -
            entry;

        const reward =
            entry -
            target1;

        if (
            risk > 0
        ) {

            riskReward =
                reward /
                risk;

        }

    }


    // ========================================================
    // MARKET DEPTH
    // ========================================================

    const depth =
        quote?.depth ||
        {};

    const buy =
        Array.isArray(
            depth.buy
        )
            ? depth.buy
            : [];

    const sell =
        Array.isArray(
            depth.sell
        )
            ? depth.sell
            : [];

    const buyQuantity =
        buy.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(
                    item?.quantity ||
                    0
                ),
            0
        );

    const sellQuantity =
        sell.reduce(
            (
                sum,
                item
            ) =>
                sum +
                Number(
                    item?.quantity ||
                    0
                ),
            0
        );


    return {

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

        aiScore:
            score,

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
