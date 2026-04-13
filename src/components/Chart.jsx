import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';

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

export default function Chart({ data, liveBar, scalpLevels = null, measureMode = false, onMeasureEnd }) {
  const containerRef = useRef();
  const chartRef = useRef();
  const candleRef = useRef();
  const volumeRef = useRef();
  const priceLinesRef = useRef([]);

  // Measure tool state
  const overlayRef = useRef(null);
  const measureState = useRef({ active: false, startX: 0, startY: 0, startPrice: 0, startTime: 0 });
  const [measureData, setMeasureData] = useState(null);

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
      chart.remove();
    };
  }, [data]);

  // SL/TP price lines
  useEffect(() => {
    if (!candleRef.current) return;

    priceLinesRef.current.forEach(line => {
      try { candleRef.current.removePriceLine(line); } catch { /* ignore */ }
    });
    priceLinesRef.current = [];

    if (!scalpLevels) return;

    const { entry, tp, sl, side } = scalpLevels;
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

    if (tp != null) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: tp,
        color: CHART_COLORS.candleUp,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP $${tp.toFixed(2)}`,
      }));
    }

    if (sl != null) {
      priceLinesRef.current.push(candleRef.current.createPriceLine({
        price: sl,
        color: CHART_COLORS.candleDown,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL $${sl.toFixed(2)}`,
      }));
    }
  }, [scalpLevels, data]);

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
      {/* Measure overlay canvas — sits on top of chart */}
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full z-10"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
