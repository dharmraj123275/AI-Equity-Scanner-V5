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

app.listen(PORT, () => {

    console.log(
        "AI Equity Scanner running on port " + PORT
    );

});
