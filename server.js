// ==========================================
// AI EQUITY SCANNER PRO V5
// COMPLETE CLEAN SERVER.JS
// UPSTOX LIVE STOCK SCANNER
// ==========================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const fs = require("fs");

// ==========================================
// APP
// ==========================================

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
// LOAD stocks.json
// ==========================================

let fallbackStocks = [];

try {

    const stocksFile =
        path.join(
            __dirname,
            "stocks.json"
        );

    if (fs.existsSync(stocksFile)) {

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

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            status: "OK",

            app:
                "AI Equity Scanner Pro",

            version:
                "5.0",

            serverTime:
                new Date().toISOString()

        });

    }
);

// ==========================================
// MARKET STATUS
// ==========================================

app.get(
    "/api/status",
    (req, res) => {

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

            console.error(
                "STATUS ERROR:",
                error.message
            );

            res.status(500).json({

                success: false,

                message:
                    "Unable to get market status"

            });

        }

    }
);

// ==========================================
// UPSTOX LOGIN
// ==========================================

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

            return res.status(500).send(
                "Upstox API Key or Redirect URI is missing."
            );

        }

        const loginUrl =
            "https://api.upstox.com/v2/login/authorization/dialog" +
            "?response_type=code" +
            "&client_id=" +
            encodeURIComponent(
                clientId
            ) +
            "&redirect_uri=" +
            encodeURIComponent(
                redirectUri
            );

        res.redirect(
            loginUrl
        );

    }
);

// ==========================================
// UPSTOX CALLBACK
// ==========================================

app.get(
    "/callback",
    async (req, res) => {

        const code =
            req.query.code;

        if (!code) {

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

                        code:

                            code,

                        client_id:

                            process.env
                                .UPSTOX_API_KEY,

                        client_secret:

                            process.env
                                .UPSTOX_API_SECRET,

                        redirect_uri:

                            process.env
                                .UPSTOX_REDIRECT_URI,

                        grant_type:

                            "authorization_code"

                    }),

                    {

                        headers: {

                            "Content-Type":
                                "application/x-www-form-urlencoded",

                            "Accept":
                                "application/json"

                        },

                        timeout:
                            15000

                    }

                );

            console.log(
                "Upstox OAuth Login Successful"
            );

            console.log(
                "Access token received."
            );

            // IMPORTANT:
            // Access token is NOT shown in browser.

            res.send(`

                <html>

                <head>

                    <title>
                        Upstox Connected
                    </title>

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
                        ✅ Upstox Connected
                    </h2>

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

                <html>

                <body
                    style="
                    font-family:Arial;
                    text-align:center;
                    padding:40px;
                    "
                >

                    <h2>
                        ❌ Upstox Connection Failed
                    </h2>

                    <p>
                        Please check Render environment variables.
                    </p>

                    <small>
                        ${error.message}
                    </small>

                </body>

                </html>

            `);

        }

    }
);

// ==========================================
// HELPER
// GET UPSTOX QUOTE
// ==========================================

async function getUpstoxQuote(
    instrument
) {

    const token =
        process.env.UPSTOX_ACCESS_TOKEN;

    if (!token) {

        const error =
            new Error(
                "UPSTOX_ACCESS_TOKEN is missing in Render Environment."
            );

        error.statusCode =
            500;

        throw error;

    }

    if (!instrument) {

        const error =
            new Error(
                "Instrument key is required."
            );

        error.statusCode =
            400;

        throw error;

    }

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

                },

                timeout:
                    15000

            }

        );

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
                "No quote data available."
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
// BUILD AI ANALYSIS
// ==========================================

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

    // ==========================================
    // SUPPORT / RESISTANCE
    // ==========================================

    const support =
        low;

    const resistance =
        high;

    // ==========================================
    // TREND
    // ==========================================

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

    // ==========================================
    // AI SCORE
    // ==========================================

    let score =
        50;

    if (
        netChange > 0
    ) {

        score += 15;

    }

    if (
        netChange < 0
    ) {

        score -= 15;

    }

    if (
        price > open
    ) {

        score += 10;

    }

    if (
        price < open
    ) {

        score -= 10;

    }

    if (
        price > close
    ) {

        score += 5;

    }

    if (
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

    // ==========================================
    // TRADE LEVELS
    // ==========================================

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

    // ==========================================
    // RISK REWARD
    // ==========================================

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

    // ==========================================
    // MARKET DEPTH
    // ==========================================

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

// ==========================================
// API LIVE
// ==========================================

app.get(
    "/api/live",
    async (req, res) => {

        try {

            const instrument =
                (
                    req.query.instrument ||
                    ""
                ).trim();

            if (!instrument) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Instrument key is required"

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

                data:
                    analysis

            });

        } catch (error) {

            console.error(
                "LIVE QUOTE ERROR:",
                error.response?.data ||
                error.message
            );

            const status =
                error.statusCode ||
                error.response?.status ||
                500;

            res.status(
                status
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    "Live quote failed",

                error:
                    error.response?.data ||
                    error.message

            });

        }

    }
);

// ==========================================
// UPSTOX INSTRUMENT SEARCH
// ==========================================

async function searchUpstoxInstruments(
    query,
    options = {}
) {

    const token =
        process.env.UPSTOX_ACCESS_TOKEN;

    if (!token) {

        const error =
            new Error(
                "UPSTOX_ACCESS_TOKEN is missing in Render Environment."
            );

        error.statusCode =
            500;

        throw error;

    }

    const params = {

        query,

        exchanges:
            options.exchanges ||
            "NSE,BSE",

        segments:
            options.segments ||
            "EQ,INDEX",

        page_number:
            1,

        records:
            30

    };

    if (
        options.instrumentTypes
    ) {

        params.instrument_types =
            options.instrumentTypes;

    }

    const response =
        await axios.get(

            "https://api.upstox.com/v2/instruments/search",

            {

                headers: {

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`

                },

                params,

                timeout:
                    15000

            }

        );

    return response.data;

}

// ==========================================
// API SEARCH
// ==========================================

app.get(
    "/api/search",
    async (req, res) => {

        try {

            const query =
                (
                    req.query.q ||
                    ""
                ).trim();

            if (!query) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Search query required"

                });

            }

            // ==================================
            // UPSTOX SEARCH
            // ==================================

            try {

                const data =
                    await searchUpstoxInstruments(

                        query,

                        {

                            exchanges:
                                "NSE,BSE",

                            segments:
                                "EQ,INDEX"

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
                                item.strike_price ||
                                null

                        })
                    );

                if (
                    results.length > 0
                ) {

                    return res.json({

                        success:
                            true,

                        source:
                            "Upstox Instrument Search",

                        count:
                            results.length,

                        results

                    });

                }

            } catch (searchError) {

                console.error(

                    "UPSTOX SEARCH ERROR:",

                    searchError.response?.data ||
                    searchError.message

                );

            }

            // ==================================
            // LOCAL FALLBACK
            // ==================================

            const upperQuery =
                query.toUpperCase();

            const results =
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

            res.json({

                success:
                    true,

                source:
                    "Local fallback",

                count:
                    results.length,

                results:
                    results.map(
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

            console.error(
                "SEARCH ERROR:",
                error.message
            );

            res.status(500).json({

                success:
                    false,

                message:
                    "Stock search failed",

                error:
                    error.message

            });

        }

    }
);

// ==========================================
// API SCAN
// ==========================================

app.get(
    "/api/scan",
    async (req, res) => {

        try {

            const stock =
                (
                    req.query.stock ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            if (!stock) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        "Please enter stock symbol"

                });

            }

            // ==================================
            // FIND STOCK USING SEARCH
            // ==================================

            let instrument =
                "";

            let stockName =
                stock;

            const knownInstruments = {

                RELIANCE:
                    "NSE_EQ|INE002A01018",

                SBIN:
                    "NSE_EQ|INE062A01020",

                INFY:
                    "NSE_EQ|INE009A01021",

                TCS:
                    "NSE_EQ|INE467B01029",

                HDFCBANK:
                    "NSE_EQ|INE040A01034",

                ICICIBANK:
                    "NSE_EQ|INE090A01021",

                ITC:
                    "NSE_EQ|INE154A01025",

                LT:
                    "NSE_EQ|INE018A01030"

            };

            instrument =
                knownInstruments[
                    stock
                ] || "";

            // ==================================
            // DYNAMIC SEARCH
            // ==================================

            if (!instrument) {

                try {

                    const searchData =
                        await searchUpstoxInstruments(

                            stock,

                            {

                                exchanges:
                                    "NSE,BSE",

                                segments:
                                    "EQ,INDEX"

                            }

                        );

                    const list =
                        Array.isArray(
                            searchData?.data
                        )
                            ? searchData.data
                            : [];

                    const exact =
                        list.find(
                            item =>

                                String(
                                    item.trading_symbol ||
                                    ""
                                ).toUpperCase() ===
                                stock
                        );

                    const selected =
                        exact ||
                        list[0];

                    if (
                        selected
                    ) {

                        instrument =
                            selected.instrument_key ||
                            "";

                        stockName =
                            selected.name ||
                            selected.short_name ||
                            stock;

                    }

                } catch (searchError) {

                    console.error(

                        "SCAN SEARCH ERROR:",

                        searchError.response?.data ||
                        searchError.message

                    );

                }

            }

            if (!instrument) {

                return res.status(404).json({

                    success:
                        false,

                    message:
                        `${stock} instrument not found`

                });

            }

            // ==================================
            // GET LIVE QUOTE
            // ==================================

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

            console.error(
                "SCAN ERROR:",
                error.response?.data ||
                error.message
            );

            const status =
                error.statusCode ||
                error.response?.status ||
                500;

            res.status(
                status
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    "Stock scan failed",

                error:
                    error.response?.data ||
                    error.message

            });

        }

    }
);

// ==========================================
// 404 API HANDLER
// ==========================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success:
                false,

            message:
                "API endpoint not found",

            endpoint:
                req.originalUrl

        });

    }
);

// ==========================================
// SERVER ERROR HANDLER
// ==========================================

app.use(
    (error, req, res, next) => {

        console.error(
            "SERVER ERROR:",
            error
        );

        res.status(500).json({

            success:
                false,

            message:
                "Internal server error"

        });

    }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "=========================================="
        );

        console.log(
            "AI EQUITY SCANNER PRO V5"
        );

        console.log(
            "=========================================="
        );

        console.log(
            `Server running on port ${PORT}`
        );

        console.log(
            `Fallback stocks: ${fallbackStocks.length}`
        );

        console.log(
            "=========================================="
        );

    }
);
