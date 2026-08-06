const axios = require("axios");

const BASE_URL = "https://api.upstox.com/v2";

async function getQuote(instrumentKey) {

    const token = process.env.UPSTOX_ACCESS_TOKEN;

    if (!token) {
        throw new Error("UPSTOX_ACCESS_TOKEN is missing");
    }

    const response = await axios.get(
        `${BASE_URL}/market-quote/quotes`,
        {
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`
            },
            params: {
                instrument_key: instrumentKey
            }
        }
    );

    return response.data;
}

module.exports = {
    getQuote
};
