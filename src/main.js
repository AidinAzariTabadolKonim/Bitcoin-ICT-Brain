import fetch from 'node-fetch';
import 'dotenv/config'; // Load environment variables from .env file

async function testFetch15mCandles() {
  const CRYPTOCOMPARE_API_KEY =
    process.env.CRYPTOCOMPARE_API_KEY || 'YOUR_API_KEY';
  const url = `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=99&aggregate=15&api_key=${CRYPTOCOMPARE_API_KEY}`;
  const limit = 100; // Fetch 100 candles (limit=99 gives 100 due to CryptoCompare API)

  try {
    console.log(`Fetching URL: ${url}`);
    console.log(`Fetching 100 15m candles...`);

    const response = await fetch(url);

    // Check if response is defined
    if (!response) {
      console.error('No response received from fetch');
      return;
    }

    // Check if response is OK (status 200-299)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `HTTP error: ${response.status} ${response.statusText} - Details: ${errorText}`
      );
      return;
    }

    console.log(`Response status: ${response.status} ${response.statusText}`);
    const data = await response.json();

    // Check if API returned an error
    if (data.Response === 'Error') {
      console.error(`API error: ${data.Message}`);
      return;
    }

    // Map to the format expected
    const candles = data.Data.Data.slice(0, limit).map((item) => ({
      timestamp: item.time * 1000, // Convert to milliseconds
      high: item.high,
      low: item.low,
      open: item.open,
      close: item.close,
      volumefrom: item.volumefrom,
      volumeto: item.volumeto,
    }));

    console.log(`Successfully fetched ${candles.length} 15m candles:`);
    console.log(JSON.stringify(candles, null, 2));
  } catch (error) {
    console.error(`Error fetching 15m candles: ${error.message}`);
  }
}

// Execute the test function
testFetch15mCandles();
