// ==========================================
// AI EQUITY SCANNER PRO V7
// TECHNICAL INDICATORS
// ==========================================

function ema(values, period) {
    if (!values || values.length < period) {
        return null;
    }

    const multiplier =
        2 / (period + 1);

    let result =
        values
            .slice(0, period)
            .reduce(
                (a, b) => a + b,
                0
            ) / period;

    for (
        let i = period;
        i < values.length;
        i++
    ) {
        result =
            (
                values[i] - result
            ) *
            multiplier +
            result;
    }

    return result;
}


// ==========================================
// RSI
// ==========================================

function rsi(values, period = 14) {

    if (
        !values ||
        values.length <= period
    ) {
        return null;
    }

    let gains = 0;
    let losses = 0;

    for (
        let i = 1;
        i <= period;
        i++
    ) {

        const change =
            values[i] -
            values[i - 1];

        if (change >= 0) {
            gains += change;
        } else {
            losses -= change;
        }
    }

    let avgGain =
        gains / period;

    let avgLoss =
        losses / period;

    for (
        let i = period + 1;
        i < values.length;
        i++
    ) {

        const change =
            values[i] -
            values[i - 1];

        const gain =
            Math.max(
                change,
                0
            );

        const loss =
            Math.max(
                -change,
                0
            );

        avgGain =
            (
                avgGain *
                (period - 1) +
                gain
            ) / period;

        avgLoss =
            (
                avgLoss *
                (period - 1) +
                loss
            ) / period;
    }

    if (avgLoss === 0) {
        return 100;
    }

    const rs =
        avgGain /
        avgLoss;

    return (
        100 -
        100 / (1 + rs)
    );
}


// ==========================================
// VWAP
// ==========================================

function vwap(candles) {

    if (
        !candles ||
        candles.length === 0
    ) {
        return null;
    }

    let totalPV = 0;
    let totalVolume = 0;

    candles.forEach(candle => {

        const high =
            Number(candle.high);

        const low =
            Number(candle.low);

        const close =
            Number(candle.close);

        const volume =
            Number(candle.volume);

        const typicalPrice =
            (
                high +
                low +
                close
            ) / 3;

        totalPV +=
            typicalPrice *
            volume;

        totalVolume +=
            volume;
    });

    if (totalVolume === 0) {
        return null;
    }

    return (
        totalPV /
        totalVolume
    );
}


// ==========================================
// ATR
// ==========================================

function atr(
    candles,
    period = 14
) {

    if (
        !candles ||
        candles.length <= period
    ) {
        return null;
    }

    const trueRanges = [];

    for (
        let i = 1;
        i < candles.length;
        i++
    ) {

        const high =
            Number(
                candles[i].high
            );

        const low =
            Number(
                candles[i].low
            );

        const previousClose =
            Number(
                candles[i - 1].close
            );

        const tr =
            Math.max(
                high - low,
                Math.abs(
                    high -
                    previousClose
                ),
                Math.abs(
                    low -
                    previousClose
                )
            );

        trueRanges.push(tr);
    }

    if (
        trueRanges.length < period
    ) {
        return null;
    }

    const recent =
        trueRanges.slice(
            -period
        );

    return (
        recent.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period
    );
}


// ==========================================
// VOLUME AVERAGE
// ==========================================

function averageVolume(
    candles,
    period = 20
) {

    if (
        !candles ||
        candles.length < period
    ) {
        return null;
    }

    const volumes =
        candles
            .slice(-period)
            .map(
                candle =>
                    Number(
                        candle.volume || 0
                    )
            );

    return (
        volumes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / period
    );
}


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    ema,
    rsi,
    vwap,
    atr,
    averageVolume
};
