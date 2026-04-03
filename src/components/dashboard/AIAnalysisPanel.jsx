import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAIAnalysis } from '@/services/api';
import {
  Brain, TrendingUp, TrendingDown, Minus, Shield, Target,
  ChevronDown, ChevronUp, Loader2, Sparkles,
  ArrowUpRight, ArrowDownRight, BarChart3, Activity,
  Gauge, Eye, AlertTriangle, Layers, Crosshair,
  Signal, Zap, Clock, Radio
} from 'lucide-react';

const INDICATOR_INFO = {
  RSI: {
    fullName: 'Relative Strength Index',
    description: 'Measures how overbought or oversold a stock is.',
    range: '0–100',
    signals: ['Above 70 → Overbought (possible sell signal)', 'Below 30 → Oversold (possible buy signal)'],
    aiMethod: 'AI calculates RSI using 14-period average gains vs losses, then maps the ratio to 0–100 to detect momentum shifts.',
  },
  MACD: {
    fullName: 'Moving Average Convergence Divergence',
    description: 'Shows the relationship between two EMAs (12-day and 26-day).',
    signals: ['MACD crosses above signal line → Bullish (buy)', 'MACD crosses below signal line → Bearish (sell)'],
    aiMethod: 'AI computes the difference between 12 & 26 EMA, then compares to its 9-period signal line to gauge momentum direction.',
  },
  EMA: {
    fullName: 'Exponential Moving Average',
    description: 'A moving average giving more weight to recent prices for faster trend detection.',
    signals: ['Price above EMA → Uptrend', 'Price below EMA → Downtrend'],
    aiMethod: 'AI applies an exponential decay multiplier (2/(period+1)) so recent prices matter more, smoothing noise while staying responsive.',
  },
  Bollinger: {
    fullName: 'Bollinger Bands',
    description: 'A moving average ± standard deviations forming upper/lower bands.',
    signals: ['Price near upper band → Potentially overbought', 'Price near lower band → Potentially oversold'],
    aiMethod: 'AI calculates 20-period SMA ± 2 standard deviations to measure volatility and identify squeeze/expansion patterns.',
  },
  Stochastic: {
    fullName: 'Stochastic Oscillator',
    description: 'Compares closing price to its price range over a period.',
    range: '0–100',
    signals: ['Above 80 → Overbought', 'Below 20 → Oversold'],
    aiMethod: 'AI computes %K = (Close − Low₁₄) / (High₁₄ − Low₁₄) × 100, then smooths with %D to spot momentum reversals.',
  },
  ADX: {
    fullName: 'Average Directional Index',
    description: 'Measures the strength of a trend, not its direction.',
    range: '0–100',
    signals: ['Above 25 → Strong trend', 'Below 20 → Weak / no trend'],
    aiMethod: 'AI derives +DI and −DI from directional movement, then averages their ratio over 14 periods to quantify trend strength.',
  },
  ATR: {
    fullName: 'Average True Range',
    description: 'Measures market volatility using true range calculations.',
    signals: ['Higher ATR → More volatility', 'Useful for stop-losses & position sizing'],
    aiMethod: 'AI takes the max of (High−Low, |High−PrevClose|, |Low−PrevClose|) each bar, then averages over 14 periods.',
  },
  CCI: {
    fullName: 'Commodity Channel Index',
    description: 'Measures how far price deviates from its statistical average.',
    range: '−100 to +100 (typical)',
    signals: ['Above +100 → Overbought', 'Below −100 → Oversold'],
    aiMethod: 'AI computes (Typical Price − SMA) / (0.015 × Mean Deviation) to normalize price distance from the mean.',
  },
  OBV: {
    fullName: 'On-Balance Volume',
    description: 'Uses volume flow to predict price movement direction.',
    signals: ['Rising OBV → Buyers dominate → Price likely to rise', 'Falling OBV → Sellers dominate → Price likely to fall'],
    aiMethod: 'AI adds volume on up-close days and subtracts on down-close days to build a cumulative volume trend line.',
  },
  Volume: {
    fullName: 'Volume Analysis',
    description: 'Number of shares traded in a given period.',
    signals: ['High volume + price up → Strong bullish move', 'High volume + price down → Strong bearish move'],
    aiMethod: 'AI compares current volume to the 20-period average to detect unusual activity confirming or contradicting price moves.',
  },
  Patterns: {
    fullName: 'Chart Patterns',
    description: 'Recognized formations like head & shoulders, double tops, triangles.',
    signals: ['Continuation patterns → Trend likely continues', 'Reversal patterns → Trend likely changes direction'],
    aiMethod: 'AI scans price action for geometric formations and validates them with volume and breakout confirmation rules.',
  },
  'S/R': {
    fullName: 'Support & Resistance',
    description: 'Key price levels where the stock tends to stop or reverse.',
    signals: ['Support → Price floor, tends to bounce up', 'Resistance → Price ceiling, tends to push down'],
    aiMethod: 'AI identifies clusters of historical highs/lows and high-volume zones to map key levels for entry/exit planning.',
  },
};

function IndicatorTooltip({ tag, children }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0, placeAbove: true });
  const triggerRef = useRef(null);

  const info = INDICATOR_INFO[tag];
  if (!info) return children;

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      const tooltipHeight = 280;
      const padding = 8;
      const placeAbove = rect.top > tooltipHeight + 10;

      // Center on the badge, then clamp to screen edges
      let x = rect.left + rect.width / 2;
      const minX = tooltipWidth / 2 + padding;
      const maxX = window.innerWidth - tooltipWidth / 2 - padding;
      x = Math.max(minX, Math.min(maxX, x));

      setCoords({
        x,
        y: placeAbove ? rect.top - 8 : rect.bottom + 8,
        placeAbove,
        arrowX: rect.left + rect.width / 2, // true center of badge for arrow
      });
    }
    setShow(true);
  };

  const tooltip = show && createPortal(
    <div
      className="fixed z-[99999] w-[280px] pointer-events-none"
      style={{
        left: `${coords.x}px`,
        top: coords.placeAbove ? 'auto' : `${coords.y}px`,
        bottom: coords.placeAbove ? `${window.innerHeight - coords.y}px` : 'auto',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="bg-[#0d1117] border border-purple-500/30 rounded-lg shadow-2xl shadow-purple-500/10 p-3 text-left pointer-events-auto">
        {/* Arrow */}
        <div
          className={`absolute w-2.5 h-2.5 bg-[#0d1117] border-purple-500/30 rotate-45 ${
            coords.placeAbove
              ? 'bottom-[-6px] border-b border-r'
              : 'top-[-6px] border-t border-l'
          }`}
          style={{ left: `${coords.arrowX - coords.x + 140}px`, transform: 'translateX(-50%) rotate(45deg)' }}
        />

        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[12px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
            {tag}
          </span>
          <span className="text-[12px] font-medium text-gray-300">
            {info.fullName}
          </span>
        </div>

        {/* Description */}
        <p className="text-[12px] text-gray-400 mb-2 leading-relaxed">
          {info.description}
        </p>

        {/* Range if available */}
        {info.range && (
          <div className="text-[11px] text-gray-500 mb-1.5 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-blue-400/60" />
            <span>Range: <span className="text-gray-400">{info.range}</span></span>
          </div>
        )}

        {/* Signals */}
        <div className="space-y-1 mb-2">
          {info.signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <span className="mt-1 w-1 h-1 rounded-full bg-purple-400/60 shrink-0" />
              <span className="text-gray-400">{signal}</span>
            </div>
          ))}
        </div>

        {/* AI Method */}
        <div className="bg-purple-500/5 border border-purple-500/10 rounded-md p-2 mt-2">
          <div className="flex items-center gap-1 mb-1">
            <Brain className="w-3.5 h-3.5 text-purple-400/70" />
            <span className="text-[11px] font-medium text-purple-400/80">How AI Calculates</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {info.aiMethod}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {tooltip}
    </span>
  );
}

export default function AIAnalysisPanel({ symbol, timeframe }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({
    analysis: true,
    signals: true,
    targets: true,
    confluence: true,
    levels: false,
    indicators: false,
  });

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAIAnalysis(symbol, timeframe);
      if (data.success) {
        setAnalysis(data);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  const toggleSection = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const ai = analysis?.ai;
  const indicators = analysis?.indicators;

  const recConfig = {
    BUY: { bg: 'bg-bull', text: 'text-bull', bgLight: 'bg-bull/10', border: 'border-bull/30', gradient: 'from-bull/20 to-transparent' },
    SELL: { bg: 'bg-bear', text: 'text-bear', bgLight: 'bg-bear/10', border: 'border-bear/30', gradient: 'from-bear/20 to-transparent' },
    HOLD: { bg: 'bg-gold', text: 'text-gold', bgLight: 'bg-gold/10', border: 'border-gold/30', gradient: 'from-gold/20 to-transparent' },
  };

  const riskConfig = { LOW: 'text-bull', MEDIUM: 'text-gold', HIGH: 'text-bear' };

  const regimeConfig = {
    UPTREND: { icon: TrendingUp, color: 'text-bull', bg: 'bg-bull/10' },
    DOWNTREND: { icon: TrendingDown, color: 'text-bear', bg: 'bg-bear/10' },
    RANGING: { icon: Minus, color: 'text-gold', bg: 'bg-gold/10' },
    BREAKOUT: { icon: Zap, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    CONSOLIDATION: { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  };

  const rec = recConfig[ai?.recommendation] || recConfig.HOLD;
  const regime = regimeConfig[ai?.market_regime] || regimeConfig.RANGING;
  const RegimeIcon = regime.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-terminal-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 flex items-center justify-center ring-1 ring-purple-500/20">
              <Brain className="w-4.5 h-4.5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Analysis</h3>
              <p className="text-[10px] text-gray-600 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5" /> Powered by Llama 3.3 70B
              </p>
            </div>
          </div>
          {ai && (
            <span className="text-[9px] text-gray-600 font-mono bg-terminal-bg px-1.5 py-0.5 rounded">
              {new Date(analysis.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            loading
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20 cursor-wait'
              : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-purple-300 border border-purple-500/30 hover:from-purple-500/30 hover:to-blue-500/30 hover:text-white hover:shadow-lg hover:shadow-purple-500/10'
          }`}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing {symbol}...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Analyze {symbol}</>
          )}
        </button>

        {error && (
          <div className="mt-2 p-2.5 rounded-lg bg-bear/10 border border-bear/20 text-[11px] text-bear flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results */}
      {ai && (
        <div className="flex-1 overflow-y-auto">
          {/* Recommendation Hero */}
          <div className={`m-3 p-4 rounded-xl border ${rec.bgLight} ${rec.border} bg-gradient-to-b ${rec.gradient}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl ${rec.bgLight} border ${rec.border} flex items-center justify-center`}>
                  {ai.recommendation === 'BUY' && <ArrowUpRight className="w-5 h-5 text-bull" />}
                  {ai.recommendation === 'SELL' && <ArrowDownRight className="w-5 h-5 text-bear" />}
                  {ai.recommendation === 'HOLD' && <Minus className="w-5 h-5 text-gold" />}
                </div>
                <div>
                  <span className={`text-2xl font-black ${rec.text}`}>
                    {ai.recommendation}
                  </span>
                  {ai.confluence_score?.alignment && (
                    <div className={`text-[9px] font-semibold uppercase tracking-wider ${rec.text} opacity-70`}>
                      {ai.confluence_score.alignment.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase text-gray-500 tracking-wider">Confidence</div>
                <div className={`text-2xl font-black font-mono ${rec.text}`}>
                  {ai.confidence}<span className="text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="w-full h-2.5 rounded-full bg-gray-800/80 mb-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${rec.bg}`}
                style={{ width: `${ai.confidence}%` }}
              />
            </div>

            <p className="text-[12px] text-gray-300 leading-relaxed">{ai.summary}</p>

            {/* Meta Row */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
              {ai.market_regime && (
                <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md ${regime.bg} ${regime.color}`}>
                  <RegimeIcon className="w-3 h-3" />
                  {ai.market_regime}
                </span>
              )}
              <span className="flex items-center gap-1 text-[10px]">
                <Shield className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500">Risk:</span>
                <span className={`font-bold ${riskConfig[ai.risk_level]}`}>{ai.risk_level}</span>
              </span>
              {ai.timeframe && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  {ai.timeframe}
                </span>
              )}
            </div>
          </div>

          {/* Confluence Score */}
          {ai.confluence_score && (
            <CollapsibleSection
              title="Signal Confluence"
              icon={<Signal className="w-3.5 h-3.5 text-purple-400" />}
              expanded={expanded.confluence}
              onToggle={() => toggleSection('confluence')}
              badge={
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rec.bgLight} ${rec.text}`}>
                  {ai.confluence_score.bullish_count}B / {ai.confluence_score.bearish_count}S
                </span>
              }
            >
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-bull font-semibold">Bullish ({ai.confluence_score.bullish_count})</span>
                      <span className="text-bear font-semibold">Bearish ({ai.confluence_score.bearish_count})</span>
                    </div>
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-800">
                      <div
                        className="bg-bull rounded-l-full transition-all"
                        style={{ width: `${(ai.confluence_score.bullish_count / Math.max(ai.confluence_score.total_signals, 1)) * 100}%` }}
                      />
                      <div
                        className="bg-bear rounded-r-full transition-all ml-auto"
                        style={{ width: `${(ai.confluence_score.bearish_count / Math.max(ai.confluence_score.total_signals, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 text-center">
                  {ai.confluence_score.total_signals} signals analyzed
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Detailed Analysis */}
          <CollapsibleSection
            title="Detailed Analysis"
            icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />}
            expanded={expanded.analysis}
            onToggle={() => toggleSection('analysis')}
          >
            {ai.analysis && (
              <div className="space-y-3">
                <AnalysisCard icon={<TrendingUp className="w-3.5 h-3.5 text-blue-400" />} label="Trend" text={ai.analysis.trend} />
                <AnalysisCard icon={<Gauge className="w-3.5 h-3.5 text-purple-400" />} label="Momentum" text={ai.analysis.momentum} />
                <AnalysisCard icon={<Activity className="w-3.5 h-3.5 text-yellow-400" />} label="Volatility" text={ai.analysis.volatility} />
                <AnalysisCard icon={<BarChart3 className="w-3.5 h-3.5 text-cyan-400" />} label="Volume" text={ai.analysis.volume} />
                <AnalysisCard icon={<Layers className="w-3.5 h-3.5 text-orange-400" />} label="Support / Resistance" text={ai.analysis.support_resistance} />
                {ai.analysis.patterns && (
                  <AnalysisCard icon={<Eye className="w-3.5 h-3.5 text-pink-400" />} label="Patterns" text={ai.analysis.patterns} />
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Signals */}
          <CollapsibleSection
            title="Trading Signals"
            icon={<Sparkles className="w-3.5 h-3.5 text-gold" />}
            expanded={expanded.signals}
            onToggle={() => toggleSection('signals')}
          >
            {ai.signals && (
              <div className="space-y-3">
                {ai.signals.bullish?.length > 0 && (
                  <SignalGroup label="Bullish" color="bull" signals={ai.signals.bullish} icon={TrendingUp} />
                )}
                {ai.signals.bearish?.length > 0 && (
                  <SignalGroup label="Bearish" color="bear" signals={ai.signals.bearish} icon={TrendingDown} />
                )}
                {ai.signals.neutral?.length > 0 && (
                  <SignalGroup label="Mixed / Neutral" color="gold" signals={ai.signals.neutral} icon={Minus} />
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Price Targets */}
          <CollapsibleSection
            title="Price Targets"
            icon={<Target className="w-3.5 h-3.5 text-cyan-400" />}
            expanded={expanded.targets}
            onToggle={() => toggleSection('targets')}
          >
            {ai.price_targets && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <TargetCard label="Entry" value={ai.price_targets.entry} color="text-white" icon={<Crosshair className="w-3 h-3 text-white" />} />
                  <TargetCard label="Stop Loss" value={ai.price_targets.stop_loss} color="text-bear" icon={<Shield className="w-3 h-3 text-bear" />} />
                  <TargetCard label="Target 1" value={ai.price_targets.take_profit_1} color="text-bull" icon={<Target className="w-3 h-3 text-bull" />} />
                  <TargetCard label="Target 2" value={ai.price_targets.take_profit_2} color="text-bull" icon={<Target className="w-3 h-3 text-bull" />} />
                </div>
                {ai.price_targets.risk_reward_ratio && (
                  <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-terminal-bg border border-terminal-border">
                    <span className="text-[10px] text-gray-500">R/R Ratio</span>
                    <span className="text-sm font-bold font-mono text-gold">{ai.price_targets.risk_reward_ratio}</span>
                  </div>
                )}
              </div>
            )}
          </CollapsibleSection>

          {/* Key Levels & Risk Factors */}
          <CollapsibleSection
            title="Key Levels & Risks"
            icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
            expanded={expanded.levels}
            onToggle={() => toggleSection('levels')}
          >
            <div className="space-y-3">
              {ai.key_levels_to_watch?.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1.5">Levels to Watch</span>
                  <div className="space-y-1">
                    {ai.key_levels_to_watch.map((level, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-gray-400 bg-terminal-bg rounded-lg px-2.5 py-1.5 border border-terminal-border">
                        <Crosshair className="w-3 h-3 text-gold flex-shrink-0 mt-0.5" />
                        {level}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ai.risk_factors?.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1.5">Risk Factors</span>
                  <div className="space-y-1">
                    {ai.risk_factors.map((risk, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-gray-400 bg-bear/5 rounded-lg px-2.5 py-1.5 border border-bear/10">
                        <AlertTriangle className="w-3 h-3 text-bear flex-shrink-0 mt-0.5" />
                        {risk}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Raw Indicators */}
          <CollapsibleSection
            title="Technical Indicators"
            icon={<Activity className="w-3.5 h-3.5 text-gray-400" />}
            expanded={expanded.indicators}
            onToggle={() => toggleSection('indicators')}
          >
            {indicators && (
              <div className="space-y-3">
                {/* Momentum */}
                <IndicatorGroup title="Momentum">
                  <IndicatorRow label="RSI (14)" value={indicators.momentum?.rsi} accent={
                    parseFloat(indicators.momentum?.rsi) < 30 ? 'text-bull' : parseFloat(indicators.momentum?.rsi) > 70 ? 'text-bear' : ''
                  } />
                  <IndicatorRow label="RSI Trend" value={indicators.momentum?.rsiTrend} />
                  <IndicatorRow label="RSI Zone" value={indicators.momentum?.rsiZone} />
                  {indicators.momentum?.stochastic !== 'N/A' && (
                    <>
                      <IndicatorRow label="Stoch %K" value={indicators.momentum?.stochastic?.k} />
                      <IndicatorRow label="Stoch %D" value={indicators.momentum?.stochastic?.d} />
                    </>
                  )}
                  <IndicatorRow label="Williams %R" value={indicators.momentum?.williamsR} />
                  <IndicatorRow label="CCI" value={indicators.momentum?.cci} />
                </IndicatorGroup>

                {/* Trend */}
                <IndicatorGroup title="Trend">
                  <IndicatorRow label="EMA (9)" value={indicators.trend?.ema9} />
                  <IndicatorRow label="EMA (21)" value={indicators.trend?.ema21} />
                  <IndicatorRow label="EMA (50)" value={indicators.trend?.ema50} />
                  <IndicatorRow label="SMA (50)" value={indicators.trend?.sma50} />
                  <IndicatorRow label="SMA (200)" value={indicators.trend?.sma200} />
                  <IndicatorRow label="EMA Trend" value={indicators.trend?.emaTrend} accent={
                    indicators.trend?.emaTrend?.includes('BULLISH') ? 'text-bull' : 'text-bear'
                  } />
                  <IndicatorRow label="MA Cross" value={indicators.trend?.maCross} accent={
                    indicators.trend?.maCross === 'GOLDEN_CROSS' ? 'text-bull' : indicators.trend?.maCross === 'DEATH_CROSS' ? 'text-bear' : ''
                  } />
                </IndicatorGroup>

                {/* MACD */}
                {indicators.momentum?.macd !== 'N/A' && (
                  <IndicatorGroup title="MACD">
                    <IndicatorRow label="MACD" value={indicators.momentum?.macd?.value} />
                    <IndicatorRow label="Signal" value={indicators.momentum?.macd?.signal} />
                    <IndicatorRow label="Histogram" value={indicators.momentum?.macd?.histogram} accent={
                      parseFloat(indicators.momentum?.macd?.histogram) > 0 ? 'text-bull' : 'text-bear'
                    } />
                    <IndicatorRow label="Crossover" value={indicators.momentum?.macd?.crossover} accent={
                      indicators.momentum?.macd?.crossover === 'BULLISH_CROSS' ? 'text-bull' : indicators.momentum?.macd?.crossover === 'BEARISH_CROSS' ? 'text-bear' : ''
                    } />
                  </IndicatorGroup>
                )}

                {/* Volatility */}
                <IndicatorGroup title="Volatility">
                  {indicators.volatility?.bollingerBands !== 'N/A' && (
                    <>
                      <IndicatorRow label="BB Upper" value={indicators.volatility?.bollingerBands?.upper} />
                      <IndicatorRow label="BB Middle" value={indicators.volatility?.bollingerBands?.middle} />
                      <IndicatorRow label="BB Lower" value={indicators.volatility?.bollingerBands?.lower} />
                      <IndicatorRow label="BB Width" value={indicators.volatility?.bollingerBands?.width} />
                    </>
                  )}
                  <IndicatorRow label="ATR" value={indicators.volatility?.atr} />
                  <IndicatorRow label="ATR %" value={indicators.volatility?.atrPercent} />
                </IndicatorGroup>

                {/* Volume */}
                <IndicatorGroup title="Volume">
                  <IndicatorRow label="Current" value={Number(indicators.volume?.current).toLocaleString()} />
                  <IndicatorRow label="Avg (20)" value={Number(indicators.volume?.avg20).toLocaleString()} />
                  <IndicatorRow label="Ratio" value={indicators.volume?.ratio + 'x'} accent={
                    parseFloat(indicators.volume?.ratio) > 1.5 ? 'text-bull' : ''
                  } />
                  <IndicatorRow label="Trend" value={indicators.volume?.trend} />
                  <IndicatorRow label="OBV Trend" value={indicators.volume?.obvTrend} />
                </IndicatorGroup>

                {/* Levels */}
                <IndicatorGroup title="Key Levels">
                  <IndicatorRow label="Support" value={'$' + indicators.levels?.support} />
                  <IndicatorRow label="Resistance" value={'$' + indicators.levels?.resistance} />
                  <IndicatorRow label="Pivot" value={'$' + indicators.levels?.pivot} />
                  <IndicatorRow label="R1" value={'$' + indicators.levels?.r1} />
                  <IndicatorRow label="S1" value={'$' + indicators.levels?.s1} />
                  <IndicatorRow label="To Support" value={indicators.levels?.distanceToSupport} />
                  <IndicatorRow label="To Resistance" value={indicators.levels?.distanceToResistance} />
                </IndicatorGroup>

                {/* Patterns */}
                {indicators.patterns?.length > 0 && (
                  <IndicatorGroup title="Patterns">
                    {indicators.patterns.map((p, i) => (
                      <div key={i} className="text-[11px] text-gray-400 flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-pink-400 flex-shrink-0" />
                        {p}
                      </div>
                    ))}
                  </IndicatorGroup>
                )}
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}

      {/* Empty State */}
      {!ai && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-purple-500/50" />
          </div>
          <p className="text-sm text-center font-medium text-gray-500 mb-1">AI-Powered Analysis</p>
          <p className="text-[11px] text-center text-gray-600 mb-4 max-w-[200px]">
            Get institutional-grade technical analysis with 12+ indicators
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center max-w-[240px]">
            {['RSI', 'MACD', 'EMA', 'Bollinger', 'Stochastic', 'ADX', 'ATR', 'CCI', 'OBV', 'Volume', 'Patterns', 'S/R'].map(tag => (
              <IndicatorTooltip key={tag} tag={tag}>
                <span className="text-[9px] px-2 py-0.5 rounded-md bg-terminal-card text-gray-500 border border-terminal-border cursor-help hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-200">
                  {tag}
                </span>
              </IndicatorTooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function CollapsibleSection({ title, icon, expanded, onToggle, badge, children }) {
  return (
    <div className="border-t border-terminal-border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-terminal-hover/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{title}</span>
          {badge}
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-600" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-600" />
        }
      </button>
      {expanded && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

function AnalysisCard({ icon, label, text }) {
  return (
    <div className="bg-terminal-bg/50 rounded-lg p-2.5 border border-terminal-border">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      </div>
      <p className="text-[11px] text-gray-300 leading-relaxed">{text}</p>
    </div>
  );
}

function SignalGroup({ label, color, signals, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3 h-3 text-${color}`} />
        <span className={`text-[10px] uppercase tracking-wider text-${color} font-semibold`}>{label}</span>
        <span className={`text-[9px] px-1.5 py-0 rounded-full bg-${color}/10 text-${color} font-mono`}>{signals.length}</span>
      </div>
      <div className="space-y-1 ml-4.5">
        {signals.map((s, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[11px] text-gray-400">
            <div className={`w-1 h-1 rounded-full bg-${color} mt-1.5 flex-shrink-0`} />
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function TargetCard({ label, value, color, icon }) {
  return (
    <div className="bg-terminal-bg rounded-lg p-2.5 border border-terminal-border">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] uppercase text-gray-600 font-semibold">{label}</span>
      </div>
      <span className={`text-sm font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function IndicatorGroup({ title, children }) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold block mb-1.5 px-0.5">{title}</span>
      <div className="bg-terminal-bg/50 rounded-lg border border-terminal-border divide-y divide-terminal-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function IndicatorRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5">
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className={`text-[10px] font-mono font-medium ${accent || 'text-gray-300'}`}>{value ?? '--'}</span>
    </div>
  );
}
