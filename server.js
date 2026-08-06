require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { getQuote } = require("./services/upstox");

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
        app: "AI Equity Scanner V5"
    });
});

// Market Status
app.get("/api/status", (req, res) => {
    res.json({
        nifty: "LIVE",
        bankNifty: "LIVE"
    });
});

// Demo Market
app.get("/api/market", (req, res) => {
    res.json([
        {
            symbol: "RELIANCE",
            price: 3125.40,
            signal: "BUY",
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

// Scan API
app.get("/api/scan", (req, res) => {

    const stock = (req.query.stock || "RELIANCE").toUpperCase();

    res.json({
        name: stock,
        signal: "BUY",
        aiScore: 90,
        price: 1000
    });

});

// Live Quote API
app.get("/api/live", async (req, res) => {

    try {

        const instrument =
            req.query.instrument ||
            "NSE_EQ|INE002A01018";

        const data = await getQuote(instrument);

        res.json(data);

    } catch (err) {

        res.status(500).json({
            success: false,
            error: err.response?.data || err.message
        });

    }

});

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
