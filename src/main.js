import fetch from 'node-fetch';
import 'dotenv/config';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import axios from 'axios';
import { instructions } from './instructions.js';
import { manual } from './manual.js';

// Markdown escaping function
const escapeMarkdownV2 = (text) => {
  if (typeof text !== 'string') return String(text);
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
};

// AI response validation
const validateAIResponse = (response, console) => {
  const requiredKeys = [
    'signal',
    'confidence',
    'timeframe',
    'summary',
    'potential_setups_forming',
    'key_levels_to_watch',
  ];
  for (const key of requiredKeys) {
    if (!(key in response)) {
      console.error(`AI response missing required field: ${key}`);
      throw new Error(`AI response missing required field: ${key}`);
    }
  }
  if (!['LONG', 'SHORT', 'HOLD'].includes(response.signal)) {
    console.error(`Invalid signal value: ${response.signal}`);
    throw new Error(`Invalid signal value: ${response.signal}`);
  }
  if (!['Low', 'Medium', 'High'].includes(response.confidence)) {
    console.error(`Invalid confidence value: ${response.confidence}`);
    throw new Error(`Invalid confidence value: ${response.confidence}`);
  }
  if (!['15m', '1h', '4h', 'daily'].includes(response.timeframe)) {
    console.error(`Invalid timeframe value: ${response.timeframe}`);
    throw new Error(`Invalid timeframe value: ${response.timeframe}`);
  }
  if (typeof response.potential_setups_forming !== 'string') {
    console.error(`potential_setups_forming must be a string`);
    throw new Error(`potential_setups_forming must be a string`);
  }
  if (!Array.isArray(response.key_levels_to_watch)) {
    console.error(`key_levels_to_watch must be an array`);
    throw new Error(`key_levels_to_watch must be an array`);
  }
  for (const level of response.key_levels_to_watch) {
    if (typeof level !== 'number') {
      console.error(`key_levels_to_watch contains non-number: ${level}`);
      throw new Error(`key_levels_to_watch contains non-number: ${level}`);
    }
  }
  return true;
};

export default async function (req, res) {
  // Environment variables
  const CRYPTOCOMPARE_API_KEY =
    process.env.CRYPTOCOMPARE_API_KEY || 'YOUR_API_KEY';
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
  const limit = 99; // Fetch 99 + 1 = 100 candles

  // Validate environment variables
  if (!CRYPTOCOMPARE_API_KEY || CRYPTOCOMPARE_API_KEY === 'YOUR_API_KEY') {
    console.error('CRYPTOCOMPARE_API_KEY is not set or invalid');
    return res.json({
      success: false,
      error: 'CRYPTOCOMPARE_API_KEY is not set or invalid',
    });
  }
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is not set');
    return res.json({ success: false, error: 'GEMINI_API_KEY is not set' });
  }
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not set');
    return res.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not set',
    });
  }

  // Fetch candle data
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

      console.log(`Fetching URL: ${url}`);
      console.log(`Fetching 100 ${timeframe} candles...`);

      const response = await fetch(url);
      console.log(
        `Response status for ${timeframe}: ${response.status} ${response.statusText}`
      );

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
      console.log(`Successfully fetched data for ${timeframe} timeframe`);

      if (data.Response === 'Error') {
        console.error(`API error for ${timeframe}: ${data.Message}`);
        throw new Error(
          `API error for ${timeframe} timeframe: ${data.Message}`
        );
      }

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
      throw error;
    }
  }

  // ICT Indicators function
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
            swingLowBetween = swingLows[j]; // Fixed typo
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

    for (let i = 0; i < priceData.length - 2; i++) {
      const candle1 = priceData[i];
      const candle2 = priceData[i + 1];
      const candle3 = priceData[i + 2];

      if (candle1.low > candle3.high) {
        const gapSize = candle1.low - candle3.high;
        const minGapPercent = 0.002;
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

      if (candle1.high < candle3.low) {
        const gapSize = candle3.low - candle1.high;
        const minGapPercent = 0.002;
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

    for (let i = 0; i < priceData.length; i++) {
      const candle = priceData[i];
      const bodySize = Math.abs(candle.open - candle.close);
      const minBodyPercent = 0.002;

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

    for (let i = 0; i < priceData.length; i++) {
      const candle = priceData[i];
      const bodySize = Math.abs(candle.open - candle.close);
      const minBodyPercent = 0.002;

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

    for (let i = 0; i < swingLows.length; i++) {
      const swingLow = swingLows[i];
      const index = swingLow.index;
      if (index >= 1 && index < priceData.length) {
        const candles = [];
        let j = index;
        const swingCandle = priceData[j];
        const swingBodySize = Math.abs(swingCandle.open - swingCandle.close);
        const swingLowerWick =
          swingCandle.open < swingCandle.close
            ? swingCandle.low - swingCandle.open
            : swingCandle.low - swingCandle.close;
        const minWickPercent = 0.002;
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
      if (index >= 1 && index < priceData.length) {
        const candles = [];
        let j = index;
        const swingCandle = priceData[j];
        const swingBodySize = Math.abs(swingCandle.open - swingCandle.close);
        const swingUpperWick =
          swingCandle.open > swingCandle.close
            ? swingCandle.high - swingCandle.open
            : swingCandle.high - swingCandle.close;
        const minWickPercent = 0.002;
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

    for (let i = 0; i < priceData.length; i++) {
      const candle = priceData[i];
      const bodySize = Math.abs(candle.open - candle.close);
      const minBodyPercent = 0.002;

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

  // Log indicators
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

  // Format data for AI prompt
  function formatDataForPrompt(results) {
    const formattedResults = {};
    for (const timeframe of Object.keys(results)) {
      formattedResults[timeframe] = {
        indicators: results[timeframe].indicators,
        latestPrice: results[timeframe].latestPrice,
      };
    }
    return formattedResults;
  }

  // Send to Telegram with retries and Markdown
  async function sendToTelegram(analysis) {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const formatMessage = (data) => {
      let message = `*BTC/USD ICT Analysis*\n\n`;
      message += `📊 *Signal:* ${escapeMarkdownV2(data.signal || 'N/A')}\n`;
      message += `🔥 *Confidence:* ${escapeMarkdownV2(data.confidence || 'N/A')}\n`;
      message += `⏰ *Timeframe:* ${escapeMarkdownV2(data.timeframe || 'N/A')}\n`;
      message += `✍️ *Summary:* ${escapeMarkdownV2(data.summary || 'No summary provided')}\n`;
      message += `🔄 *Potential Setups Forming:* ${escapeMarkdownV2(data.potential_setups_forming || 'None')}\n`;
      message += `🎯 *Key Levels to Watch:* ${escapeMarkdownV2(data.key_levels_to_watch.join(', ') || 'None')}\n`;
      return message.length > 4096
        ? message.substring(0, 4093) + '...'
        : message;
    };

    const message = formatMessage(analysis);
    console.log(`Telegram message length: ${message.length} characters`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt} to send to Telegram...`);
        const response = await axios.post(
          telegramUrl,
          {
            chat_id: TELEGRAM_CHANNEL_ID,
            text: message,
            parse_mode: 'MarkdownV2',
          },
          { timeout: 5000 }
        );

        if (response.data.ok) {
          console.log('Message sent to Telegram successfully');
          return;
        } else {
          throw new Error(`Telegram error: ${response.data.description}`);
        }
      } catch (err) {
        console.error(`Attempt ${attempt} failed: ${err.message}`);
        if (attempt === 1 && err.message.includes('Markdown')) {
          try {
            console.log('Retrying with plain text...');
            await axios.post(
              telegramUrl,
              {
                chat_id: TELEGRAM_CHANNEL_ID,
                text: message.replace(/[*_`[\]]/g, ''),
              },
              { timeout: 5000 }
            );
            console.log('Plain text message sent to Telegram');
            return;
          } catch (simpleErr) {
            console.error(`Plain text send failed: ${simpleErr.message}`);
          }
        }
        if (attempt < 3)
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        else throw new Error('Failed to send to Telegram after 3 attempts');
      }
    }
  }

  try {
    // Fetch candles and calculate indicators
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

    // Format data for Gemini
    const formattedResults = formatDataForPrompt(results);
    const prompt = `
Instructions: ${instructions}
Manual: ${manual}
Timeframe Data: ${JSON.stringify(formattedResults, null, 2)}
Command: Return only a JSON object matching the specified response_format, with no additional text, backticks, or formatting, as the response will be processed by another machine.
`;

    // Gemini API call
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    let analysis;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        console.log(`Attempt ${attempts + 1} to call Gemini...`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log('Gemini raw response:', responseText); // Log raw response
        let jsonString = responseText;
        // Try to extract JSON if wrapped in backticks
        const jsonMatch = responseText.match(/{[\s\S]*}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        try {
          analysis = JSON.parse(jsonString);
        } catch (parseErr) {
          console.error(`Failed to parse JSON: ${parseErr.message}`);
          throw new Error('Invalid JSON format in Gemini response');
        }
        console.log(
          'Gemini parsed response:',
          JSON.stringify(analysis, null, 2)
        ); // Log parsed JSON
        validateAIResponse(analysis, console);
        break;
      } catch (err) {
        attempts++;
        console.error(`Gemini attempt ${attempts} failed: ${err.message}`);
        if (attempts === maxAttempts)
          throw new Error(
            'Failed to get valid Gemini response after 3 attempts'
          );
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
      }
    }

    // Send to Telegram
    await sendToTelegram(analysis);

    // Return JSON response
    res.json({
      success: true,
      data: results,
      analysis,
    });
  } catch (error) {
    console.error(`Error in main execution: ${error.message}`);
    try {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHANNEL_ID,
          text: escapeMarkdownV2(
            `⚠️ Error in BTC/USD Analysis: ${error.message.substring(0, 200)}`
          ),
          parse_mode: 'MarkdownV2',
        },
        { timeout: 5000 }
      );
      console.log('Error notification sent to Telegram');
    } catch (telegramErr) {
      console.error(`Failed to send error to Telegram: ${telegramErr.message}`);
    }
    res.json({
      success: false,
      error: error.message,
    });
  }
}
