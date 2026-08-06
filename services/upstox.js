const axios = require("axios");

const BASE_URL = "https://api.upstox.com/v2";

const ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN;

async function getQuote(instrumentKey) {

    try {

        const response = await axios.get(
            `${BASE_URL}/market-quote/quotes`,
            {
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${ACCESS_TOKEN}`
                },
                params: {
                    instrument_key: instrumentKey
                }
            }
        );

        return response.data;

    } catch (error) {

        console.error("Upstox Error:", error.response?.data || error.message);

        throw error;

    }

}

module.exports = {
    getQuote
};
