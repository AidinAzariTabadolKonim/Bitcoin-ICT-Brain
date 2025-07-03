import axios from 'axios';

export default async function ({ req, res, log, error }) {
  try {
    // CryptoCompare API key from environment
    const cryptoCompareApiKey = process.env.CRYPTOCOMPARE_API_KEY || '';
    const API_HEADERS = cryptoCompareApiKey
      ? { authorization: `Apikey ${cryptoCompareApiKey}` }
      : {};

    // Define timeframes and their configurations
    const timeframes = [
      {
        name: 'daily',
        endpoint: 'histoday',
        aggregate: 1,
        intervalMs: 24 * 60 * 60 * 1000, // 1 day
      },
      {
        name: '1h',
        endpoint: 'histohour',
        aggregate: 1,
        intervalMs: 60 * 60 * 1000, // 1 hour
      },
      {
        name: '4h',
        endpoint: 'histohour',
        aggregate: 4,
        intervalMs: 4 * 60 * 60 * 1000, // 4 hours
      },
      {
        name: '15m',
        endpoint: 'histominute',
        aggregate: 15,
        intervalMs: 15 * 60 * 1000, // 15 minutes
      },
    ];

    // Function to fetch candles for a given timeframe
    const fetchCandles = async (timeframeConfig) => {
      const { name, endpoint, aggregate } = timeframeConfig;
      log(`Fetching 100 ${name} candles...`);

      try {
        const response = await axios.get(
          `https://min-api.cryptocompare.com/data/v2/${endpoint}`,
          {
            params: {
              fsym: 'BTC',
              tsym: 'USD',
              limit: 100, // Fetch 100 candles
              aggregate: aggregate,
              toTs: Math.floor(Date.now() / 1000), // Up to current time
            },
            headers: API_HEADERS,
          }
        );

        const candleData = response.data.Data.Data;
        if (!candleData || candleData.length === 0) {
          throw new Error(`No ${name} data found`);
        }

        // Format and log candles
        log(`--- ${name.toUpperCase()} Candles ---`);
        candleData.forEach((candle, index) => {
          const date = new Date(candle.time * 1000).toISOString();
          log(
            `Candle ${index + 1}: Time=${date}, Open=${candle.open}, High=${
              candle.high
            }, Low=${candle.low}, Close=${candle.close}, VolumeBTC=${
              candle.volumefrom
            }, VolumeUSD=${candle.volumeto}`
          );
        });

        return candleData.length;
      } catch (err) {
        error(`Failed to fetch ${name} candles: ${err.message}`);
        // Retry logic for rate limits or server errors
        if (err.response?.status === 429 || err.response?.status >= 500) {
          const maxRetries = 3;
          for (let i = 1; i <= maxRetries; i++) {
            const delay = Math.pow(2, i) * 1000;
            log(`Retry ${i}/${maxRetries} for ${name} in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            try {
              return await fetchCandles(timeframeConfig);
            } catch (retryErr) {
              error(`Retry ${i} for ${name} failed: ${retryErr.message}`);
              if (i === maxRetries) throw retryErr;
            }
          }
        }
        throw err;
      }
    };

    // Process all timeframes
    const results = {};
    for (const timeframe of timeframes) {
      try {
        const count = await fetchCandles(timeframe);
        results[timeframe.name] = `Fetched ${count} candles`;
        // Add delay to avoid hitting rate limits
        await new Promise((resolve) => setTimeout(resolve, 1200));
      } catch (err) {
        results[timeframe.name] = `Error: ${err.message}`;
      }
    }

    // Return summary
    return res.json({
      status: 'success',
      results: results,
      message: 'Completed fetching candles for all timeframes',
    });
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
    return res.json({ error: `Unexpected error: ${err.message}` }, 500);
  }
}
