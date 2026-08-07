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
// MARKET STATUS
// ===============================

app.get("/api/status", (req, res) => {

    res.json({

        market: "NSE / BSE",

        nifty: "READY",

        bankNifty: "READY",

        server: "ONLINE"

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

app.post("/api/token", async (req, res) => {

    try {

        const code = req.body.code;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Authorization code is required"
            });
        }

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

        res.json({
            success: true,
            access_token: response.data.access_token,
            token_type: response.data.token_type
        });

    } catch (error) {

        console.error(
            "Upstox Token Error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            success: false,
            message: "Token exchange failed",
            error: error.response?.data || error.message
        });

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
app.listen(PORT, () => {

    console.log(
        "AI Equity Scanner running on port " + PORT
    );

});
