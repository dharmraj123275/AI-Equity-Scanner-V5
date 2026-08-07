require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

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
// Market Status
app.get("/api/status", (req, res) => {
  const now = new Date();

  // India time
  const indiaTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Asia/Kolkata"
    })
  );

  const day = indiaTime.getDay();
  const hours = indiaTime.getHours();
  const minutes = indiaTime.getMinutes();

  const currentMinutes = hours * 60 + minutes;

  // NSE market: Monday-Friday, 9:15 AM to 3:30 PM
  const marketOpen = 9 * 60 + 15;
  const marketClose = 15 * 60 + 30;

  const isWeekday = day >= 1 && day <= 5;
  const isOpen =
    isWeekday &&
    currentMinutes >= marketOpen &&
    currentMinutes <= marketClose;

  res.json({
    success: true,
    market: isOpen ? "🟢 MARKET LIVE" : "🔴 MARKET CLOSED",
    nifty: isOpen ? "🟢 Live" : "🔴 Closed",
    bankNifty: isOpen ? "🟢 Live" : "🔴 Closed",
    time: indiaTime.toLocaleTimeString("en-IN"),
    date: indiaTime.toLocaleDateString("en-IN")
  });
});
    

// ===============================
// LOGIN
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
// CALLBACK
// ===============================

app.get("/callback", (req, res) => {

    const code = req.query.code;

    if (!code) {

        return res.status(400).send(
            "Authorization code not received."
        );

    }

    res.send(`
        <html>

        <head>
            <title>Upstox Login</title>
        </head>

        <body>

            <h2>✅ Upstox Authorization Successful</h2>

            <p>
                Authorization code received.
            </p>

            <p>
                Token exchange will be completed in the next module.
            </p>

        </body>

        </html>
    `);

});

// ===============================
// SERVER
// ===============================
// ===============================
// UPSTOX TOKEN EXCHANGE
// ===============================

const axios = require("axios");

// ===============================
// UPSTOX OAUTH CALLBACK
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
                client_id: process.env.UPSTOX_API_KEY,
                client_secret: process.env.UPSTOX_API_SECRET,
                redirect_uri: process.env.UPSTOX_REDIRECT_URI,
                grant_type: "authorization_code"
            }),

            {
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                }
            }
        );

        const accessToken =
            response.data.access_token;

        console.log("Upstox OAuth Login Successful");

        // IMPORTANT:
        // Token is kept server-side only.
        // Do NOT send access token to browser.

        res.send(`
            <html>

            <head>
                <title>Upstox Connected</title>

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
                ${JSON.stringify(
                    error.response?.data ||
                    error.message
                )}
            </p>
        `);
    }

});


// ===============================
// LIVE UPSTOX QUOTE
// ===============================

app.get("/api/live", async (req, res) => {

    try {

        const instrument =
            req.query.instrument ||
            "NSE_EQ|INE002A01018";

        const token =
            process.env.UPSTOX_ACCESS_TOKEN;

        if (!token) {

            return res.status(500).json({
                success: false,
                message:
                    "UPSTOX_ACCESS_TOKEN is missing in Render Environment."
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

        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {

        console.error(
            "Upstox Quote Error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            message: "Unable to fetch live quote",
            error:
                error.response?.data ||
                error.message
        });

    }

});
// ===============================
// LIVE QUOTE API
// ===============================

app.get("/api/live", async (req, res) => {

    try {

        const instrument =
            req.query.instrument;

        if (!instrument) {

            return res.status(400).json({
                success: false,
                message: "Instrument key is required"
            });

        }

        const token =
            process.env.UPSTOX_ACCESS_TOKEN;

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

        res.json({
            success: true,
            data: response.data
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
// STOCK SEARCH API
// ===============================

app.get("/api/search", async (req, res) => {

    const query =
        (req.query.q || "").trim().toUpperCase();

    if (!query) {

        return res.status(400).json({
            success: false,
            message: "Search query required"
        });

    }

    try {

        // Temporary search list.
        // Later we will connect the complete
        // NSE + BSE + SME instrument master.

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
                stock.name.toUpperCase().includes(query)
            );

        res.json({
            success: true,
            count: results.length,
            results: results
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Search failed"
        });

    }

});
app.listen(PORT, () => {

    console.log(
        "AI Equity Scanner running on port " + PORT
    );

});
