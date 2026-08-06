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

// Home page
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

// Status
app.get("/api/status", (req, res) => {
    res.json({
        market: "OPEN"
    });
});

// Demo Data
app.get("/api/market", (req, res) => {
    res.json([
        {
            symbol: "RELIANCE",
            price: 3125.40,
            signal: "BUY",
            score: 92
        },
        {
            symbol: "SBIN",
            price: 924.50,
            signal: "BUY",
            score: 88
        },
        {
            symbol: "INFY",
            price: 1512.75,
            signal: "SELL",
            score: 42
        }
    ]);
});

app.listen(PORT, () => {
    console.log("Server Running on Port " + PORT);
});
