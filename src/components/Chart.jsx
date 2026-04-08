import React, { useEffect, useRef } from 'react';
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

export default function Chart({ data, liveBar, trades = [], scalpLevels = null }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const candleRef = useRef();
  const volumeRef = useRef();
  const markersRef = useRef(null);
  const priceLinesRef = useRef([]);

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
      // Shift timestamps to IST for display
      const sorted = [...data]
        .sort((a, b) => a.time - b.time)
        .map(d => ({ ...d, time: d.time + IST_OFFSET_SEC }));

      candles.setData(sorted);
      volume.setData(sorted.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
      })));

      // For many bars (intraday), scroll to end and show ~2-3 hours
      // For few bars (daily), fit all content
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
      if (markersRef.current) markersRef.current.detach();
      chart.remove();
    };
  }, [data]);

  // Trade markers
  // NOTE: depends on `data` too — the chart is fully recreated whenever
  // historical data arrives, which destroys any markers. Re-running this
  // effect after data change ensures markers are reattached.
  useEffect(() => {
    if (!candleRef.current) return;
    if (markersRef.current) { markersRef.current.detach(); markersRef.current = null; }
    if (trades.length === 0) return;

    const markers = trades
      .filter(t => t.time)
      .map(t => ({
        time: t.time + IST_OFFSET_SEC,
        position: t.decision === 'BUY' ? 'belowBar' : 'aboveBar',
        color: t.decision === 'BUY' ? CHART_COLORS.candleUp : CHART_COLORS.candleDown,
        shape: t.decision === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: t.decision,
        size: 2,
      }))
      .sort((a, b) => a.time - b.time);

    if (markers.length > 0) {
      markersRef.current = createSeriesMarkers(candleRef.current, markers);
    }
  }, [trades, data]);

  // SL/TP price lines for active scalp position
  // NOTE: depends on `data` too — see comment on the trade-markers effect.
  // Without `data` in the dep array, refreshing the page while a position is
  // open will set scalpLevels BEFORE the chart finishes building, so the
  // first run bails out at `if (!candleRef.current)` and never re-fires.
  // The lines reappear only after the user navigates away and back (which
  // remounts the Chart and re-runs every effect in the right order).
  useEffect(() => {
    if (!candleRef.current) return;

    // Remove existing lines
    priceLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line); } catch { /* ignore */ }
    });
    priceLinesRef.current = [];

    if (!scalpLevels) return;

    const { entry, tp, sl, side } = scalpLevels;
    const isBuy = side === 'BUY';

    // Entry line (gold/yellow)
    if (entry != null) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: entry,
        color: '#f0b90b',
        lineWidth: 2,
        lineStyle: 0, // solid
        axisLabelVisible: true,
        title: `ENTRY ${isBuy ? 'BUY' : 'SELL'}`,
      }));
    }

    // Take Profit line (green)
    if (tp != null) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: tp,
        color: CHART_COLORS.candleUp,
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: `TP $${tp.toFixed(2)}`,
      }));
    }

    // Stop Loss line (red)
    if (sl != null) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: sl,
        color: CHART_COLORS.candleDown,
        lineWidth: 2,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: `SL $${sl.toFixed(2)}`,
      }));
    }
  }, [scalpLevels, data]);

  // Live updates
  useEffect(() => {
    if (!liveBar) return;
    const shifted = { ...liveBar, time: liveBar.time + IST_OFFSET_SEC };
    if (candleRef.current) candleRef.current.update(shifted);
    if (volumeRef.current) {
      volumeRef.current.update({
        time: shifted.time,
        value: shifted.volume || 0,
        color: shifted.close >= shifted.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
      });
    }
  }, [liveBar]);

  return <div ref={containerRef} className="w-full h-full" />;
}
