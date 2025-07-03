import fetch from 'node-fetch';
import { config } from 'dotenv';
config(); // Load environment variables from .env file

export default async function main(context) {
  const CRYPTOCOMPARE_API_KEY =
    process.env.CRYPTOCOMPARE_API_KEY || 'YOUR_API_KEY';
  const url = `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=99&aggregate=15&api_key=${CRYPTOCOMPARE_API_KEY}`;
  const limit = 100; // Fetch 100 candles (limit=99 gives 100 due to CryptoCompare API)

  try {
    context.log(
      `Fetching URL: ${url.replace(CRYPTOCOMPARE_API_KEY, 'HIDDEN')}`
    );
    context.log(`Fetching 100 15m candles...`);

    const response = await fetch(url);

    if (!response) {
      context.error('No response received from fetch');
      return context.res.json({ error: 'No response from fetch' }, 500);
    }

    if (!response.ok) {
      const errorText = await response.text();
      context.error(
        `HTTP error: ${response.status} ${response.statusText} - Details: ${errorText}`
      );
      return context.res.json(
        {
          error: `HTTP error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        response.status
      );
    }

    context.log(`Response status: ${response.status} ${response.statusText}`);
    const data = await response.json();

    if (data.Response === 'Error') {
      context.error(`API error: ${data.Message}`);
      return context.res.json({ error: `API error: ${data.Message}` }, 500);
    }

    const candles = data.Data.Data.slice(0, limit).map((item) => ({
      timestamp: item.time * 1000, // Convert to milliseconds
      high: item.high,
      low: item.low,
      open: item.open,
      close: item.close,
      volumefrom: item.volumefrom,
      volumeto: item.volumeto,
    }));

    context.log(`Successfully fetched ${candles.length} 15m candles`);
    return context.res.json({
      message: `Successfully fetched ${candles.length} 15m candles`,
      data: candles,
    });
  } catch (error) {
    context.error(`Error fetching 15m candles: ${error.message}`);
    return context.res.json(
      { error: `Error fetching 15m candles: ${error.message}` },
      500
    );
  }
}
