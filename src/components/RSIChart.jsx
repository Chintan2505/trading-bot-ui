import React, { useEffect, useRef } from 'react';
import { createChart, LineSeries, CrosshairMode } from 'lightweight-charts';
import { RSI } from 'technicalindicators';

const COLORS = {
  bg: '#0c0f14',
  gridLine: '#161b27',
  border: '#1c2333',
  text: '#4a5568',
  crosshair: '#2d3a5033',
  crosshairLabel: '#1e2a40',
  rsiLine: '#f0b90b',
  overbought: '#ff497650',
  oversold: '#00d4aa50',
  midline: '#1c2333',
  zoneOverbought: 'rgba(255, 73, 118, 0.04)',
  zoneOversold: 'rgba(0, 212, 170, 0.04)',
};

export default function RSIChart({ data, liveBar }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const allClosesRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight || 180,
      layout: {
        background: { type: 'solid', color: COLORS.bg },
        textColor: COLORS.text,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: COLORS.gridLine },
        horzLines: { color: COLORS.gridLine },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: COLORS.crosshair, style: 0, labelBackgroundColor: COLORS.crosshairLabel },
        horzLine: { width: 1, color: COLORS.crosshair, style: 0, labelBackgroundColor: COLORS.crosshairLabel },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: COLORS.border,
        barSpacing: 10,
        rightOffset: 5,
        fixLeftEdge: true,
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        autoScale: false,
        scaleMargins: { top: 0.05, bottom: 0.05 },
        entireTextOnly: true,
      },
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    const rsiSeries = chart.addSeries(LineSeries, {
      color: COLORS.rsiLine,
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: 0, maxValue: 100 },
      }),
    });

    // Overbought 70
    rsiSeries.createPriceLine({
      price: 70,
      color: COLORS.overbought,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    });

    // Oversold 30
    rsiSeries.createPriceLine({
      price: 30,
      color: COLORS.oversold,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    });

    // Midline 50
    rsiSeries.createPriceLine({
      price: 50,
      color: COLORS.midline,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false,
    });

    seriesRef.current = rsiSeries;

    if (data?.length > 14) {
      const closes = data.map(d => d.close);
      allClosesRef.current = [...closes];
      const rsiValues = RSI.calculate({ values: closes, period: 14 });
      const formatted = rsiValues.map((val, idx) => ({
        time: data[idx + 14].time,
        value: val,
      }));
      rsiSeries.setData(formatted);
      chart.timeScale().fitContent();
    }

    const ro = new ResizeObserver(() => {
      if (chartRef.current && el) {
        chartRef.current.applyOptions({ width: el.clientWidth, height: el.clientHeight });
      }
    });
    ro.observe(el);

    return () => { ro.disconnect(); chart.remove(); };
  }, [data]);

  // Live RSI
  useEffect(() => {
    if (!liveBar || !seriesRef.current || !data || data.length < 15) return;
    const closes = [...allClosesRef.current, liveBar.close];
    if (closes.length > 500) closes.splice(0, closes.length - 500);
    const rsiValues = RSI.calculate({ values: closes, period: 14 });
    if (rsiValues.length > 0) {
      const val = rsiValues[rsiValues.length - 1];
      if (val >= 0 && val <= 100) {
        seriesRef.current.update({ time: liveBar.time, value: val });
      }
    }
  }, [liveBar, data]);

  return <div ref={containerRef} className="w-full h-full" />;
}
