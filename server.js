require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// Home Page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Health API
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        app: "AI Equity Scanner V5",
        version: "5.0"
    });
});

// Market Status
app.get("/api/status", (req, res) => {
    res.json({
        market: "OPEN",
        nifty: "🟢 Live",
        bankNifty: "🟢 Live"
    });
});

// Market List
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

// Stock Scanner API
app.get("/api/scan", (req, res) => {

    const stock = (req.query.stock || "RELIANCE").toUpperCase();

    const stocks = {
        "RELIANCE": {
            name: "RELIANCE",
            signal: "STRONG BUY",
            aiScore: 92,
            price: 3125.40
        },
        "SBIN": {
            name: "SBIN",
            signal: "BUY",
            aiScore: 88,
            price: 924.50
        },
        "INFY": {
            name: "INFY",
            signal: "SELL",
            aiScore: 42,
            price: 1512.75
        }
    };

    res.json(
        stocks[stock] || {
            name: stock,
            signal: "NO DATA",
            aiScore: 0,
            price: 0
        }
    );
});

app.listen(PORT, () => {
    console.log(`AI Equity Scanner V5 running on port ${PORT}`);
});
