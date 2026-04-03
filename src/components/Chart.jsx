import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode, createSeriesMarkers } from 'lightweight-charts';

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

export default function Chart({ data, liveBar, trades = [] }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const candleRef = useRef();
  const volumeRef = useRef();
  const markersRef = useRef(null);

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
        barSpacing: 10,
        minBarSpacing: 4,
        rightOffset: 5,
        fixLeftEdge: true,
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
      const sorted = [...data].sort((a, b) => a.time - b.time);
      candles.setData(sorted);
      volume.setData(sorted.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
      })));
      chart.timeScale().fitContent();
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
  useEffect(() => {
    if (!candleRef.current) return;
    if (markersRef.current) { markersRef.current.detach(); markersRef.current = null; }
    if (trades.length === 0) return;

    const markers = trades
      .filter(t => t.time)
      .map(t => ({
        time: t.time,
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
  }, [trades]);

  // Live updates
  useEffect(() => {
    if (!liveBar) return;
    if (candleRef.current) candleRef.current.update(liveBar);
    if (volumeRef.current) {
      volumeRef.current.update({
        time: liveBar.time,
        value: liveBar.volume || 0,
        color: liveBar.close >= liveBar.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
      });
    }
  }, [liveBar]);

  return <div ref={containerRef} className="w-full h-full" />;
}
