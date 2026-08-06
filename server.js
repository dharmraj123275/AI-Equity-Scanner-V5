require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// Home
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        app: "AI Equity Scanner V6"
    });
});

// Market Status
app.get("/api/status", (req, res) => {
    res.json({
        market: "LIVE",
        nifty: "🟢 LIVE",
        bankNifty: "🟢 LIVE"
    });
});

// Demo Market Data
app.get("/api/market", (req, res) => {

    res.json([
        {
            symbol: "RELIANCE",
            price: 3125.40,
            signal: "STRONG BUY",
            aiScore: 92
        },
        {
            symbol: "SBIN",
            price: 924.50,
            signal: "BUY",
            aiScore: 88
        },
        {
            symbol: "INFY",
            price: 1512.75,
            signal: "SELL",
            aiScore: 42
        }
    ]);

});

// Demo Scan
app.get("/api/scan", (req, res) => {

    const stock = (req.query.stock || "RELIANCE").toUpperCase();

    res.json({
        name: stock,
        signal: "BUY",
        aiScore: 91,
        price: 1234.56
    });

});

// Live Upstox Quote
app.get("/api/live", async (req, res) => {

    try {

        const instrument = req.query.instrument;

        const response = await axios.get(
            "https://api.upstox.com/v2/market-quote/quotes",
            {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`
                },
                params: {
                    instrument_key: instrument
                }
            }
        );

        res.json(response.data);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });

    }

});

app.listen(PORT, () => {

    console.log("AI Equity Scanner V6 Running on Port " + PORT);

});
