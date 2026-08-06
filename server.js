const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.PORT || 3000;

const API_KEY = process.env.UPSTOX_API_KEY;
const ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;

const headers = {
  "Accept": "application/json",
  "Authorization": `Bearer ${ACCESS_TOKEN}`
};

// Health Check
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
    nifty: "🟢 Live",
    bankNifty: "🟢 Live"
  });
});
// Demo market data (આને પછી Upstox Live API થી બદલશું)
app.get("/api/market", (req, res) => {

    res.json([
        {
            symbol: "RELIANCE",
            price: 3125.40,
            score: 92,
            signal: "STRONG BUY",
            rsi: 67,
            volume: "2.8M",
            entry: 3115,
            target: 3185,
            sl: 3085
        },
        {
            symbol: "SBIN",
            price: 924.50,
            score: 88,
            signal: "BUY",
            rsi: 61,
            volume: "5.1M",
            entry: 920,
            target: 940,
            sl: 910
        },
        {
            symbol: "INFY",
            price: 1512.75,
            score: 42,
            signal: "SELL",
            rsi: 38,
            volume: "1.6M",
            entry: 1510,
            target: 1480,
            sl: 1535
        }
    ]);

});

app.listen(PORT, () => {
    console.log(`AI Equity Scanner running on port ${PORT}`);
});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
