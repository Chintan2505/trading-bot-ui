import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode, createSeriesMarkers } from 'lightweight-charts';

// IST offset in seconds (+5:30 = 19800s)
const IST_OFFSET_SEC = 5.5 * 60 * 60;

const CHART_COLORS = {
  bg: '#0c0f14',
  gridLine: '#161b27',
  border: '#1c2333',
  text: '#4a5568',
  crosshair: '#2d3a5033',
  crosshairLabel: '#1e2a40',
  candleUp: '#00d4aa',
  candleDown: '#ff4976',
  volumeUp: '#00d4aa18',
  volumeDown: '#ff497618',
};

export default function Chart({ data, liveBar, scalpLevels = null, hoveredTrade = null, measureMode = false, onMeasureEnd, onLevelsChange = null }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const candleRef = useRef();
  const volumeRef = useRef();
  const priceLinesRef = useRef([]);
  const hoverLinesRef = useRef([]);
  const hoverOverlayRef = useRef(null);
  const hoverMarkersRef = useRef(null); // native series markers primitive

  // Measure tool state
  const overlayRef = useRef(null);
  const measureState = useRef({ active: false, startX: 0, startY: 0, startPrice: 0, startTime: 0 });
  const [measureData, setMeasureData] = useState(null);

  // Drag SL/TP state (TradingView-style)
  const dragRef = useRef({ active: false, which: null, currentPrice: null });
  const tpLineRef = useRef(null);
  const slLineRef = useRef(null);
  const entryRef = useRef(null);
  const scalpLevelsRef = useRef(scalpLevels);
  useEffect(() => { scalpLevelsRef.current = scalpLevels; }, [scalpLevels]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight || 400,
      layout: {
        background: { type: 'solid', color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.gridLine },
        horzLines: { color: CHART_COLORS.gridLine },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: CHART_COLORS.crosshair,
          style: 0,
          labelBackgroundColor: CHART_COLORS.crosshairLabel,
        },
        horzLine: {
          width: 1,
          color: CHART_COLORS.crosshair,
          style: 0,
          labelBackgroundColor: CHART_COLORS.crosshairLabel,
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: CHART_COLORS.border,
        barSpacing: 8,
        minBarSpacing: 2,
        rightOffset: 5,
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.08, bottom: 0.22 },
        entireTextOnly: true,
      },
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.candleUp,
      downColor: CHART_COLORS.candleDown,
      borderVisible: true,
      borderUpColor: CHART_COLORS.candleUp,
      borderDownColor: CHART_COLORS.candleDown,
      wickUpColor: CHART_COLORS.candleUp,
      wickDownColor: CHART_COLORS.candleDown,
    });
    candleRef.current = candles;

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeRef.current = volume;

    if (data?.length > 0) {
      const sorted = [...data]
        .sort((a, b) => a.time - b.time)
        .map(d => ({ ...d, time: d.time + IST_OFFSET_SEC }));

      candles.setData(sorted);
      volume.setData(sorted.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
      })));

      if (data.length > 200) {
        chart.timeScale().scrollToRealTime();
      } else {
        chart.timeScale().fitContent();
      }
    }

    const ro = new ResizeObserver(() => {
      if (chartRef.current && el) {
        chartRef.current.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      // Marker primitive is attached to the candle series which gets destroyed
      // with the chart — clear our ref so next useEffect creates a fresh one.
      hoverMarkersRef.current = null;
      chart.remove();
    };
  }, [data]);

  // SL/TP price lines — rebuild when scalpLevels change OR when chart recreates (data change).
  // NOTE: When a trade is being hovered from history, we HIDE the live scalpLevels lines
  // to avoid visual overlap (live ENTRY/TP/SL would render on top of the hovered trade's
  // ENTRY/TP/SL lines at the same prices). The live lines are restored on mouse-leave.
  const drawPriceLines = useCallback(() => {
    if (!candleRef.current) return;

    // Remove existing lines
    priceLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line); } catch { /* ignore */ }
    });
    priceLinesRef.current = [];

    // Skip drawing live scalpLevels if a historical trade is being hovered
    if (hoveredTrade) return;
    if (!scalpLevels) return;

    const { entry, signal, tp, sl, side } = scalpLevels;
    const isBuy = side === 'BUY';

    if (entry != null) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: entry,
        color: '#f0b90b',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `ENTRY ${isBuy ? 'BUY' : 'SELL'}`,
      }));
    }
    if (signal != null && entry != null && Math.abs(signal - entry) > 0.000001) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: signal,
        color: '#8b9bb4',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'SIGNAL EXEC',
      }));
    }

    const fmtDelta = (price, ref) => {
      if (ref == null || price == null) return '';
      const d = price - ref;
      const pct = (d / ref) * 100;
      const sign = d >= 0 ? '+' : '';
      return ` (${sign}$${d.toFixed(2)} / ${sign}${pct.toFixed(2)}%)`;
    };

    entryRef.current = entry;

    if (tp != null) {
      const tpLine = candleRef.current.createPriceLine({
        price: tp,
        color: CHART_COLORS.candleUp,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP $${tp.toFixed(2)}${fmtDelta(tp, entry)} ⇕`,
      });
      tpLineRef.current = tpLine;
      priceLinesRef.current.push(tpLine);
    } else {
      tpLineRef.current = null;
    }

    if (sl != null) {
      const slLine = candleRef.current.createPriceLine({
        price: sl,
        color: CHART_COLORS.candleDown,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL $${sl.toFixed(2)}${fmtDelta(sl, entry)} ⇕`,
      });
      slLineRef.current = slLine;
      priceLinesRef.current.push(slLine);
    } else {
      slLineRef.current = null;
    }
  }, [scalpLevels, hoveredTrade]);

  // Draw when scalpLevels or hoveredTrade change
  useEffect(() => {
    drawPriceLines();
  }, [scalpLevels, hoveredTrade, drawPriceLines]);

  // Re-draw after chart recreates (data change) — small delay to let chart init
  useEffect(() => {
    if (!scalpLevels) return;
    const timer = setTimeout(drawPriceLines, 100);
    return () => clearTimeout(timer);
  }, [data, drawPriceLines, scalpLevels]);

  // Live updates
  useEffect(() => {
    if (!liveBar || !candleRef.current) return;

    const rawTime = typeof liveBar.time === 'number' ? liveBar.time : null;
    if (!rawTime || !isFinite(rawTime)) return;

    const shifted = { ...liveBar, time: rawTime + IST_OFFSET_SEC };

    try {
      candleRef.current.update(shifted);
      if (volumeRef.current) {
        volumeRef.current.update({
          time: shifted.time,
          value: shifted.volume || 0,
          color: shifted.close >= shifted.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
        });
      }
    } catch {
      // "Cannot update oldest data" — safe to ignore
    }
  }, [liveBar]);

  // ────────────────────── HOVER TRADE OVERLAY ──────────────────────
  // When user hovers a trade in the history panel, draw price lines
  // (entry, partial, exit, TP, SL) and time-based markers on the chart
  // showing exactly where buy/sell/partial happened.

  const clearHoverOverlay = useCallback(() => {
    // Remove price lines
    hoverLinesRef.current.forEach(line => {
      try { candleRef.current?.removePriceLine(line); } catch { /* ignore */ }
    });
    hoverLinesRef.current = [];
    // Clear native series markers
    if (hoverMarkersRef.current) {
      try { hoverMarkersRef.current.setMarkers([]); } catch { /* ignore */ }
    }
    // Clear canvas overlay (vertical lines layer)
    if (hoverOverlayRef.current) {
      const canvas = hoverOverlayRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Build native lightweight-charts markers (drawn directly ON candles with arrows + labels)
  // These are rendered by the chart library itself — zoom/scroll-safe and always visible
  // at the correct candle position. We ALSO draw our own full-height vertical lines on a
  // separate canvas for extra visibility.
  const drawHoverMarkers = useCallback(() => {
    if (!chartRef.current || !candleRef.current) return;

    // Always clear first
    if (hoverMarkersRef.current) {
      try { hoverMarkersRef.current.setMarkers([]); } catch { /* ignore */ }
    }
    if (hoverOverlayRef.current) {
      const canvas = hoverOverlayRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    }

    if (!hoveredTrade) return;

    const side = hoveredTrade.decision || hoveredTrade.side;
    const markers = [];

    // Entry marker (BUY/SELL arrow below/above the candle)
    const executedEntry = hoveredTrade.executedEntryPrice ?? hoveredTrade.entryPrice;
    if (hoveredTrade.createdAt && executedEntry) {
      const t = Math.floor(new Date(hoveredTrade.createdAt).getTime() / 1000) + IST_OFFSET_SEC;
      markers.push({
        time: t,
        position: side === 'BUY' ? 'belowBar' : 'aboveBar',
        color: '#f0b90b',
        shape: side === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${side} fill $${executedEntry.toFixed(2)}`,
        size: 2,
      });
    }

    // Partial marker
    if (hoveredTrade.partialTaken && hoveredTrade.partialPrice && hoveredTrade.createdAt && hoveredTrade.closedAt) {
      const openMs = new Date(hoveredTrade.createdAt).getTime();
      const closeMs = new Date(hoveredTrade.closedAt).getTime();
      const midMs = openMs + (closeMs - openMs) / 2;
      const t = Math.floor(midMs / 1000) + IST_OFFSET_SEC;
      markers.push({
        time: t,
        position: side === 'BUY' ? 'aboveBar' : 'belowBar',
        color: '#eab308',
        shape: 'circle',
        text: `PARTIAL $${hoveredTrade.partialPrice.toFixed(2)}`,
        size: 2,
      });
    }

    // Exit marker (opposite direction from entry)
    if (hoveredTrade.closedAt && hoveredTrade.exitPrice) {
      const t = Math.floor(new Date(hoveredTrade.closedAt).getTime() / 1000) + IST_OFFSET_SEC;
      const pnl = hoveredTrade.pnl ?? 0;
      const color = pnl >= 0 ? '#00d4aa' : '#ff4976';
      const exitSide = side === 'BUY' ? 'SELL' : 'COVER';
      markers.push({
        time: t,
        position: side === 'BUY' ? 'aboveBar' : 'belowBar',
        color,
        shape: side === 'BUY' ? 'arrowDown' : 'arrowUp',
        text: `${exitSide} $${hoveredTrade.exitPrice.toFixed(2)}`,
        size: 2,
      });
    }

    // Sort by time (lightweight-charts requires ascending)
    markers.sort((a, b) => a.time - b.time);

    // Create or update marker primitive on the candle series
    if (markers.length > 0) {
      try {
        if (!hoverMarkersRef.current) {
          hoverMarkersRef.current = createSeriesMarkers(candleRef.current, markers);
        } else {
          hoverMarkersRef.current.setMarkers(markers);
        }
      } catch (err) {
        console.warn('[Chart] setMarkers failed:', err.message);
      }
    }

    // ── Also draw full-height vertical guide lines on the canvas ──
    // This gives extra visual cue across the whole chart height
    if (!hoverOverlayRef.current) return;
    const canvas = hoverOverlayRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    const chartH = canvas.offsetHeight;
    const chartW = canvas.offsetWidth;
    const timeScale = chartRef.current.timeScale();

    const drawVerticalGuide = (unixSec, color) => {
      if (!unixSec) return;
      const t = unixSec + IST_OFFSET_SEC;
      const rawX = timeScale.timeToCoordinate(t);
      if (rawX == null || rawX < 0 || rawX > chartW) return;
      // Thin vertical band (highlights the candle column)
      ctx.fillStyle = color + '25';
      ctx.fillRect(rawX - 6, 0, 12, chartH);
      // Dashed full-height line
      ctx.beginPath();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color + 'aa';
      ctx.lineWidth = 1.5;
      ctx.moveTo(rawX, 0);
      ctx.lineTo(rawX, chartH);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    if (hoveredTrade.createdAt) {
      drawVerticalGuide(Math.floor(new Date(hoveredTrade.createdAt).getTime() / 1000), '#f0b90b');
    }
    if (hoveredTrade.partialTaken && hoveredTrade.createdAt && hoveredTrade.closedAt) {
      const openMs = new Date(hoveredTrade.createdAt).getTime();
      const closeMs = new Date(hoveredTrade.closedAt).getTime();
      const midMs = openMs + (closeMs - openMs) / 2;
      drawVerticalGuide(Math.floor(midMs / 1000), '#eab308');
    }
    if (hoveredTrade.closedAt) {
      const pnl = hoveredTrade.pnl ?? 0;
      drawVerticalGuide(
        Math.floor(new Date(hoveredTrade.closedAt).getTime() / 1000),
        pnl >= 0 ? '#00d4aa' : '#ff4976',
      );
    }
  }, [hoveredTrade]);

  const drawHoverLines = useCallback(() => {
    if (!candleRef.current) return;
    // Clear previous
    hoverLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line); } catch { /* ignore */ }
    });
    hoverLinesRef.current = [];

    if (!hoveredTrade) return;

    const {
      entryPrice,
      executedEntryPrice,
      signalPriceMid,
      signalPriceExec,
      exitPrice,
      takeProfitPrice,
      stopLossPrice,
      partialPrice,
      partialTaken,
      pnl,
      decision,
      side,
    } = hoveredTrade;
    const isBuy = (decision || side) === 'BUY';
    const pnlPositive = (pnl ?? 0) >= 0;
    const entryFill = executedEntryPrice ?? entryPrice;

    if (entryFill != null) {
      hoverLinesRef.current.push(candleRef.current.createPriceLine({
        price: entryFill,
        color: '#f0b90b',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `◉ ${isBuy ? 'BUY' : 'SELL'} fill $${entryFill.toFixed(2)}`,
      }));
    }
    const signalReference = signalPriceExec ?? signalPriceMid;
    const signalLabel = signalPriceExec != null ? 'signal(exec)' : 'signal(mid)';
    if (
      signalReference != null &&
      entryFill != null &&
      Math.abs(signalReference - entryFill) > 0.000001
    ) {
      hoverLinesRef.current.push(candleRef.current.createPriceLine({
        price: signalReference,
        color: '#8b9bb4',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${signalLabel} $${signalReference.toFixed(2)}`,
      }));
    }

    if (takeProfitPrice != null) {
      hoverLinesRef.current.push(candleRef.current.createPriceLine({
        price: takeProfitPrice,
        color: CHART_COLORS.candleUp,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP $${takeProfitPrice.toFixed(2)}`,
      }));
    }

    if (stopLossPrice != null) {
      hoverLinesRef.current.push(candleRef.current.createPriceLine({
        price: stopLossPrice,
        color: CHART_COLORS.candleDown,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL $${stopLossPrice.toFixed(2)}`,
      }));
    }

    if (partialTaken && partialPrice != null) {
      hoverLinesRef.current.push(candleRef.current.createPriceLine({
        price: partialPrice,
        color: '#eab308',
        lineWidth: 2,
        lineStyle: 1,
        axisLabelVisible: true,
        title: `◐ PARTIAL $${partialPrice.toFixed(2)}`,
      }));
    }

    if (exitPrice != null) {
      const color = pnlPositive ? CHART_COLORS.candleUp : CHART_COLORS.candleDown;
      hoverLinesRef.current.push(candleRef.current.createPriceLine({
        price: exitPrice,
        color,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `✕ EXIT $${exitPrice.toFixed(2)}`,
      }));
    }
  }, [hoveredTrade]);

  // Apply / clear hover overlay when hoveredTrade changes
  useEffect(() => {
    if (!hoveredTrade) {
      clearHoverOverlay();
      return;
    }
    drawHoverLines();

    // Auto-scroll chart so the trade's candle(s) are visible in the center.
    // Without this, older trades would be off-screen and markers invisible.
    if (chartRef.current && hoveredTrade.createdAt) {
      const openT = Math.floor(new Date(hoveredTrade.createdAt).getTime() / 1000) + IST_OFFSET_SEC;
      const closeT = hoveredTrade.closedAt
        ? Math.floor(new Date(hoveredTrade.closedAt).getTime() / 1000) + IST_OFFSET_SEC
        : openT + 60;
      try {
        const ts = chartRef.current.timeScale();
        // Give ~20 bars of padding on each side
        const padding = 20 * 60;
        ts.setVisibleRange({ from: openT - padding, to: closeT + padding });
      } catch { /* ignore */ }
    }

    // Draw markers after scroll is applied
    const drawTimer = setTimeout(drawHoverMarkers, 50);

    // Redraw markers on chart pan/zoom
    if (!chartRef.current) {
      return () => clearTimeout(drawTimer);
    }
    const ts = chartRef.current.timeScale();
    const handler = () => drawHoverMarkers();
    ts.subscribeVisibleLogicalRangeChange(handler);
    return () => {
      clearTimeout(drawTimer);
      try { ts.unsubscribeVisibleLogicalRangeChange(handler); } catch { /* ignore */ }
    };
  }, [hoveredTrade, drawHoverLines, drawHoverMarkers, clearHoverOverlay]);

  // ────────────────────── DRAG SL/TP (TradingView-style) ──────────────────────
  // Click within ~6px of TP or SL line, drag to new price, release to commit.
  // Default: locked. Only active when onLevelsChange prop provided + scalpLevels set.
  useEffect(() => {
    if (!onLevelsChange) return;
    if (measureMode) return; // measure tool wins
    const el = containerRef.current;
    if (!el) return;

    const HIT_PX = 8;

    const fmtDeltaTitle = (price, ref, kind) => {
      if (ref == null || price == null) return `${kind} $${price.toFixed(2)} ⇕`;
      const d = price - ref;
      const pct = (d / ref) * 100;
      const sign = d >= 0 ? '+' : '';
      return `${kind} $${price.toFixed(2)} (${sign}$${d.toFixed(2)} / ${sign}${pct.toFixed(2)}%) ⇕`;
    };

    const priceToY = (price) => {
      if (!candleRef.current || price == null) return null;
      try { return candleRef.current.priceToCoordinate(price); } catch { return null; }
    };

    const hitTest = (clientY) => {
      const rect = el.getBoundingClientRect();
      const y = clientY - rect.top;
      const lvl = scalpLevelsRef.current;
      if (!lvl) return null;
      const tpY = priceToY(lvl.tp);
      const slY = priceToY(lvl.sl);
      if (tpY != null && Math.abs(y - tpY) <= HIT_PX) return 'tp';
      if (slY != null && Math.abs(y - slY) <= HIT_PX) return 'sl';
      return null;
    };

    const onMove = (e) => {
      // Hover cursor when over a draggable line (not while dragging)
      if (!dragRef.current.active) {
        const hit = hitTest(e.clientY);
        el.style.cursor = hit ? 'ns-resize' : '';
        return;
      }

      // Active drag — recompute price from cursor Y, redraw line live
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const newPrice = candleRef.current?.coordinateToPrice(y);
      if (newPrice == null || !isFinite(newPrice)) return;
      const rounded = parseFloat(newPrice.toFixed(2));
      dragRef.current.currentPrice = rounded;
      const which = dragRef.current.which;
      const target = which === 'tp' ? tpLineRef.current : slLineRef.current;
      if (target) {
        try {
          target.applyOptions({
            price: rounded,
            title: fmtDeltaTitle(rounded, entryRef.current, which.toUpperCase()),
          });
        } catch { /* ignore */ }
      }
    };

    const onDown = (e) => {
      const hit = hitTest(e.clientY);
      if (!hit) return;
      // Block chart pan/scroll while dragging line
      e.preventDefault();
      e.stopPropagation();
      try { chartRef.current?.applyOptions({ handleScroll: false, handleScale: false }); } catch { /* ignore */ }
      dragRef.current = { active: true, which: hit, currentPrice: scalpLevelsRef.current?.[hit] ?? null };
      el.style.cursor = 'ns-resize';
    };

    const onUp = () => {
      if (!dragRef.current.active) return;
      const finalPrice = dragRef.current.currentPrice;
      const which = dragRef.current.which;
      dragRef.current = { active: false, which: null, currentPrice: null };
      el.style.cursor = '';
      try { chartRef.current?.applyOptions({ handleScroll: true, handleScale: true }); } catch { /* ignore */ }

      const lvl = scalpLevelsRef.current;
      if (!lvl || finalPrice == null) return;

      const newTp = which === 'tp' ? finalPrice : lvl.tp;
      const newSl = which === 'sl' ? finalPrice : lvl.sl;

      // Direction sanity client-side (server also validates)
      const isBuy = lvl.side === 'BUY';
      const entry = lvl.entry;
      if (entry != null) {
        if (isBuy && (newTp <= entry || newSl >= entry)) {
          console.warn('[DragLevels] Invalid for BUY — TP must > entry, SL < entry');
          // Snap line back to original
          try { tpLineRef.current?.applyOptions({ price: lvl.tp }); slLineRef.current?.applyOptions({ price: lvl.sl }); } catch { /* ignore */ }
          return;
        }
        if (!isBuy && (newTp >= entry || newSl <= entry)) {
          console.warn('[DragLevels] Invalid for SELL — TP must < entry, SL > entry');
          try { tpLineRef.current?.applyOptions({ price: lvl.tp }); slLineRef.current?.applyOptions({ price: lvl.sl }); } catch { /* ignore */ }
          return;
        }
      }

      onLevelsChange({ tp: newTp, sl: newSl });
    };

    const onLeave = () => {
      if (!dragRef.current.active) el.style.cursor = '';
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onLeave);

    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('mouseleave', onLeave);
      el.style.cursor = '';
    };
  }, [onLevelsChange, measureMode]);

  // ────────────────────── MEASURE TOOL ──────────────────────

  const getPriceFromY = useCallback((y) => {
    if (!candleRef.current) return null;
    const coord = candleRef.current.coordinateToPrice(y);
    return coord;
  }, []);

  const getTimeFromX = useCallback((x) => {
    if (!chartRef.current) return null;
    const ts = chartRef.current.timeScale();
    const time = ts.coordinateToTime(x);
    return time;
  }, []);

  // Draw the measure overlay
  const drawMeasure = useCallback((startX, startY, endX, endY) => {
    if (!overlayRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const w = Math.abs(endX - startX);
    const h = Math.abs(endY - startY);

    if (w < 3 && h < 3) return;

    // Get prices and times
    const price1 = getPriceFromY(startY);
    const price2 = getPriceFromY(endY);
    const time1 = getTimeFromX(startX);
    const time2 = getTimeFromX(endX);

    if (price1 == null || price2 == null) return;

    const priceDiff = price2 - price1;
    const pricePct = price1 !== 0 ? ((priceDiff / price1) * 100) : 0;
    const isUp = priceDiff >= 0;

    // Calculate bars and time
    let bars = 0;
    let timeDiffStr = '';
    if (time1 != null && time2 != null) {
      const t1 = typeof time1 === 'number' ? time1 : 0;
      const t2 = typeof time2 === 'number' ? time2 : 0;
      const diffSec = Math.abs(t2 - t1);
      bars = Math.round(diffSec / 60); // 1-min bars
      if (diffSec >= 3600) {
        timeDiffStr = `${Math.floor(diffSec / 3600)}h ${Math.floor((diffSec % 3600) / 60)}m`;
      } else {
        timeDiffStr = `${Math.floor(diffSec / 60)}m`;
      }
    }

    // Box fill
    ctx.fillStyle = isUp ? 'rgba(0, 212, 170, 0.08)' : 'rgba(255, 73, 118, 0.08)';
    ctx.fillRect(x, y, w, h);

    // Box border
    ctx.strokeStyle = isUp ? 'rgba(0, 212, 170, 0.4)' : 'rgba(255, 73, 118, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Arrow line from start to end
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = isUp ? 'rgba(0, 212, 170, 0.6)' : 'rgba(255, 73, 118, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Arrow head
    const angle = Math.atan2(endY - startY, endX - startX);
    const headLen = 8;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
    ctx.stroke();

    // Start dot
    ctx.beginPath();
    ctx.arc(startX, startY, 3, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? '#00d4aa' : '#ff4976';
    ctx.fill();

    // Info label
    const labelX = x + w / 2;
    const labelY = y + h + 8;
    const lines = [
      `${isUp ? '+' : ''}${priceDiff.toFixed(2)} (${isUp ? '+' : ''}${pricePct.toFixed(2)}%)`,
      `${bars} bars${timeDiffStr ? ', ' + timeDiffStr : ''}`,
    ];

    const fontSize = 11;
    ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
    const maxTextW = Math.max(...lines.map(l => ctx.measureText(l).width));
    const padX = 8, padY = 5;
    const boxW = maxTextW + padX * 2;
    const boxH = lines.length * (fontSize + 3) + padY * 2;
    const boxX = labelX - boxW / 2;
    const boxY = Math.min(labelY, canvas.offsetHeight - boxH - 5);

    // Label background
    ctx.fillStyle = isUp ? 'rgba(0, 212, 170, 0.15)' : 'rgba(255, 73, 118, 0.15)';
    ctx.strokeStyle = isUp ? 'rgba(0, 212, 170, 0.4)' : 'rgba(255, 73, 118, 0.4)';
    ctx.lineWidth = 1;
    const r = 4;
    ctx.beginPath();
    ctx.moveTo(boxX + r, boxY);
    ctx.lineTo(boxX + boxW - r, boxY);
    ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
    ctx.lineTo(boxX + boxW, boxY + boxH - r);
    ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
    ctx.lineTo(boxX + r, boxY + boxH);
    ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
    ctx.lineTo(boxX, boxY + r);
    ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Label text
    ctx.fillStyle = isUp ? '#00d4aa' : '#ff4976';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, labelX, boxY + padY + i * (fontSize + 3));
    });

    // Save measure data for external use
    setMeasureData({ priceDiff, pricePct, bars, timeDiffStr, isUp });
  }, [getPriceFromY, getTimeFromX]);

  // Clear the measure overlay
  const clearMeasure = useCallback(() => {
    if (!overlayRef.current) return;
    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setMeasureData(null);
  }, []);

  // Measure mode mouse handlers
  useEffect(() => {
    if (!containerRef.current || !overlayRef.current) return;
    const overlay = overlayRef.current;

    if (!measureMode) {
      overlay.style.pointerEvents = 'none';
      clearMeasure();
      return;
    }

    overlay.style.pointerEvents = 'auto';
    overlay.style.cursor = 'crosshair';

    const onMouseDown = (e) => {
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      measureState.current = { active: true, startX: x, startY: y };
    };

    const onMouseMove = (e) => {
      if (!measureState.current.active) return;
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      drawMeasure(measureState.current.startX, measureState.current.startY, x, y);
    };

    const onMouseUp = (e) => {
      if (!measureState.current.active) return;
      measureState.current.active = false;
      // Keep the drawing visible — user clicks again or presses Escape to clear
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        clearMeasure();
        if (onMeasureEnd) onMeasureEnd();
      }
    };

    overlay.addEventListener('mousedown', onMouseDown);
    overlay.addEventListener('mousemove', onMouseMove);
    overlay.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      overlay.removeEventListener('mousedown', onMouseDown);
      overlay.removeEventListener('mousemove', onMouseMove);
      overlay.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [measureMode, drawMeasure, clearMeasure, onMeasureEnd]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Hover trade overlay — shows markers for buy/partial/sell on hover */}
      <canvas
        ref={hoverOverlayRef}
        className="absolute inset-0 w-full h-full z-[9]"
        style={{ pointerEvents: 'none' }}
      />
      {/* Measure overlay canvas — sits on top of chart */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full z-10"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
