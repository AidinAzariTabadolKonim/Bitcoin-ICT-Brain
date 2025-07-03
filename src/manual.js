export const manual = `
# Comprehensive ICT Trading Framework for AI Agent Trader

## Introduction
The Inner Circle Trader (ICT) methodology, developed by a single trader, provides a systematic, rule-based approach to trading financial markets by aligning with institutional order flow, also referred to as "smart money." The core premise is that markets are not random but are engineered by an Interbank Price Delivery Algorithm (IPDA) that systematically seeks liquidity pools (stop orders and limit orders) to facilitate large institutional campaigns. This document synthesizes the ICT teachings into a structured, algorithmic framework of approximately 4,000 to 5,000 words. It is designed to enable an AI agent trader to consume the information, analyze historical and current price data, generate high-probability trade signals, anticipate setups, and identify ICT concepts in price action. The framework covers the core philosophy, glossary of terms, macro and micro frameworks, price delivery (PD) arrays, trading setups, execution protocols, risk management, and AI implementation guidelines, ensuring the AI can operate as an ICT trader with precision and discipline.

## Core Philosophy: The Market Paradigm
The ICT methodology rests on the belief that market price movements are deliberately engineered by the IPDA to target liquidity pools, such as stop-loss orders above old highs (buy-side liquidity, BSL) or below old lows (sell-side liquidity, SSL). This creates a dynamic interplay between states of equilibrium (fair value) and imbalance (liquidity raids), with price moving efficiently to neutralize these pools before rebalancing.
- **Market Efficiency Paradigm**: Price oscillates between equilibrium (the midpoint of a defined range) and imbalance, where liquidity resides. The IPDA targets stop orders at key levels (old highs and lows) to trigger retail trader stops, then reverses to reprice efficiently, often filling inefficiencies like Fair Value Gaps (FVGs).
- **Smart Money vs. Retail**: Institutional players ("smart money") engineer price movements to exploit retail traders, who act as liquidity providers. Smart money buys into sell-side liquidity (panic selling below lows) and sells into buy-side liquidity (FOMO buying above highs).
- **Objective for AI**: The AI must identify liquidity pools, recognize institutional intent through price action, and align trades with smart money direction to achieve high-probability outcomes.

## Glossary of Core Concepts & Terminology
The following terms are critical for the AI to understand and apply in analyzing price data and generating signals:
- **Interbank Price Delivery Algorithm (IPDA)**: The theoretical engine driving price delivery, analyzed through look-back periods (20, 40, 60 trading days) to identify liquidity targets and PD arrays. **Algorithmic Logic**: Model effects through price action patterns like PD arrays and liquidity runs.
- **Liquidity**: Pools of resting orders (stop-loss and limit orders) at key price levels, serving as the market’s "fuel." **Algorithmic Logic**: High-volume nodes where stop orders cluster, typically above old highs (BSL) or below old lows (SSL).
- **Buy-Side Liquidity (BSL)**: Buy-stop orders above a previous high or equal highs. **Algorithmic Logic**: Price Level > High(t-n), where High(t-n) is a significant past high.
- **Sell-Side Liquidity (SSL)**: Sell-stop orders below a previous low or equal lows. **Algorithmic Logic**: Price Level < Low(t-n), where Low(t-n) is a significant past low.
- **Liquidity Raid / Stop Run**: A deliberate price move beyond BSL or SSL to trigger stops, followed by a reversal. **Algorithmic Logic**: High(t) > High(t-n) or Low(t) < Low(t-n) with quick reversal.
- **Market Structure Shift (MSS)**: A confirmed change in order flow direction. **Algorithmic Logic**:
  - Bullish MSS: Price breaks above a prior lower-high after a new low.
  - Bearish MSS: Price breaks below a prior higher-low after a new high.
- **Premium/Discount Array (PD Array)**: Institutional reference points (e.g., Order Blocks, FVGs) where price reacts. **Algorithmic Logic**: Identify zones based on specific price action patterns.
- **Premium vs. Discount**:
  - Premium: Upper half of a trading range, where smart money sells.
  - Discount: Lower half, where smart money buys.
  - **Algorithmic Logic**: Calculate equilibrium (50% of range from swing high to low) to classify price position.
- **Order Block (OB)**: A zone of institutional accumulation (bullish) or distribution (bearish).
  - Bullish OB: Last down-close candle before a strong upward move (Bullish MSS). **Logic**: Buy on retracement to open or 50% mean threshold; stop below OB low; invalidated if price closes below 50% threshold.
  - Bearish OB: Last up-close candle before a strong downward move (Bearish MSS). **Logic**: Sell on retracement to open or 50% mean threshold; stop above OB high; invalidated if price closes above 50% threshold.
- **Fair Value Gap (FVG) / Liquidity Void**: A three-candle pattern creating an imbalance. **Logic**:
  - Bullish FVG: Gap between candle 1 high and candle 3 low, with impulsive candle 2. Entry on retracement to FVG; stop below candle 1 or 2 low.
  - Bearish FVG: Gap between candle 1 low and candle 3 high. Entry on retracement; stop above candle 1 or 2 high. High probability (~90%) of partial fill.
- **Breaker Block (BB)**: A reversal pattern post-liquidity raid.
  - Bullish BB: Swing high between an initial low and lower low, broken after MSS. Buy on retracement to broken swing high; stop below raid low.
  - Bearish BB: Swing low between an initial high and higher high, broken after MSS. Sell on retracement to broken swing low; stop above raid high.
- **Mitigation Block (MB)**: Represents trapped traders post-failed trend continuation.
  - Bullish MB: Last up-close candle in a failed decline post-Bullish MSS. Buy on retest; stop below low.
  - Bearish MB: Last down-close candle in a failed rally post-Bearish MSS. Sell on retest; stop above high.
- **Rejection Block**: Candle with long wick and small body at a key level. **Logic**: Enter at body’s open/close; stop beyond wick’s extreme.
- **Propulsion Block**: Candle rejected at an OB, confirming its validity. **Logic**: Enter on retest; tighter stop beyond block’s extreme.
- **Reclaimed Order Block**: Violated OB later respected post-MSS. **Logic**: Trade as standard OB after trend confirmation.

## Macro Framework: Time & Price (IPDA Data Ranges)
The AI must analyze markets within a macro context governed by time-based IPDA data ranges and quarterly shifts to establish directional bias and liquidity targets.

### Quarterly Shifts
- **Definition**: Markets exhibit directional shifts every 3-4 months, setting the highest-level bias.
- **Identification**: Confirm via a clear MSS on the Daily chart after a prolonged trend.
- **AI Logic**: Scan Daily chart for MSS to set quarterly bias (bullish/bearish).

### IPDA Look-Back Periods
- **Near-Term (20 Days)**: Targets immediate liquidity for intraday/short-term trades.
- **Short-Term (40 Days)**: Defines swing trade objectives.
- **Intermediate-Term (60 Days)**: Identifies major institutional liquidity zones and confirms quarterly bias.
- **AI Logic**:
  - Anchor analysis on the first trading day of a recent month.
  - Scan 20, 40, 60-day periods for highest highs (BSL) and lowest lows (SSL).
  - Project forward to anticipate turning points.
  - Determine bias:
    - Bullish: Price raids SSL and rallies, respecting BSL.
    - Bearish: Price raids BSL and sells off, respecting SSL.

## PD Array Matrix: Institutional Reference Points
PD arrays are critical price action patterns used by the IPDA as reference points for entries and exits. The AI must identify and prioritize these arrays hierarchically.

### Order Block (OB)
- **Bullish OB**: Last down-close candle before a strong upward MSS. Buy on retracement to open/50% threshold; stop below low.
- **Bearish OB**: Last up-close candle before a strong downward MSS. Sell on retracement to open/50% threshold; stop above high.
- **AI Logic**: Scan for MSS, identify final bearish/bullish candle, set entry/stop levels.

### Fair Value Gap (FVG)
- **Identification**: Three-candle pattern with impulsive middle candle creating a gap.
- **Trading Rules**: Enter in direction of impulse on retracement to FVG; stop beyond originating candle. Target partial/complete fill.
- **AI Logic**: Detect FVG patterns, prioritize those aligned with HTF bias, set entry/stop/target.

### Breaker Block (BB)
- **Bullish BB**: Swing high broken post-lower low and MSS. Buy on retracement; stop below raid low.
- **Bearish BB**: Swing low broken post-higher high and MSS. Sell on retracement; stop above raid high.
- **AI Logic**: Identify liquidity raids and MSS, set entry at broken swing levels.

### Mitigation Block (MB)
- **Bullish MB**: Last up-close candle in failed decline. Buy on retest; stop below low.
- **Bearish MB**: Last down-close candle in failed rally. Sell on retest; stop above high.
- **AI Logic**: Detect failed trend attempts post-MSS, set entry/stop at MB levels.

### Other PD Arrays
- **Rejection Block**: Enter at candle body; stop beyond wick.
- **Propulsion Block**: Enter on retest of block within OB; tighter stop.
- **Reclaimed OB**: Trade as standard OB post-MSS confirmation.
- **AI Logic**: Incorporate secondary arrays for refined entries, validate with MSS and HTF bias.

## Core Trading Setups
This section outlines the core trading setups of the Inner Circle Trader (ICT) methodology, designed to enable an AI agent trader to generate high-probability trade signals, anticipate setups, and identify ICT concepts in price data. The setups include foundational patterns from the ICT Core Trading Model (Breaker Swing Point and Failure Swing) and specific Price Action Models (1, 2, 5, 6, and 9) from the ICT Price Action framework. Each setup is detailed with algorithmic rules, precise entry/exit criteria, and risk management protocols to ensure the AI can execute trades systematically and align with institutional order flow.

### 1. Breaker Swing Point (Stop Run / Turtle Soup)
**Overview**: The Breaker Swing Point, also known as Turtle Soup, is a high-probability setup that capitalizes on liquidity raids engineered by the Interbank Price Delivery Algorithm (IPDA). It involves a deliberate price move to trigger stop orders (buy-side liquidity above highs or sell-side liquidity below lows), followed by a reversal, confirmed by a Market Structure Shift (MSS). This setup is dynamic and can be applied across intraday and short-term timeframes.

**Bullish Scenario**:
- **Context**: Price is in a discount area (below the 50% equilibrium of a defined range) or near a higher-timeframe (HTF) support, such as a Daily Order Block (OB).
- **Liquidity Raid**: Price drives below a recent swing low (Sell-Side Liquidity, SSL), triggering sell-stop orders. This move traps retail traders shorting the breakout.
- **Confirmation**: Price reverses aggressively, breaking above a recent swing high, forming a Bullish MSS, indicating institutional buying intent.
- **Entry**:
  - Optimal Entry: Buy during the SSL raid, anticipating the reversal (high-risk, requires precise timing).
  - Confirmation Entry: Buy on retracement to a Price Delivery (PD) Array (e.g., Bullish Breaker, Fair Value Gap (FVG), or OB) formed post-MSS.
- **Stop Loss**: Place below the low of the SSL raid or PD array (e.g., 10-30 pips below OB low, 30-40 pips for stop run).
- **Take Profit**: Target the next Buy-Side Liquidity (BSL) pool, such as a previous daily high within the 20-day IPDA range, or intermediate PD arrays (20-50 pips).
- **AI Logic**:
  - Confirm price is in a discount area (below 50% of 20/40/60-day range).
  - Detect SSL raid on 1H/15M chart during Kill Zones (London: 5:00 AM - 9:00 AM UTC; NY: 11:00 AM - 2:00 PM UTC).
  - Validate Bullish MSS (break above prior swing high).
  - Set buy limit order at PD array (e.g., Breaker at broken swing high, FVG, or OB open/50% threshold).
  - Place stop loss below PD array low; target BSL or 2-3x risk.

**Bearish Scenario**:
- **Context**: Price is in a premium area (above 50% equilibrium) or near HTF resistance (e.g., Daily Bearish OB).
- **Liquidity Raid**: Price pushes above a recent swing high (BSL), triggering buy-stop orders.
- **Confirmation**: Price reverses downward, breaking a recent swing low, forming a Bearish MSS.
- **Entry**:
  - Optimal: Sell during BSL raid (high-risk).
  - Confirmation: Sell on retracement to PD array (Bearish Breaker, FVG, OB).
- **Stop Loss**: Above PD array high or BSL raid high (10-30 pips for OB, 30-40 pips for stop run).
- **Take Profit**: Target SSL pool (e.g., previous daily low) or intermediate PD arrays.
- **AI Logic**: Mirror bullish logic, detecting BSL raid, Bearish MSS, and selling at premium PD arrays.

**Example**:
- S&P E-Mini Futures (15M Chart): Price in discount, raids SSL at 4000, reverses, breaks prior high at 4020 (Bullish MSS). AI sets buy limit at Bullish OB (4010), stop at 4005, targets BSL at 4030 (previous daily high). Partial profit at 20 pips, full exit at 4030.

### 2. Failure Swing
**Overview**: The Failure Swing setup occurs when price fails to raid liquidity and reverses prematurely, indicating a lack of momentum to continue the prior trend. It is less aggressive than the Breaker Swing but offers high-probability entries post-MSS.

**Bullish Scenario**:
- **Context**: Price in a discount area, forms a swing low.
- **Failure**: Attempts to break below the low but forms a higher low, signaling weak selling pressure.
- **Confirmation**: Price rallies, breaking the intervening swing high, forming a Bullish MSS.
- **Entry**: Buy on retracement to a PD array (e.g., Mitigation Block (MB), broken swing high).
- **Stop Loss**: Below the higher low or PD array low (10-20 pips).
- **Take Profit**: Target BSL pool or intermediate PD array (20-50 pips).
- **AI Logic**:
  - Identify discount area and initial swing low on 1H/15M chart.
  - Detect failure to break low (higher low formation).
  - Confirm Bullish MSS (break above swing high).
  - Set buy limit at MB or broken swing high; stop below higher low.
  - Target BSL or 2-3x risk.

**Bearish Scenario**:
- **Context**: Price in a premium area, forms a swing high.
- **Failure**: Fails to break above the high, forming a lower high.
- **Confirmation**: Price breaks below intervening swing low (Bearish MSS).
- **Entry**: Sell on retracement to PD array (MB, broken swing low).
- **Stop Loss**: Above lower high or PD array high (10-20 pips).
- **Take Profit**: Target SSL pool or intermediate PD array.
- **AI Logic**: Mirror bullish logic for premium area, lower high, and Bearish MSS.

**Example**:
- EUR/USD (1H Chart): Price in premium, forms high at 1.1000, fails to break higher, forms lower high at 1.0980. Breaks low at 1.0950 (Bearish MSS). AI sets sell limit at MB (1.0970), stop at 1.0985, targets SSL at 1.0920. Partial profit at 20 pips, full exit at target.

### 3. Price Action Model 1: Intraday Scalping (15-20 Pips)
**Overview**: Model 1 is a scalping strategy targeting 15-20 pips per trade during the New York Kill Zone (11:00 AM - 2:00 PM UTC). It uses the Optimal Trade Entry (OTE) pattern to trade toward liquidity pools (BSL/SSL) within a 20-day IPDA range.

**Core Concepts**:
- **IPDA Range**: Last 20 trading days (excluding Sundays) define the dealing range (highest high, lowest low). Extend to 40/60 days in consolidation.
- **Premium/Discount**: Equilibrium at 50% of the range; premium above, discount below.
- **Liquidity**: Targets BSL (above daily highs) for bullish trades, SSL (below daily lows) for bearish trades.

**Bullish Setup**:
- **Context**: Price in discount, targeting BSL within 20-day range.
- **Pattern**:
  - Manipulation: Price raids SSL, triggering sell stops.
  - MSS: Price breaks above a short-term high (Bullish MSS).
  - OTE: Retracement to breaker (last down-close candles in MSS range).
- **Execution**:
  - Timeframe: 5-minute chart, NY Kill Zone (11:00 AM - 2:00 PM UTC).
  - Entry: Buy limit at 62% Fibonacci retracement of MSS move + 5 pips.
  - Stop Loss: 5 pips below lowest low in NY Kill Zone.
  - Take Profit:
    - TP1: At MSS high/low used for Fibonacci.
    - TP2: Fibonacci Extension Target 2 or previous daily high.
    - TP3: Symmetrical 1:1 move of OTE range.
  - No re-entry if stopped out.
- **AI Logic**:
  - Confirm discount area (below 50% of 20-day range).
  - Detect SSL raid and Bullish MSS on 5M chart.
  - Set buy limit at 62% Fibonacci + 5 pips; stop 5 pips below session low.
  - Take partials at TP1 (MSS high), TP2 (daily high), TP3 (1:1 move).
  - Move stop to lock 5-10 pips after TP1.

**Bearish Setup**:
- **Context**: Price in premium, targeting SSL.
- **Pattern**: BSL raid, Bearish MSS, retracement to breaker (last up-close candles).
- **Execution**: Sell limit at 62% Fibonacci - 5 pips; stop 5 pips above session high; same TP structure.
- **AI Logic**: Mirror bullish logic for premium area and SSL target.

**Example**:
- GBP/USD (5M, Tuesday): Price in discount, raids SSL at 1.2500, breaks high at 1.2520 (MSS). AI sets buy limit at 1.2510 (62% retracement + 5 pips), stop at 1.2495, targets 1.2530 (TP1), 1.2550 (TP2, daily high), 1.2570 (TP3). Partial at 20 pips, stop to 1.2515 after TP1.

**Trading Plan**:
- **Preparation**:
  - Check economic calendar for medium/high-impact news.
  - Define 20-day range (high/low); classify price as premium/discount.
  - Identify BSL/SSL target; set weekly bias.
- **Trade Planning**:
  - Trade Monday-Wednesday; Thursday only if liquidity target unmet (lower leverage); no Friday trades.
  - Await manipulation (e.g., SSL raid for bullish) during volatility (news events).
  - Frame OTE on 5M chart post-MSS.
- **Risk Management**:
  - Position Size: (Account Equity * Risk %) / Stop Loss Pips.
  - Post-Loss: Reduce risk by 50% until 50% loss recovered.
  - Post-5 Wins: Reduce risk by 50% to protect equity.

### 4. Price Action Model 2: Weekly Range Expansion (50-100 Pips)
**Overview**: Model 2 targets 50-100 pips through weekly range expansions, executed on Tuesday/Wednesday during London/NY Kill Zones. It focuses on a weekly bias and Judas Swing entries.

**Core Concepts**:
- **Weekly Bias**: Determined by 20/40/60-day IPDA range and liquidity draw (BSL for bullish, SSL for bearish).
- **Setup**: Anticipate range expansion to premium (bullish) or discount (bearish) PD arrays (e.g., FVGs, OBs).
- **Pattern**: Enter on Judas Swing (move against bias) into PD array.

**Standard Weekly Expansion**:
- **Timeframe**: 15-minute chart, Tuesday/Wednesday, London (5:00 AM - 9:00 AM UTC) or NY Kill Zones (11:00 AM - 2:00 PM UTC).
- **Entry**:
  - Bullish: Buy at/below Tuesday 4:00 AM UTC open price at discount PD array (e.g., bullish OB, FVG).
  - Bearish: Sell at/above Tuesday 4:00 AM UTC open price at premium PD array.
- **Stop Loss**: 50 pips from entry.
- **Take Profit**: 50 pips (partial), 75-100 pips (full); exit by Thursday NY open (11:00 AM UTC) or at 100 pips.
- **AI Logic**:
  - Establish weekly bias via 20-day range and liquidity draw.
  - Identify PD array on 15M chart converging with Asian Range standard deviation (<3 SD).
  - Set limit order at OTE level (aligned with PD array); stop 50 pips.
  - Take partial at 50 pips, full at 75-100 pips or Thursday NY open.

**Intra-Week Reversal**:
- **Condition**: Previous week hit major HTF PD array, suggesting reversal.
- **Entry**:
  - Bullish: Buy below 10:00 AM UTC European open post-MSS (higher low).
  - Bearish: Sell above 10:00 AM UTC European open post-MSS (lower high).
- **Confirmation (Lazy Entry)**: For bearish, sell stop 1 pip below Asian Range low after rally above high; vice versa for bullish.
- **Stop Loss**: 50 pips (standard) or 25 pips (precision OTE entry).
- **Take Profit**: Same as standard expansion.
- **AI Logic**:
  - Detect HTF PD array hit in prior week.
  - Confirm MSS on 15M chart; set stop/limit orders at 10:00 AM UTC European open.
  - Use lazy entry for confirmation (stop order post-Judas Swing).

**Example**:
- USD/JPY (15M, Wednesday): Weekly bearish bias, price above 4:00 AM UTC open (150.50). AI sells at bearish OB (150.60), stop at 151.10, targets 150.00 (50 pips), 149.50 (100 pips). Partial at 50 pips, exit at 100 pips.

**Trading Plan**:
- **Preparation**: Check economic calendar, define 20/40/60-day range, set weekly bias.
- **Opportunity**: Identify PD array and Judas Swing on Tuesday/Wednesday.
- **Execution**: Use precision (limit at OTE, 25-pip stop) or confirmation (stop order, 50-pip stop).
- **Risk Management**: Same as Model 1; reduce risk post-loss or 5 wins.

### 5. Price Action Model 5: Intraday Volatility Expansion (40-50 Pips)
**Overview**: Model 5 targets 40-50 pips through intraday volatility expansions during London/NY Kill Zones on Tuesday-Thursday, using the Power of Three (accumulation, manipulation, distribution).

**Core Concepts**:
- **Ranges**: Use Central Bank Dealers Range (CBDR, ≥15 pips), Asian Range (≥20 pips), or Flout if invalid.
- **Standard Deviations**: Project Fibonacci Expansion levels from ranges; seek confluence with prior day levels.
- **Power of Three**: Accumulation (range), manipulation (stop run), distribution (expansion to liquidity).

**Setup**:
- **Context**: Weekly/Daily bias (bullish: BSL; bearish: SSL).
- **Pattern**:
  - Bullish: Buy into discount FVGs (upper 50% of prior day range) post-manipulation (SSL raid).
  - Bearish: Sell into premium FVGs (lower 50% of prior day range) post-BSL raid.
- **Execution**:
  - Timeframe: 5-minute chart, Tuesday-Thursday, London (5:00 AM - 9:00 AM UTC)/NY Kill Zones (11:00 AM - 2:00 PM UTC).
  - Entry: Market order at FVG (bullish: buy at discount; bearish: sell at premium).
  - Filter: Bullish (buy below European open, 10:00 AM UTC); Bearish (sell above European open).
  - Calibration: Round targets (e.g., 95.53 to 95.55, add 10-pip stop run).
  - Stop Loss: 15 pips beyond setup high/low.
  - Take Profit: 40 pips (first), 50 pips (second); optional runner.
- **AI Logic**:
  - Confirm HTF bias and 20-day range.
  - Identify CBDR/Asian Range; project standard deviations.
  - Detect FVG on 5M chart; enter during Kill Zone with European open filter.
  - Set stops 15 pips beyond structure; take partials at 40/50 pips.
  - Allow re-entry if stopped out.

**Example**:
- EUR/USD (5M, Tuesday): Bullish bias, CBDR ≥15 pips. AI buys discount FVG at 1.0800 post-SSL raid, stop at 1.0785, targets 1.0840 (40 pips), 1.0850 (50 pips). Partial at 40 pips, exit at 50 pips.

**Trading Plan**:
- **Preparation**: Define 20-day range, HTF bias, FVG locations.
- **Execution**: Enter at FVGs in Kill Zones, calibrate targets with 10-pip stop runs.
- **Risk Management**: Same as Model 1; allow re-entry for day trading.

### 6. Price Action Model 6: Universal Trading Model (Buy Side Focus)
**Overview**: Model 6 is a versatile, fractal strategy targeting buy-side liquidity runs across all timeframes, focusing on Market Maker Buy and Sell Models.

**Core Concepts**:
- **Market Maker Profiles**:
  - Sell Model: Consolidation, rally to premium array, retracement to discount (buy opportunity), reversal lower.
  - Buy Model: Premium consolidation, drop to discount, reversal higher (buy opportunity).
- **Liquidity Draw**: Targets buy stops above old highs or FVGs.
- **Stages of Accumulation**: First (post-impulse/reversal) and second (deeper retracement) entries.

**Sell Model (Buy Side)**:
- **Structure**:
  - Consolidation: Range formation.
  - Impulse: Upward break to premium array (e.g., bearish OB, old high).
  - Retracement: Pullback to discount array (bullish OB, FVG).
- **Entry**: Buy limit at discount array + 5 pips (first/second retracement).
- **Stop Loss**: 20 pips below swing/consolidation low.
- **Take Profit**: Premium array (60 pips or more); partials at 20/40 pips.
- **AI Logic**:
  - Identify consolidation and impulse on chosen timeframe (e.g., 1H, Daily).
  - Detect retracement to discount array; confirm bullish structure (higher low).
  - Set buy limit; stop below low; target premium array.

**Buy Model**:
- **Structure**:
  - Consolidation: At premium (equal highs).
  - Drop: To discount array (bullish OB, FVG).
  - Reversal: Bullish MSS (higher low).
  - Retracement: Post-reversal pullback to discount.
- **Entry**: Buy limit at discount array + 5 pips.
- **Stop Loss**: 20 pips below consolidation/reversal low.
- **Take Profit**: Liquidity above consolidation (60+ pips).
- **AI Logic**: Similar to Sell Model, focusing on reversal post-drop.

**Pyramiding**:
- Add positions on second retracement (e.g., 10 lots first, 5 lots second) if target unrealized.
- Avoid if price >50% to target (single-stage accumulation).
- **AI Logic**: Monitor range to target; add positions only at discount arrays with confluences (e.g., -3 SD, Kill Zone).

**Example**:
- S&P E-Mini (1H): Sell Model, consolidation at 4100, impulse to 4150 (premium OB). AI buys first retracement to bullish OB (4120), stop at 4100, targets 4150. Adds 5 lots on second retracement (4115), exits at 4150.

**Trading Plan**:
- **Preparation**: Top-down analysis (Weekly to 1H) for premium arrays.
- **Execution**: Enter at discount arrays in Kill Zones (Monday-Wednesday).
- **Risk Management**: Same as Model 1; adjust stops for pyramiding.

### 7. Price Action Model 9: One Shot One Kill (50-75 Pips)
**Overview**: Model 9 targets a single 50-75 pip trade per week, executed Monday-Wednesday, leveraging weekly range expansion and OTE entries.

**Core Concepts**:
- **Weekly Bias**: Set via 20-week range and institutional order flow.
- **Liquidity Runs**: Target BSL (bullish) or SSL (bearish) via FVGs, OBs.
- **Internal/External Liquidity**: Enter at internal (FVG, OB) for external targets or vice versa (Turtle Soup).

**Setup**:
- **Weekly Bias**: Analyze 20-week high/low; bullish if targeting BSL, bearish for SSL.
- **Entry Zones**:
  - Internal: FVG, OB within range, targeting external liquidity (old highs/lows).
  - External: Old highs/lows post-stop run, targeting internal liquidity.
- **Execution**:
  - Timeframe: 15-minute chart, Monday-Wednesday, London (5:00 AM - 9:00 AM UTC)/NY Kill Zones (11:00 AM - 2:00 PM UTC).
  - Bullish: Market order at OTE post-SSL raid or retracement to discount array.
  - Bearish: Market order at OTE post-BSL raid or retracement to premium array.
  - Stop Loss: 20 pips beyond retracement low/high.
  - Take Profit: 50 pips (80% of position), 75 pips (remainder).
- **AI Logic**:
  - Set weekly bias via 20-week range.
  - Identify OTE on 15M chart post-liquidity raid or retracement.
  - Enter in Kill Zones; stop 20 pips beyond structure; target 50-75 pips.
  - Use two-stage approach: partial at 20 pips (Model 8 logic), full at 50-75 pips.

**Example**:
- Euro Dollar (15M, Tuesday, Dec 2020): Bullish bias, SSL raid at 1.2000, OTE at 1.2020. AI buys at 1.2020, stop at 1.2000, targets 1.2070 (50 pips), 1.2095 (75 pips). Partial at 50 pips, remainder at 75 pips.

**Trading Plan**:
- **Preparation**: Check economic calendar, define 20-week range, set bias.
- **Opportunity**: Identify liquidity target and OTE in Kill Zones.
- **Execution**: Market order at OTE; manage with partials and stop adjustments.
- **Risk Management**: Same as Model 1; reduce risk post-loss or 5 wins.

## Timing: ICT Kill Zones
Trades are executed during high-volatility periods to maximize probability:
- **London Session (5:00 AM - 9:00 AM UTC)**:
  - Ideal for scalping; features Judas Swing (false move setting daily high/low).
- **New York Session (11:00 AM - 2:00 PM UTC)**:
  - Continuation trades; key at 12:20 PM UTC (CME Open).
- **London Close (2:00 PM - 4:00 PM UTC)**:
  - Counter-trend scalps (high risk).
- **Asian Session (12:00 AM - 4:00 AM UTC)**:
  - Low probability; used for observation.
- **AI Logic**:
  - Restrict signals to Kill Zones.
  - Apply session-specific logic (e.g., Judas Swing in London).
  - Avoid non-Kill Zone trades unless specified.

## Daily and Weekly Range Frameworks
### Daily Range: The True Day
- **Definition**: 4:00 AM to 7:00 PM UTC.
- **Sub-Periods**:
  - Asian Range: Sets initial high/low, targets for liquidity runs.
  - London/NY Kill Zones: High/low formation or continuation.
  - London Close: Final move or retracement.
- **AI Logic**: Frame analysis within True Day, track Asian Range for liquidity targets, confirm setups in Kill Zones.

### Weekly Range Framework
- **Objective**: Capture 65-70% of daily range aligned with weekly candle direction.
- **Steps**:
  - HTF Bias: Analyze 20-60 day Daily chart for PD arrays.
  - Sunday/Monday Filter: Bullish (drop below weekly open, rally); Bearish (rise above open, fall).
  - Execution: Trade Tuesday-Thursday in Kill Zones.
  - Override: Halt if opposing HTF PD array is hit.
- **AI Logic**: Set weekly bias, generate daily signals, suspend at opposing HTF levels.

## Day-of-the-Week Characteristics
- **Monday**: Smaller range, potential weekly high/low if hitting PD array.
- **Tuesday**: High probability for weekly high/low in London.
- **Wednesday**: Confirms Monday/Tuesday moves, ideal trading day.
- **Thursday**: Caps weekly range, potential NY reversal.
- **Friday**: Consolidation, possible expansion if weekly objective unmet.
- **High-Impact News**: Avoid trading (e.g., FOMC, NFP).
- **AI Logic**: Adjust signal aggressiveness by day, suspend on news days.

## Risk and Profit Management
- **Stop Loss**:
  - CBDR Entry: 30 pips.
  - Asian Range Raid: 40 pips.
  - Stop Run/Turtle Soup: 30 pips beyond violated level.
  - OB Retracement: 10 pips beyond day’s extreme.
- **Profit Taking**:
  - First Partial: 20-30 pips.
  - Scale Out: At 2 standard deviations, previous day high/low, 50% of 60-minute swing, or 60-80% ADR.
  - Time-Based: Before London Lunch (9:00 AM UTC), NY Open (11:00 AM UTC), or 2:00-3:00 PM UTC.
- **Position Sizing**: Position Size = (Account Equity * Risk %) / (Stop Loss in Pips * Pip Value).
- **Post-Loss**: Reduce risk by 50% until 50% loss recovered.
- **Winning Streak**: Reduce risk by 50% after 5 consecutive wins.
- **AI Logic**: Dynamically set stops/targets, execute systematic profit-taking, adjust risk based on trade outcomes.

## AI Implementation Guidelines
To enable the AI to function as an ICT trader, it must:
- **Data Inputs**:
  - Historical price data (Monthly to 5-minute charts).
  - Economic calendar for high-impact news.
  - 5-day ADR for range expectations.
- **Bias Establishment**:
  - Analyze HTF (Monthly, Weekly, Daily) for institutional order flow.
  - Confirm quarterly shift and IPDA look-back periods (20/40/60 days).
  - Output daily/weekly bias (bullish/bearish).
- **Setup Identification**:
  - Detect PD arrays (OB, FVG, BB, MB, etc.) using price action rules.
  - Identify liquidity raids (BSL/SSL) and MSS on 1H/15M/5M charts.
  - Prioritize setups in Kill Zones (London/NY).
- **Signal Generation**:
  - Generate buy/sell signals based on Models 1, 2, 5, 6, 9.
  - Validate with confluences (e.g., Fibonacci OTE, standard deviations, economic events).
  - Set entry (limit/stop orders), stop loss, and profit targets per setup rules.
- **Trade Execution**:
  - Execute trades in Kill Zones, focusing on Tuesday-Wednesday.
  - Apply day-of-week filters and avoid high-impact news.
- **Trade Management**:
  - Monitor price action for MSS, reversals, or momentum weakening.
  - Adjust stops dynamically (25% reduction at 25% profit, breakeven at 75%).
  - Scale out at predefined targets (20-75 pips).
- **Filters**:
  - Avoid trading post-large range days (>2x ADR), pre-news, or wide CBDR/Asian Range (>40-50 pips).
  - Suppress signals outside Kill Zones or on Fridays unless weekly objective unmet.
- **Backtesting and Journaling**:
  - Test setups on historical data to refine pattern recognition.
  - Log trades with annotated charts to improve setup identification.
`;
