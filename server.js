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
