import fetch from 'node-fetch';
import 'dotenv/config';

export async function handler(event, context) {
  const CRYPTOCOMPARE_API_KEY =
    process.env.CRYPTOCOMPARE_API_KEY || 'YOUR_API_KEY';
  const url = `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=99&aggregate=15&api_key=${CRYPTOCOMPARE_API_KEY}`;
  const limit = 100;

  try {
    context.log(
      `Fetching URL: ${url.replace(CRYPTOCOMPARE_API_KEY, 'HIDDEN')}`
    );
    context.log(`Fetching 100 15m candles...`);

    const response = await fetch(url);

    if (!response) {
      context.error('No response received from fetch');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No response' }),
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      context.error(
        `HTTP error: ${response.status} ${response.statusText} - Details: ${errorText}`
      );
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: errorText }),
      };
    }

    context.log(`Response status: ${response.status} ${response.statusText}`);
    const data = await response.json();

    if (data.Response === 'Error') {
      context.error(`API error: ${data.Message}`);
      return { statusCode: 500, body: JSON.stringify({ error: data.Message }) };
    }

    const candles = data.Data.Data.slice(0, limit).map((item) => ({
      timestamp: item.time * 1000,
      high: item.high,
      low: item.low,
      open: item.open,
      close: item.close,
      volumefrom: item.volumefrom,
      volumeto: item.volumeto,
    }));

    context.log(`Successfully fetched ${candles.length} 15m candles`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success', data: candles }),
    };
  } catch (error) {
    context.error(`Error fetching 15m candles: ${error.message}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
