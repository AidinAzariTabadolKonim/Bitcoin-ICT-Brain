import fetch from 'node-fetch';
import 'dotenv/config'; // Add this if using a .env file

export default async function (req, res) {
  // Environment variables
  const CRYPTOCOMPARE_API_KEY =
    process.env.CRYPTOCOMPARE_API_KEY || 'YOUR_API_KEY';
  const limit = 99; // Fetch 99 + 1 = 100 candles

  // Fetch candle data for a given timeframe with enhanced logging
  async function fetchCandleData(timeframe, limit) {
    try {
      let url;
      if (timeframe === 'daily') {
        url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${limit}&api_key=${CRYPTOCOMPARE_API_KEY}`;
      } else if (timeframe === '1h') {
        url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${limit}&api_key=${CRYPTOCOMPARE_API_KEY}`;
      } else if (timeframe === '4h') {
        url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${limit}&aggregate=4&api_key=${CRYPTOCOMPARE_API_KEY}`;
      } else if (timeframe === '15m') {
        url = `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=${limit}&aggregate=15&api_key=${CRYPTOCOMPARE_API_KEY}`;
      } else {
        console.error(`Unsupported timeframe requested: ${timeframe}`);
        throw new Error(`Unsupported timeframe: ${timeframe}`);
      }

      // Log the URL being fetched for debugging
      console.log(`Fetching URL: ${url}`);
      console.log(`Fetching 100 ${timeframe} candles...`);

      const response = await fetch(url);

      // Check if response is defined
      if (!response) {
        console.error(`No response received for ${timeframe} timeframe`);
        throw new Error(`No response received for ${timeframe} timeframe`);
      }

      // Log response status for debugging
      console.log(
        `Response status for ${timeframe}: ${response.status} ${response.statusText}`
      );

      // Check if response is OK (status 200-299)
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error for ${timeframe}: ${response.status} ${response.statusText} - Details: ${errorText}`
        );
        throw new Error(
          `HTTP error for ${timeframe} timeframe: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();

      // Log successful data retrieval
      console.log(`Successfully fetched data for ${timeframe} timeframe`);

      // Check if API returned an error
      if (data.Response === 'Error') {
        console.error(`API error for ${timeframe}: ${data.Message}`);
        throw new Error(
          `API error for ${timeframe} timeframe: ${data.Message}`
        );
      }

      // Map to the format expected by the indicators function and limit to exactly 100 candles
      const candles = data.Data.Data.slice(0, 100).map((item) => ({
        timestamp: item.time * 1000,
        high: item.high,
        low: item.low,
        open: item.open,
        close: item.close,
        volumefrom: item.volumefrom,
        volumeto: item.volumeto,
      }));

      console.log(`Processed ${candles.length} candles for ${timeframe}`);
      return candles;
    } catch (error) {
      console.error(`Error fetching ${timeframe} candles: ${error.message}`);
      throw error; // Re-throw to handle in the main try-catch
    }
  }

  // Function to find swing points, breakers, FVGs, order blocks, propulsion blocks, rejection blocks, and mitigation blocks
  function findSwingPointsBreakersFVGsOrderPropulsionRejectionAndMitigation(
    priceData
  ) {
    const swingHighs = [];
    const swingLows = [];
    const untappedHighs = [];
    const untappedLows = [];
    const bullishBreakers = [];
    const bearishBreakers = [];
    const bullishFVGs = [];
    const bearishFVGs = [];
    const bullishOrderBlocks = [];
    const bearishOrderBlocks = [];
    const bullishPropulsionBlocks = [];
    const bearishPropulsionBlocks = [];
    const bullishRejectionBlocks = [];
    const bearishRejectionBlocks = [];
    const bullishMitigationBlocks = [];
    const bearishMitigationBlocks = [];

    // Step 1: Identify swing highs and lows
    if (priceData.length < 3) {
      return {
        swingHighs: untappedHighs,
        swingLows: untappedLows,
        bullishBreakers,
        bearishBreakers,
        bullishFVGs,
        bearishFVGs,
        bullishOrderBlocks,
        bearishOrderBlocks,
        bullishPropulsionBlocks,
        bearishPropulsionBlocks,
        bullishRejectionBlocks,
        bearishRejectionBlocks,
        bullishMitigationBlocks,
        bearishMitigationBlocks,
      };
    }

    for (let i = 1; i < priceData.length - 1; i++) {
      const prevCandle = priceData[i - 1];
      const currentCandle = priceData[i];
      const nextCandle = priceData[i + 1];

      // Swing High
      if (
        currentCandle.high > prevCandle.high &&
        currentCandle.high > nextCandle.high
      ) {
        swingHighs.push({
          timestamp: currentCandle.timestamp,
          price: currentCandle.high,
          index: i,
        });
      }

      // Swing Low
      if (
        currentCandle.low < prevCandle.low &&
        currentCandle.low < nextCandle.low
      ) {
        swingLows.push({
          timestamp: currentCandle.timestamp,
          price: currentCandle.low,
          index: i,
        });
      }
    }

    // Step 2: Filter untapped swing highs and lows
    const latestPrice = priceData[priceData.length - 1].close;
    for (let i = 0; i < swingHighs.length; i++) {
      const swingHigh = swingHighs[i];
      let isUntapped = true;

      for (let j = swingHigh.index + 1; j < priceData.length; j++) {
        if (priceData[j].high >= swingHigh.price) {
          isUntapped = false;
          break;
        }
      }

      if (isUntapped && swingHigh.price > latestPrice) {
        untappedHighs.push({
          timestamp: swingHigh.timestamp,
          price: swingHigh.price,
        });
      }
    }

    for (let i = 0; i < swingLows.length; i++) {
      const swingLow = swingLows[i];
      let isUntapped = true;

      for (let j = swingLow.index + 1; j < priceData.length; j++) {
        if (priceData[j].low <= swingLow.price) {
          isUntapped = false;
          break;
        }
      }

      if (isUntapped && swingLow.price < latestPrice) {
        untappedLows.push({
          timestamp: swingLow.timestamp,
          price: swingLow.price,
        });
      }
    }

    // Step 3: Identify Bullish and Bearish Breaker Blocks
    for (let i = 1; i < swingLows.length; i++) {
      const currentLow = swingLows[i];
      const prevLow = swingLows[i - 1];

      if (currentLow.price < prevLow.price) {
        let swingHighBetween = null;
        for (let j = 0; j < swingHighs.length; j++) {
          if (
            swingHighs[j].index > prevLow.index &&
            swingHighs[j].index < currentLow.index
          ) {
            swingHighBetween = swingHighs[j];
            break;
          }
        }

        if (swingHighBetween) {
          let mssConfirmed = false;
          for (let j = currentLow.index + 1; j < priceData.length; j++) {
            if (priceData[j].high > swingHighBetween.price) {
              mssConfirmed = true;
              break;
            }
          }

          if (mssConfirmed) {
            bullishBreakers.push({
              timestamp: swingHighBetween.timestamp,
              price: swingHighBetween.price,
            });
          }
        }
      }
    }

    for (let i = 1; i < swingHighs.length; i++) {
      const currentHigh = swingHighs[i];
      const prevHigh = swingHighs[i - 1];

      if (currentHigh.price > prevHigh.price) {
        let swingLowBetween = null;
        for (let j = 0; j < swingLows.length; j++) {
          if (
            swingLows[j].index > prevHigh.index &&
            swingLows[j].index < currentHigh.index
          ) {
            swingLowBetween = swingLows[j];
            break;
          }
        }

        if (swingLowBetween) {
          let mssConfirmed = false;
          for (let j = currentHigh.index + 1; j < priceData.length; j++) {
            if (priceData[j].low < swingLowBetween.price) {
              mssConfirmed = true;
              break;
            }
          }

          if (mssConfirmed) {
            bearishBreakers.push({
              timestamp: swingLowBetween.timestamp,
              price: swingLowBetween.price,
            });
          }
        }
      }
    }

    // Step 4: Identify Bullish and Bearish FVGs
    for (let i = 0; i < priceData.length - 2; i++) {
      const candle1 = priceData[i];
      const candle2 = priceData[i + 1];
      const candle3 = priceData[i + 2];

      // Bullish FVG: Gap between candle1.low and candle3.high
      if (candle1.low > candle3.high) {
        const gapSize = candle1.low - candle3.high;
        const minGapPercent = 0.002; // 0.2%
        if (gapSize / candle3.high >= minGapPercent) {
          let isActive = 'active';
          const gapLow = candle3.high;
          const gapHigh = candle1.low;
          let maxFilled = 0;

          for (let j = i + 3; j < priceData.length; j++) {
            const currentCandle = priceData[j];
            if (currentCandle.high >= gapLow && currentCandle.low <= gapHigh) {
              const filledHigh = Math.min(currentCandle.high, gapHigh);
              const filledLow = Math.max(currentCandle.low, gapLow);
              const filledSize = filledHigh - filledLow;
              const fillPercent = filledSize / gapSize;
              maxFilled = Math.max(maxFilled, fillPercent);
            }
          }

          if (maxFilled > 0) {
            isActive = maxFilled > 0.8 ? 'inactive' : 'partially_active';
          }

          bullishFVGs.push({
            timestamp: candle2.timestamp,
            high: gapHigh,
            low: gapLow,
            isActive,
          });
        }
      }

      // Bearish FVG: Gap between candle1.high and candle3.low
      if (candle1.high < candle3.low) {
        const gapSize = candle3.low - candle1.high;
        const minGapPercent = 0.002; // 0.2%
        if (gapSize / candle1.high >= minGapPercent) {
          let isActive = 'active';
          const gapLow = candle1.high;
          const gapHigh = candle3.low;
          let maxFilled = 0;

          for (let j = i + 3; j < priceData.length; j++) {
            const currentCandle = priceData[j];
            if (currentCandle.high >= gapLow && currentCandle.low <= gapHigh) {
              const filledHigh = Math.min(currentCandle.high, gapHigh);
              const filledLow = Math.max(currentCandle.low, gapLow);
              const filledSize = filledHigh - filledLow;
              const fillPercent = filledSize / gapSize;
              maxFilled = Math.max(maxFilled, fillPercent);
            }
          }

          if (maxFilled > 0) {
            isActive = maxFilled > 0.8 ? 'inactive' : 'partially_active';
          }

          bearishFVGs.push({
            timestamp: candle2.timestamp,
            high: gapHigh,
            low: gapLow,
            isActive,
          });
        }
      }
    }

    // Step 5: Identify Bullish and Bearish Order Blocks
    for (let i = 0; i < priceData.length; i++) {
      const candle = priceData[i];
      const bodySize = Math.abs(candle.open - candle.close);
      const minBodyPercent = 0.002; // 0.2%

      // Bullish Order Block: Down-close candle near a swing low
      if (
        candle.close < candle.open &&
        bodySize / candle.open >= minBodyPercent
      ) {
        let nearSwingLow = false;
        for (let j = 0; j < swingLows.length; j++) {
          const swingLow = swingLows[j];
          const priceDiff =
            Math.abs(candle.low - swingLow.price) / swingLow.price;
          if (priceDiff <= 0.005 || swingLow.index === i) {
            nearSwingLow = true;
            break;
          }
        }

        if (nearSwingLow) {
          let isValidated = false;
          for (let j = i + 1; j < priceData.length; j++) {
            if (priceData[j].high > candle.high) {
              isValidated = true;
              break;
            }
          }

          if (isValidated) {
            const meanThreshold = (candle.open + candle.close) / 2;
            let isActive = true;

            for (let j = i + 1; j < priceData.length; j++) {
              if (priceData[j].close < meanThreshold) {
                isActive = false;
                break;
              }
            }

            bullishOrderBlocks.push({
              timestamp: candle.timestamp,
              price: meanThreshold,
              isActive,
            });
          }
        }
      }

      // Bearish Order Block: Up-close candle near a swing high
      if (
        candle.close > candle.open &&
        bodySize / candle.open >= minBodyPercent
      ) {
        let nearSwingHigh = false;
        for (let j = 0; j < swingHighs.length; j++) {
          const swingHigh = swingHighs[j];
          const priceDiff =
            Math.abs(candle.high - swingHigh.price) / swingHigh.price;
          if (priceDiff <= 0.005 || swingHigh.index === i) {
            nearSwingHigh = true;
            break;
          }
        }

        if (nearSwingHigh) {
          let isValidated = false;
          for (let j = i + 1; j < priceData.length; j++) {
            if (priceData[j].low < candle.low) {
              isValidated = true;
              break;
            }
          }

          if (isValidated) {
            const meanThreshold = (candle.open + candle.close) / 2;
            let isActive = true;

            for (let j = i + 1; j < priceData.length; j++) {
              if (priceData[j].close > meanThreshold) {
                isActive = false;
                break;
              }
            }

            bearishOrderBlocks.push({
              timestamp: candle.timestamp,
              price: meanThreshold,
              isActive,
            });
          }
        }
      }
    }

    // Step 6: Identify Bullish and Bearish Propulsion Blocks
    for (let i = 0; i < priceData.length; i++) {
      const candle = priceData[i];
      const bodySize = Math.abs(candle.open - candle.close);
      const minBodyPercent = 0.002; // 0.2%

      // Bullish Propulsion Block: Down-close candle near a bullish order block
      if (
        candle.close < candle.open &&
        bodySize / candle.open >= minBodyPercent
      ) {
        let nearOrderBlock = false;
        for (let j = 0; j < bullishOrderBlocks.length; j++) {
          const orderBlock = bullishOrderBlocks[j];
          const priceDiff =
            Math.abs(candle.low - orderBlock.price) / orderBlock.price;
          if (priceDiff <= 0.005) {
            nearOrderBlock = true;
            break;
          }
        }

        if (nearOrderBlock) {
          const meanThreshold = (candle.open + candle.close) / 2;
          let isActive = true;

          for (let j = i + 1; j < priceData.length; j++) {
            if (priceData[j].close < meanThreshold) {
              isActive = false;
              break;
            }
          }

          bullishPropulsionBlocks.push({
            timestamp: candle.timestamp,
            price: meanThreshold,
            isActive,
          });
        }
      }

      // Bearish Propulsion Block: Up-close candle near a bearish order block
      if (
        candle.close > candle.open &&
        bodySize / candle.open >= minBodyPercent
      ) {
        let nearOrderBlock = false;
        for (let j = 0; j < bearishOrderBlocks.length; j++) {
          const orderBlock = bearishOrderBlocks[j];
          const priceDiff =
            Math.abs(candle.high - orderBlock.price) / orderBlock.price;
          if (priceDiff <= 0.005) {
            nearOrderBlock = true;
            break;
          }
        }

        if (nearOrderBlock) {
          const meanThreshold = (candle.open + candle.close) / 2;
          let isActive = true;

          for (let j = i + 1; j < priceData.length; j++) {
            if (priceData[j].close > meanThreshold) {
              isActive = false;
              break;
            }
          }

          bearishPropulsionBlocks.push({
            timestamp: candle.timestamp,
            price: meanThreshold,
            isActive,
          });
        }
      }
    }

    // Step 7: Identify Bullish and Bearish Rejection Blocks
    for (let i = 0; i < swingLows.length; i++) {
      const swingLow = swingLows[i];
      const index = swingLow.index;

      // Bullish Rejection Block: Cluster of 2+ candles with long lower wicks
      if (index >= 1 && index < priceData.length) {
        const candles = [];
        let j = index;
        const swingCandle = priceData[j];
        const swingBodySize = Math.abs(swingCandle.open - swingCandle.close);
        const swingLowerWick =
          swingCandle.open < swingCandle.close
            ? swingCandle.low - swingCandle.open
            : swingCandle.low - swingCandle.close;
        const minWickPercent = 0.002; // 0.2%
        if (
          swingLowerWick >= swingBodySize &&
          swingLowerWick / swingCandle.open >= minWickPercent
        ) {
          candles.push(swingCandle);
        }

        while (j > 0 && candles.length < 5) {
          const prevCandle = priceData[j - 1];
          const prevBodySize = Math.abs(prevCandle.open - prevCandle.close);
          const prevLowerWick =
            prevCandle.open < prevCandle.close
              ? prevCandle.low - prevCandle.open
              : prevCandle.low - prevCandle.close;
          if (
            prevLowerWick >= prevBodySize &&
            prevLowerWick / prevCandle.open >= minWickPercent
          ) {
            candles.push(prevCandle);
            j--;
          } else {
            break;
          }
        }

        if (candles.length >= 2) {
          let lowestWick = Infinity;
          let highestBodyClose = -Infinity;
          let lowestBodyClose = Infinity;

          for (const candle of candles) {
            lowestWick = Math.min(lowestWick, candle.low);
            const bodyClose = Math.max(candle.open, candle.close);
            highestBodyClose = Math.max(highestBodyClose, bodyClose);
            lowestBodyClose = Math.min(
              lowestBodyClose,
              Math.min(candle.open, candle.close)
            );
          }

          // Validate: Price breaks below lowest body close, then reverses
          let isValidated = false;
          for (let j = index + 1; j < priceData.length && j <= index + 5; j++) {
            if (
              priceData[j].low < lowestBodyClose &&
              priceData[j].close > lowestBodyClose
            ) {
              isValidated = true;
              break;
            }
          }

          if (isValidated) {
            let isActive = true;
            for (let j = index + 1; j < priceData.length; j++) {
              if (priceData[j].close < lowestWick) {
                isActive = false;
                break;
              }
            }

            bullishRejectionBlocks.push({
              timestamp: swingLow.timestamp,
              price: highestBodyClose,
              isActive,
            });
          }
        }
      }
    }

    for (let i = 0; i < swingHighs.length; i++) {
      const swingHigh = swingHighs[i];
      const index = swingHigh.index;

      // Bearish Rejection Block: Cluster of 2+ candles with long upper wicks
      if (index >= 1 && index < priceData.length) {
        const candles = [];
        let j = index;
        const swingCandle = priceData[j];
        const swingBodySize = Math.abs(swingCandle.open - swingCandle.close);
        const swingUpperWick =
          swingCandle.open > swingCandle.close
            ? swingCandle.high - swingCandle.open
            : swingCandle.high - swingCandle.close;
        const minWickPercent = 0.002; // 0.2%
        if (
          swingUpperWick >= swingBodySize &&
          swingUpperWick / swingCandle.open >= minWickPercent
        ) {
          candles.push(swingCandle);
        }

        while (j > 0 && candles.length < 5) {
          const prevCandle = priceData[j - 1];
          const prevBodySize = Math.abs(prevCandle.open - prevCandle.close);
          const prevUpperWick =
            prevCandle.open > prevCandle.close
              ? prevCandle.high - prevCandle.open
              : prevCandle.high - prevCandle.close;
          if (
            prevUpperWick >= prevBodySize &&
            prevUpperWick / prevCandle.open >= minWickPercent
          ) {
            candles.push(prevCandle);
            j--;
          } else {
            break;
          }
        }

        if (candles.length >= 2) {
          let highestWick = -Infinity;
          let lowestBodyClose = Infinity;
          let highestBodyClose = -Infinity;

          for (const candle of candles) {
            highestWick = Math.max(highestWick, candle.high);
            const bodyClose = Math.min(candle.open, candle.close);
            lowestBodyClose = Math.min(lowestBodyClose, bodyClose);
            highestBodyClose = Math.max(
              highestBodyClose,
              Math.max(candle.open, candle.close)
            );
          }

          // Validate: Price breaks above highest body close, then reverses
          let isValidated = false;
          for (let j = index + 1; j < priceData.length && j <= index + 5; j++) {
            if (
              priceData[j].high > highestBodyClose &&
              priceData[j].close < highestBodyClose
            ) {
              isValidated = true;
              break;
            }
          }

          if (isValidated) {
            let isActive = true;
            for (let j = index + 1; j < priceData.length; j++) {
              if (priceData[j].close > highestWick) {
                isActive = false;
                break;
              }
            }

            bearishRejectionBlocks.push({
              timestamp: swingHigh.timestamp,
              price: lowestBodyClose,
              isActive,
            });
          }
        }
      }
    }

    // Step 8: Identify Bullish and Bearish Mitigation Blocks
    for (let i = 0; i < priceData.length; i++) {
      const candle = priceData[i];
      const bodySize = Math.abs(candle.open - candle.close);
      const minBodyPercent = 0.002; // 0.2%

      // Bearish Mitigation Block: Last down-close candle before MSS (break below swing low)
      if (
        candle.close < candle.open &&
        bodySize / candle.open >= minBodyPercent
      ) {
        let mssConfirmed = false;
        let mssIndex = -1;
        for (let j = i + 1; j < priceData.length && j <= i + 5; j++) {
          for (let k = 0; k < swingLows.length; k++) {
            if (swingLows[k].index < i) {
              if (priceData[j].low < swingLows[k].price) {
                mssConfirmed = true;
                mssIndex = j;
                break;
              }
            }
          }
          if (mssConfirmed) break;
        }

        if (mssConfirmed) {
          let isLast = true;
          for (let j = i + 1; j < mssIndex; j++) {
            const nextCandle = priceData[j];
            if (
              nextCandle.close < nextCandle.open &&
              Math.abs(nextCandle.open - nextCandle.close) / nextCandle.open >=
                minBodyPercent
            ) {
              isLast = false;
              break;
            }
          }

          if (isLast) {
            const meanThreshold = (candle.open + candle.close) / 2;
            let isActive = true;

            for (let j = i + 1; j < priceData.length; j++) {
              if (priceData[j].close > candle.high) {
                isActive = false;
                break;
              }
            }

            bearishMitigationBlocks.push({
              timestamp: candle.timestamp,
              price: meanThreshold,
              isActive,
            });
          }
        }
      }

      // Bullish Mitigation Block: Last up-close candle before MSS (break above swing high)
      if (
        candle.close > candle.open &&
        bodySize / candle.open >= minBodyPercent
      ) {
        let mssConfirmed = false;
        let mssIndex = -1;
        for (let j = i + 1; j < priceData.length && j <= i + 5; j++) {
          for (let k = 0; k < swingHighs.length; k++) {
            if (swingHighs[k].index < i) {
              if (priceData[j].high > swingHighs[k].price) {
                mssConfirmed = true;
                mssIndex = j;
                break;
              }
            }
          }
          if (mssConfirmed) break;
        }

        if (mssConfirmed) {
          let isLast = true;
          for (let j = i + 1; j < mssIndex; j++) {
            const nextCandle = priceData[j];
            if (
              nextCandle.close > nextCandle.open &&
              Math.abs(nextCandle.open - nextCandle.close) / nextCandle.open >=
                minBodyPercent
            ) {
              isLast = false;
              break;
            }
          }

          if (isLast) {
            const meanThreshold = (candle.open + candle.close) / 2;
            let isActive = true;

            for (let j = i + 1; j < priceData.length; j++) {
              if (priceData[j].close < candle.low) {
                isActive = false;
                break;
              }
            }

            bullishMitigationBlocks.push({
              timestamp: candle.timestamp,
              price: meanThreshold,
              isActive,
            });
          }
        }
      }
    }

    // Sort by timestamp
    untappedHighs.sort((a, b) => a.timestamp - b.timestamp);
    untappedLows.sort((a, b) => a.timestamp - b.timestamp);
    bullishBreakers.sort((a, b) => a.timestamp - b.timestamp);
    bearishBreakers.sort((a, b) => a.timestamp - b.timestamp);
    bullishFVGs.sort((a, b) => a.timestamp - b.timestamp);
    bearishFVGs.sort((a, b) => a.timestamp - b.timestamp);
    bullishOrderBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bearishOrderBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bullishPropulsionBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bearishPropulsionBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bullishRejectionBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bearishRejectionBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bullishMitigationBlocks.sort((a, b) => a.timestamp - b.timestamp);
    bearishMitigationBlocks.sort((a, b) => a.timestamp - b.timestamp);

    return {
      swingHighs: untappedHighs,
      swingLows: untappedLows,
      bullishBreakers,
      bearishBreakers,
      bullishFVGs,
      bearishFVGs,
      bullishOrderBlocks,
      bearishOrderBlocks,
      bullishPropulsionBlocks,
      bearishPropulsionBlocks,
      bullishRejectionBlocks,
      bearishRejectionBlocks,
      bullishMitigationBlocks,
      bearishMitigationBlocks,
    };
  }

  // Function to log indicators only
  function logResults(timeframe, candles, indicators) {
    console.log(`\n--- ${timeframe.toUpperCase()} ICT Indicators ---`);
    console.log('Swing Highs:', JSON.stringify(indicators.swingHighs, null, 2));
    console.log('Swing Lows:', JSON.stringify(indicators.swingLows, null, 2));
    console.log(
      'Bullish Breakers:',
      JSON.stringify(indicators.bullishBreakers, null, 2)
    );
    console.log(
      'Bearish Breakers:',
      JSON.stringify(indicators.bearishBreakers, null, 2)
    );
    console.log(
      'Bullish FVGs:',
      JSON.stringify(indicators.bullishFVGs, null, 2)
    );
    console.log(
      'Bearish FVGs:',
      JSON.stringify(indicators.bearishFVGs, null, 2)
    );
    console.log(
      'Bullish Order Blocks:',
      JSON.stringify(indicators.bullishOrderBlocks, null, 2)
    );
    console.log(
      'Bearish Order Blocks:',
      JSON.stringify(indicators.bearishOrderBlocks, null, 2)
    );
    console.log(
      'Bullish Propulsion Blocks:',
      JSON.stringify(indicators.bullishPropulsionBlocks, null, 2)
    );
    console.log(
      'Bearish Propulsion Blocks:',
      JSON.stringify(indicators.bearishPropulsionBlocks, null, 2)
    );
    console.log(
      'Bullish Rejection Blocks:',
      JSON.stringify(indicators.bullishRejectionBlocks, null, 2)
    );
    console.log(
      'Bearish Rejection Blocks:',
      JSON.stringify(indicators.bearishRejectionBlocks, null, 2)
    );
    console.log(
      'Bullish Mitigation Blocks:',
      JSON.stringify(indicators.bullishMitigationBlocks, null, 2)
    );
    console.log(
      'Bearish Mitigation Blocks:',
      JSON.stringify(indicators.bearishMitigationBlocks, null, 2)
    );
    console.log(`Latest Price: ${candles[candles.length - 1].close}`);
  }

  try {
    // Fetch candles for each timeframe
    const timeframes = ['daily', '1h', '4h', '15m'];
    const results = {};

    for (const timeframe of timeframes) {
      const candles = await fetchCandleData(timeframe, limit);
      const indicators =
        findSwingPointsBreakersFVGsOrderPropulsionRejectionAndMitigation(
          candles
        );
      results[timeframe] = {
        candles,
        indicators,
        latestPrice: candles[candles.length - 1].close,
      };
      logResults(timeframe, candles, indicators);
    }

    // Return JSON response
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error(`Error in main execution: ${error.message}`);
    res.json({
      success: false,
      error: error.message,
    });
  }
}
