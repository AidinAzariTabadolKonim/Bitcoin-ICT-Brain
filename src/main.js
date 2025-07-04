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
import pkg from 'docx';
const { Document, Packer, Paragraph } = pkg;
import fs from 'fs';
import FormData from 'form-data';

// Utility to format timestamp to MM/DD/YY
function formatTimestampToDate(timestamp) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

// Markdown escaping function
function escapeMarkdownV2(text) {
  const reservedChars = [
    '_',
    '*',
    '[',
    ']',
    '(',
    ')',
    '~',
    '`',
    '>',
    '#',
    '+',
    '-',
    '=',
    '|',
    '{',
    '}',
    '.',
    '!',
  ];
  if (typeof text !== 'string') {
    return String(text);
  }
  let escapedText = '';
  for (const char of text) {
    if (reservedChars.includes(char)) {
      escapedText += '\\' + char;
    } else {
      escapedText += char;
    }
  }
  return escapedText;
}

// Generate .docx file with AI prompt
const generateDocx = async (prompt, context) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'BTC/USD ICT Analysis Prompt',
            heading: 'Heading1',
          }),
          new Paragraph({
            text: prompt,
            spacing: { after: 200 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = '/tmp/ai_prompt.docx';
  fs.writeFileSync(filePath, buffer);
  context.log(`Generated .docx file at ${filePath}`);
  return filePath;
};

// AI response validation
const validateAIResponse = (response, context) => {
  const data = response.response_format || response;
  if (!data) {
    context.error('AI response is empty or invalid');
    throw new Error('AI response is empty or invalid');
  }

  const requiredKeys = [
    'signal',
    'confidence',
    'timeframe',
    'summary',
    'potential_setups_forming',
    'key_levels_to_watch',
    'current_price',
    'news_analysis',
    'kill_zone_context',
  ];
  for (const key of requiredKeys) {
    if (!(key in data)) {
      context.error(`AI response missing required field: ${key}`);
      throw new Error(`AI response missing required field: ${key}`);
    }
  }
  if (!['LONG', 'SHORT', 'HOLD'].includes(data.signal)) {
    context.error(`Invalid signal value: ${data.signal}`);
    throw new Error(`Invalid signal value: ${data.signal}`);
  }
  if (!['Low', 'Medium', 'High'].includes(data.confidence)) {
    context.error(`Invalid confidence value: ${data.confidence}`);
    throw new Error(`Invalid confidence value: ${data.confidence}`);
  }
  if (!['15m', '1h', '4h', 'daily'].includes(data.timeframe)) {
    context.error(`Invalid timeframe value: ${data.timeframe}`);
    throw new Error(`Invalid timeframe value: ${data.timeframe}`);
  }
  if (typeof data.summary !== 'string') {
    context.error(`summary must be a string`);
    throw new Error(`summary must be a string`);
  }
  if (typeof data.potential_setups_forming !== 'string') {
    context.error(`potential_setups_forming must be a string`);
    throw new Error(`potential_setups_forming must be a string`);
  }
  if (!Array.isArray(data.key_levels_to_watch)) {
    context.error(`key_levels_to_watch must be an array`);
    throw new Error(`key_levels_to_watch must be an array`);
  }
  for (const level of data.key_levels_to_watch) {
    if (typeof level !== 'number') {
      context.error(`key_levels_to_watch contains non-number: ${level}`);
      throw new Error(`key_levels_to_watch contains non-number: ${level}`);
    }
  }
  if (typeof data.current_price !== 'number') {
    context.error(`current_price must be a number`);
    throw new Error(`current_price must be a number`);
  }
  if (
    typeof data.news_analysis !== 'object' ||
    !Array.isArray(data.news_analysis.recent_news) ||
    !Array.isArray(data.news_analysis.upcoming_news)
  ) {
    context.error(
      `news_analysis must be an object with recent_news and upcoming_news arrays`
    );
    throw new Error(
      `news_analysis must be an object with recent_news and upcoming_news arrays`
    );
  }
  for (const news of [
    ...data.news_analysis.recent_news,
    ...data.news_analysis.upcoming_news,
  ]) {
    if (
      typeof news !== 'object' ||
      typeof news.event !== 'string' ||
      typeof news.datetime_utc !== 'string' ||
      (news.impact && typeof news.impact !== 'string') ||
      (news.alert && typeof news.alert !== 'string')
    ) {
      context.error(`Invalid news_analysis item: ${JSON.stringify(news)}`);
      throw new Error(`Invalid news_analysis item: ${JSON.stringify(news)}`);
    }
  }
  if (
    typeof data.kill_zone_context !== 'object' ||
    typeof data.kill_zone_context.current_kill_zone !== 'string' ||
    typeof data.kill_zone_context.upcoming_kill_zone !== 'string' ||
    typeof data.kill_zone_context.relevance !== 'string'
  ) {
    context.error(
      `kill_zone_context must be an object with current_kill_zone, upcoming_kill_zone, and relevance strings`
    );
    throw new Error(
      `kill_zone_context must be an object with current_kill_zone, upcoming_kill_zone, and relevance strings`
    );
  }
  return true;
};

// Fetch candle data
async function fetchCandleData(timeframe, limit, context) {
  try {
    let url;
    const CRYPTOCOMPARE_API_KEY = process.env.CRYPTOCOMPARE_API_KEY;
    if (timeframe === 'daily') {
      url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${limit}&api_key=${CRYPTOCOMPARE_API_KEY}`;
    } else if (timeframe === '1h') {
      url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${limit}&api_key=${CRYPTOCOMPARE_API_KEY}`;
    } else if (timeframe === '4h') {
      url = `https://min-api.cryptocompare.com/data/v2/histohour?fsym=BTC&tsym=USD&limit=${limit}&aggregate=4&api_key=${CRYPTOCOMPARE_API_KEY}`;
    } else if (timeframe === '15m') {
      url = `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=${limit}&aggregate=15&api_key=${CRYPTOCOMPARE_API_KEY}`;
    } else {
      context.error(`Unsupported timeframe requested: ${timeframe}`);
      throw new Error(`Unsupported timeframe: ${timeframe}`);
    }

    context.log(`Fetching URL: ${url}`);
    context.log(`Fetching ${limit + 1} ${timeframe} candles...`);

    const response = await fetch(url);
    context.log(
      `Response status for ${timeframe}: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      context.error(
        `HTTP error for ${timeframe}: ${response.status} ${response.statusText} - Details: ${errorText}`
      );
      throw new Error(
        `HTTP error for ${timeframe} timeframe: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    context.log(`Successfully fetched data for ${timeframe} timeframe`);

    if (data.Response === 'Error') {
      context.error(`API error for ${timeframe}: ${data.Message}`);
      throw new Error(`API error for ${timeframe} timeframe: ${data.Message}`);
    }

    const candles = data.Data.Data.slice(0, limit + 1).map((item) => ({
      timestamp: item.time * 1000,
      high: item.high,
      low: item.low,
      open: item.open,
      close: item.close,
      volumefrom: item.volumefrom,
      volumeto: item.volumeto,
    }));

    context.log(`Processed ${candles.length} candles for ${timeframe}`);
    return candles;
  } catch (error) {
    context.error(`Error fetching ${timeframe} candles: ${error.message}`);
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
        timestamp: formatTimestampToDate(swingHigh.timestamp),
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
        timestamp: formatTimestampToDate(swingLow.timestamp),
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
            timestamp: formatTimestampToDate(swingHighBetween.timestamp),
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
            timestamp: formatTimestampToDate(swingLowBetween.timestamp),
            price: swingLowBetween.price,
          });
        }
      }
    }
  }

  for (let i = 0; i < priceData.length - 2; i++) {
    const candle1 = priceData[i];
    const candle3 = priceData[i + 2];

    // Bullish FVG: candle1.high < candle3.low
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
        bullishFVGs.push({
          timestamp: formatTimestampToDate(priceData[i + 1].timestamp),
          high: gapHigh,
          low: gapLow,
          isActive: isActive === 'active',
        });
      }
    }

    // Bearish FVG: candle1.low > candle3.high
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
        bearishFVGs.push({
          timestamp: formatTimestampToDate(priceData[i + 1].timestamp),
          high: gapHigh,
          low: gapLow,
          isActive: isActive === 'active',
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
            timestamp: formatTimestampToDate(candle.timestamp),
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
            timestamp: formatTimestampToDate(candle.timestamp),
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
          timestamp: formatTimestampToDate(candle.timestamp),
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
          timestamp: formatTimestampToDate(candle.timestamp),
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
            timestamp: formatTimestampToDate(swingLow.timestamp),
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
            timestamp: formatTimestampToDate(swingHigh.timestamp),
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
            timestamp: formatTimestampToDate(candle.timestamp),
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
            timestamp: formatTimestampToDate(candle.timestamp),
            price: meanThreshold,
            isActive,
          });
        }
      }
    }
  }

  // Filter active indicators
  return {
    swingHighs: untappedHighs.filter((item) => item.isActive !== false),
    swingLows: untappedLows.filter((item) => item.isActive !== false),
    bullishBreakers: bullishBreakers.filter((item) => item.isActive !== false),
    bearishBreakers: bearishBreakers.filter((item) => item.isActive !== false),
    bullishFVGs: bullishFVGs.filter((item) => item.isActive),
    bearishFVGs: bearishFVGs.filter((item) => item.isActive),
    bullishOrderBlocks: bullishOrderBlocks.filter(
      (item) => item.isActive !== false
    ),
    bearishOrderBlocks: bearishOrderBlocks.filter(
      (item) => item.isActive !== false
    ),
    bullishPropulsionBlocks: bullishPropulsionBlocks.filter(
      (item) => item.isActive !== false
    ),
    bearishPropulsionBlocks: bearishPropulsionBlocks.filter(
      (item) => item.isActive !== false
    ),
    bullishRejectionBlocks: bullishRejectionBlocks.filter(
      (item) => item.isActive !== false
    ),
    bearishRejectionBlocks: bearishRejectionBlocks.filter(
      (item) => item.isActive !== false
    ),
    bullishMitigationBlocks: bullishMitigationBlocks.filter(
      (item) => item.isActive !== false
    ),
    bearishMitigationBlocks: bearishMitigationBlocks.filter(
      (item) => item.isActive !== false
    ),
  };
}

// Log indicators
function logResults(timeframe, candles, indicators, context) {
  context.log(`\n--- ${timeframe.toUpperCase()} ICT Indicators ---`);
  context.log(`Swing Highs: ${JSON.stringify(indicators.swingHighs, null, 2)}`);
  context.log(`Swing Lows: ${JSON.stringify(indicators.swingLows, null, 2)}`);
  context.log(
    `Bullish Breakers: ${JSON.stringify(indicators.bullishBreakers, null, 2)}`
  );
  context.log(
    `Bearish Breakers: ${JSON.stringify(indicators.bearishBreakers, null, 2)}`
  );
  context.log(
    `Bullish FVGs: ${JSON.stringify(indicators.bullishFVGs, null, 2)}`
  );
  context.log(
    `Bearish FVGs: ${JSON.stringify(indicators.bearishFVGs, null, 2)}`
  );
  context.log(
    `Bullish Order Blocks: ${JSON.stringify(indicators.bullishOrderBlocks, null, 2)}`
  );
  context.log(
    `Bearish Order Blocks: ${JSON.stringify(indicators.bearishOrderBlocks, null, 2)}`
  );
  context.log(
    `Bullish Propulsion Blocks: ${JSON.stringify(indicators.bullishPropulsionBlocks, null, 2)}`
  );
  context.log(
    `Bearish Propulsion Blocks: ${JSON.stringify(indicators.bearishPropulsionBlocks, null, 2)}`
  );
  context.log(
    `Bullish Rejection Blocks: ${JSON.stringify(indicators.bullishRejectionBlocks, null, 2)}`
  );
  context.log(
    `Bearish Rejection Blocks: ${JSON.stringify(indicators.bearishRejectionBlocks, null, 2)}`
  );
  context.log(
    `Bullish Mitigation Blocks: ${JSON.stringify(indicators.bullishMitigationBlocks, null, 2)}`
  );
  context.log(
    `Bearish Mitigation Blocks: ${JSON.stringify(indicators.bearishMitigationBlocks, null, 2)}`
  );
  context.log(`Latest Price: ${candles[candles.length - 1].close}`);
}

// Format data for AI prompt
function formatDataForPrompt(results) {
  const formattedResults = {};
  for (const timeframe of Object.keys(results)) {
    formattedResults[timeframe] = {
      indicators: results[timeframe].indicators,
      latestPrice: results[timeframe].latestPrice,
      candles: results[timeframe].candles.map((candle) => ({
        timestamp: formatTimestampToDate(candle.timestamp),
        high: candle.high,
        low: candle.low,
        open: candle.open,
        close: candle.close,
        volumefrom: candle.volumefrom,
        volumeto: candle.volumeto,
      })),
    };
  }
  return formattedResults;
}

// Send to Telegram with retries, Markdown, and .docx attachment
async function sendToTelegram(analysis, prompt, context) {
  const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const telegramDocumentUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendDocument`;
  const maxMessageLength = 4096;

  const formatMessage = (data) => {
    let message = `*BTC/USD ICT Analysis*\n\n`;
    message += `📊 *Signal:* ${escapeMarkdownV2(data.signal || 'N/A')}\n`;
    message += `🔥 *Confidence:* ${escapeMarkdownV2(data.confidence || 'N/A')}\n`;
    message += `⏰ *Timeframe:* ${escapeMarkdownV2(data.timeframe || 'N/A')}\n`;
    message += `💰 *Current Price:* ${escapeMarkdownV2(
      data.current_price ? data.current_price.toFixed(2) : 'N/A'
    )}\n`;
    message += `✍️ *Summary:* ${escapeMarkdownV2(data.summary || 'No summary provided')}\n`;
    message += `🔄 *Potential Setups Forming:* ${escapeMarkdownV2(
      data.potential_setups_forming || 'None'
    )}\n`;
    message += `🎯 *Key Levels to Watch:* ${escapeMarkdownV2(
      data.key_levels_to_watch?.join(', ') || 'None'
    )}\n`;
    message += `📰 *News Analysis:*\n`;
    if (data.news_analysis?.recent_news?.length > 0) {
      message += `  *Recent News:*\n`;
      data.news_analysis.recent_news.forEach((news) => {
        message += `    \\- ${escapeMarkdownV2(news.event)} \\(${escapeMarkdownV2(
          news.datetime_utc
        )}\\): ${escapeMarkdownV2(news.impact || 'N/A')}\n`;
      });
    } else {
      message += `  *Recent News:* None\n`;
    }
    if (data.news_analysis?.upcoming_news?.length > 0) {
      message += `  *Upcoming News:*\n`;
      data.news_analysis.upcoming_news.forEach((news) => {
        message += `    \\- ${escapeMarkdownV2(news.event)} \\(${escapeMarkdownV2(
          news.datetime_utc
        )}\\): ${escapeMarkdownV2(news.alert || 'N/A')}\n`;
      });
    } else {
      message += `  *Upcoming News:* None\n`;
    }
    message += `⏰ *Kill Zone Context:*\n`;
    message += `  *Current:* ${escapeMarkdownV2(
      data.kill_zone_context?.current_kill_zone || 'None'
    )}\n`;
    message += `  *Upcoming:* ${escapeMarkdownV2(
      data.kill_zone_context?.upcoming_kill_zone || 'None'
    )}\n`;
    message += `  *Relevance:* ${escapeMarkdownV2(
      data.kill_zone_context?.relevance || 'N/A'
    )}\n`;
    return message;
  };

  const message = formatMessage(analysis);
  context.log(`Telegram message length: ${message.length} characters`);
  context.log(`Formatted message preview: ${message.slice(0, 200)}...`);

  const messages = [];
  if (message.length > maxMessageLength) {
    let currentMessage = '';
    const lines = message.split('\n');
    for (const line of lines) {
      if (currentMessage.length + line.length + 1 > maxMessageLength) {
        messages.push(currentMessage);
        currentMessage = line + '\n';
      } else {
        currentMessage += line + '\n';
      }
    }
    if (currentMessage) messages.push(currentMessage);
  } else {
    messages.push(message);
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    context.log(
      `Sending message part ${i + 1}/${messages.length} (${msg.length} characters)`
    );
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        context.log(
          `Attempt ${attempt} to send message part ${i + 1} to Telegram...`
        );
        const response = await axios.post(
          telegramUrl,
          {
            chat_id: process.env.TELEGRAM_CHANNEL_ID,
            text: msg,
            parse_mode: 'MarkdownV2',
            disable_web_page_preview: true,
          },
          { timeout: 10000 }
        );

        if (response.data.ok) {
          context.log(`Message part ${i + 1} sent to Telegram successfully`);
          break;
        } else {
          throw new Error(`Telegram error: ${response.data.description}`);
        }
      } catch (err) {
        context.error(
          `Attempt ${attempt} for message part ${i + 1} failed: ${err.message}`
        );
        context.error(
          `Full error: ${JSON.stringify(err.response?.data || err, null, 2)}`
        );

        if (attempt === 1 && err.message.includes("can't parse entities")) {
          try {
            context.log(`Retrying message part ${i + 1} with plain text...`);
            const plainText = msg
              .replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '')
              .replace(/\\/g, '');
            const response = await axios.post(
              telegramUrl,
              {
                chat_id: process.env.TELEGRAM_CHANNEL_ID,
                text: plainText,
                disable_web_page_preview: true,
              },
              { timeout: 10000 }
            );
            if (response.data.ok) {
              context.log(`Plain text message part ${i + 1} sent to Telegram`);
              break;
            } else {
              throw new Error(
                `Plain text Telegram error: ${response.data.description}`
              );
            }
          } catch (simpleErr) {
            context.error(
              `Plain text send for part ${i + 1} failed: ${simpleErr.message}`
            );
            context.error(
              `Full error: ${JSON.stringify(simpleErr.response?.data || simpleErr, null, 2)}`
            );
          }
        }
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        } else {
          throw new Error(
            `Failed to send message part ${i + 1} to Telegram after 3 attempts`
          );
        }
      }
    }
  }

  let filePath;
  try {
    filePath = await generateDocx(prompt, context);
    context.log(`Generated .docx file at: ${filePath}`);
    const formData = new FormData();
    formData.append('chat_id', process.env.TELEGRAM_CHANNEL_ID);
    formData.append('document', fs.createReadStream(filePath));
    formData.append(
      'caption',
      escapeMarkdownV2('AI Prompt for BTC/USD ICT Analysis')
    );

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        context.log(`Attempt ${attempt} to send .docx to Telegram...`);
        const response = await axios.post(telegramDocumentUrl, formData, {
          headers: formData.getHeaders(),
          timeout: 15000,
        });

        if (response.data.ok) {
          context.log('.docx file sent to Telegram successfully');
          break;
        } else {
          throw new Error(
            `Telegram document error: ${response.data.description}`
          );
        }
      } catch (err) {
        context.error(
          `Attempt ${attempt} to send .docx failed: ${err.message}`
        );
        context.error(
          `Full error: ${JSON.stringify(err.response?.data || err, null, 2)}`
        );
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        } else {
          throw new Error('Failed to send .docx to Telegram after 3 attempts');
        }
      }
    }
  } catch (err) {
    context.error(`Failed to send .docx to Telegram: ${err.message}`);
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        context.log(`Cleaned up temporary file: ${filePath}`);
      } catch (cleanupErr) {
        context.error(
          `Failed to clean up temporary file: ${cleanupErr.message}`
        );
      }
    }
  }
}

export default async function (req, res) {
  const context = {
    log: (msg) => console.log(msg),
    error: (msg) => console.error(msg),
  };

  const CRYPTOCOMPARE_API_KEY =
    process.env.CRYPTOCOMPARE_API_KEY || 'YOUR_API_KEY';
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
  const limit = 99; // Fetch 99 + 1 = 100 candles

  // Current time in UTC
  const currentDate = new Date();
  const currentTimeUTC = currentDate.toISOString();
  const humanReadableTime = currentDate.toUTCString();

  // Validate environment variables
  if (!CRYPTOCOMPARE_API_KEY || CRYPTOCOMPARE_API_KEY === 'YOUR_API_KEY') {
    context.error('CRYPTOCOMPARE_API_KEY is not set or invalid');
    return res.json({
      success: false,
      error: 'CRYPTOCOMPARE_API_KEY is not set or invalid',
    });
  }
  if (!GEMINI_API_KEY) {
    context.error('GEMINI_API_KEY is not set');
    return res.json({ success: false, error: 'GEMINI_API_KEY is not set' });
  }
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
    context.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not set');
    return res.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not set',
    });
  }

  try {
    // Fetch candles and calculate indicators
    const timeframes = ['daily', '4h', '1h', '15m'];
    const results = {};
    for (const timeframe of timeframes) {
      const candles = await fetchCandleData(timeframe, limit, context);
      const indicators =
        findSwingPointsBreakersFVGsOrderPropulsionRejectionAndMitigation(
          candles
        );
      results[timeframe] = {
        candles,
        indicators,
        latestPrice: candles[candles.length - 1].close,
      };
      logResults(timeframe, candles, indicators, context);
    }

    // Format data for Gemini
    const formattedResults = formatDataForPrompt(results);
    const prompt = `
Instructions: ${instructions}
Manual: ${manual}
Current Time (UTC): ${currentTimeUTC}
Human-Readable Current Time: ${humanReadableTime}
Timeframe Data: ${JSON.stringify(formattedResults, null, 2)}
Command: Return a JSON object with the fields signal, confidence, timeframe, summary, potential_setups_forming, key_levels_to_watch, current_price, news_analysis, and kill_zone_context directly at the root level, with no additional nesting (e.g., no response_format wrapper), no backticks, and no extra text, as the response will be processed by another machine. Ensure the response is a valid JSON object matching the specified structure. Use the provided Current Time (UTC) to align timestamps and ensure price levels are consistent with the Timeframe Data. The news_analysis object must include recent_news and upcoming_news arrays. If no relevant news events are available, set each to an empty array and include a note in the array (e.g., {"event": "None", "datetime_utc": "${currentTimeUTC}", "impact": "N/A"} for recent_news, or {"event": "None", "datetime_utc": "${currentTimeUTC}", "alert": "N/A"} for upcoming_news). Timestamps in the response must be in ISO format (YYYY-MM-DD HH:MM UTC) and reflect recent data relative to the current date.
`;

    // Gemini API call
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: [{ googleSearch: {} }],
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
        context.log(`Attempt ${attempts + 1} to call Gemini...`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        context.log(`Gemini raw response: ${responseText}`);
        let jsonString = responseText;
        const jsonMatch = responseText.match(/{[\s\S]*}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
        try {
          const parsedResponse = JSON.parse(jsonString);
          analysis = parsedResponse.response_format || parsedResponse;
          if (!analysis.signal) {
            context.error('Response does not contain required fields');
            throw new Error('Response does not contain required fields');
          }
          context.log(
            `Gemini parsed response: ${JSON.stringify(analysis, null, 2)}`
          );
          validateAIResponse(analysis, context);
          break;
        } catch (parseErr) {
          context.error(`Failed to parse JSON: ${parseErr.message}`);
          throw new Error('Invalid JSON format in Gemini response');
        }
      } catch (err) {
        attempts++;
        context.error(`Gemini attempt ${attempts} failed: ${err.message}`);
        if (attempts === maxAttempts) {
          throw new Error(
            'Failed to get valid Gemini response after 3 attempts'
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
      }
    }

    // Send to Telegram
    await sendToTelegram(analysis, prompt, context);

    res.json({
      success: true,
      data: results,
      analysis,
    });
  } catch (error) {
    context.error(`Error in main execution: ${error.message}`);
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
      context.log('Error notification sent to Telegram');
    } catch (telegramErr) {
      context.error(`Failed to send error to Telegram: ${telegramErr.message}`);
    }
    res.json({
      success: false,
      error: error.message,
    });
  }
}
