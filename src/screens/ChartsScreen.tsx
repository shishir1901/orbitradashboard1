/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { TelemetryPacket } from '../types/telemetry';

type ChannelCategory = 'ENV' | 'ACCEL' | 'GYRO' | 'POWER' | 'RF';

interface ChartSeriesConfig {
  key: string;
  label: string;
  title: string;
  color: string;
  unit: string;
  gradientId: string;
}

export function ChartsScreen() {
  const { history, currentPacket, isStreaming, toggleStreaming, exportCsv } = useTelemetry();
  const [category, setCategory] = useState<ChannelCategory>('ENV');
  const [timeWindowSec, setTimeWindowSec] = useState<number>(60);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter history based on time window
  const windowedHistory = useMemo(() => {
    const count = Math.min(history.length, timeWindowSec);
    return history.slice(-count);
  }, [history, timeWindowSec]);

  // Series definitions depending on category
  // For ENV: Temperature (#FF9F1C), Humidity (#00E5FF), Altitude AGL (#00FF9C)
  const seriesConfig: ChartSeriesConfig[] = useMemo(() => {
    switch (category) {
      case 'ENV':
        return [
          {
            key: 'temp',
            label: 'Temperature',
            title: 'TEMPERATURE',
            color: '#FF9F1C',
            unit: '°C',
            gradientId: 'grad-temp',
          },
          {
            key: 'hum',
            label: 'Humidity',
            title: 'HUMIDITY',
            color: '#00E5FF',
            unit: '%',
            gradientId: 'grad-hum',
          },
          {
            key: 'altAgl',
            label: 'Altitude AGL',
            title: 'ALTITUDE AGL',
            color: '#00FF9C',
            unit: 'm',
            gradientId: 'grad-alt',
          },
        ];
      case 'ACCEL':
        return [
          {
            key: 'accel.x',
            label: 'Accel X',
            title: 'ACCEL X',
            color: '#00E5FF',
            unit: 'm/s²',
            gradientId: 'grad-ax',
          },
          {
            key: 'accel.y',
            label: 'Accel Y',
            title: 'ACCEL Y',
            color: '#DEB7FF',
            unit: 'm/s²',
            gradientId: 'grad-ay',
          },
          {
            key: 'accel.z',
            label: 'Accel Z',
            title: 'ACCEL Z',
            color: '#00FF9C',
            unit: 'm/s²',
            gradientId: 'grad-az',
          },
        ];
      case 'GYRO':
        return [
          {
            key: 'gyro.x',
            label: 'Gyro X',
            title: 'GYRO X',
            color: '#00E5FF',
            unit: '°/s',
            gradientId: 'grad-gx',
          },
          {
            key: 'gyro.y',
            label: 'Gyro Y',
            title: 'GYRO Y',
            color: '#DEB7FF',
            unit: '°/s',
            gradientId: 'grad-gy',
          },
          {
            key: 'gyro.z',
            label: 'Gyro Z',
            title: 'GYRO Z',
            color: '#00FF9C',
            unit: '°/s',
            gradientId: 'grad-gz',
          },
        ];
      case 'POWER':
        return [
          {
            key: 'eps.voltage',
            label: 'Bus Voltage',
            title: 'BUS VOLTAGE',
            color: '#00E5FF',
            unit: 'V',
            gradientId: 'grad-volt',
          },
          {
            key: 'eps.soc',
            label: 'State of Charge',
            title: 'STATE OF CHARGE',
            color: '#00FF9C',
            unit: '%',
            gradientId: 'grad-soc',
          },
        ];
      case 'RF':
        return [
          {
            key: 'link.rssi',
            label: 'RSSI',
            title: 'RSSI SIGNAL',
            color: '#00E5FF',
            unit: 'dBm',
            gradientId: 'grad-rssi',
          },
          {
            key: 'link.rtt',
            label: 'RTT Latency',
            title: 'RTT LATENCY',
            color: '#DEB7FF',
            unit: 'ms',
            gradientId: 'grad-rtt',
          },
        ];
    }
  }, [category]);

  // Helper to extract nested key value
  const getValue = (pkt: TelemetryPacket, key: string): number => {
    if (key.includes('.')) {
      const parts = key.split('.');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let obj: any = pkt;
      for (const p of parts) obj = obj?.[p];
      return typeof obj === 'number' ? obj : 0;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (pkt as any)[key] === 'number' ? (pkt as any)[key] : 0;
  };

  // Channel statistics (min, max, avg, current) for the summary table
  const stats = useMemo(() => {
    return seriesConfig.map((s) => {
      const values = windowedHistory.map((pkt) => getValue(pkt, s.key));
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const current = values.length ? values[values.length - 1] : 0;
      return {
        ...s,
        min,
        max,
        avg,
        current,
      };
    });
  }, [windowedHistory, seriesConfig]);

  const activeHoverPacket =
    hoverIndex !== null && windowedHistory[hoverIndex] ? windowedHistory[hoverIndex] : null;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 gap-4 pb-20">
      {/* Charts Header */}
      <div className="space-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE]">
            <span className="material-symbols-outlined text-[18px]">monitoring</span>
          </div>
          <div>
            <span className="font-mono text-[12px] uppercase tracking-wider text-white font-bold block">
              LIVE TELEMETRY CHARTS
            </span>
            <span className="font-mono text-[10px] text-[#8B9BB4] tracking-wider">
              MULTI-CHANNEL WAVEFORMS & INDEPENDENT Y-AXES
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleStreaming}
            className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold border transition-all ${
              isStreaming
                ? 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]'
                : 'bg-[#F43F5E]/15 border-[#F43F5E]/30 text-[#F43F5E]'
            }`}
          >
            {isStreaming ? 'STREAMING' : 'PAUSED'}
          </button>
        </div>
      </div>

      {/* Category Pills & Time Window Selector */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
        <div className="flex gap-1 bg-[#111A2B] p-1 rounded-lg border border-[#1E2A3F]">
          {(['ENV', 'ACCEL', 'GYRO', 'POWER', 'RF'] as ChannelCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setHoverIndex(null);
              }}
              className={`font-mono text-[10px] px-3 py-1 rounded font-bold transition-all ${
                category === cat
                  ? 'bg-[#22D3EE] text-[#0A1020] shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                  : 'text-[#8B9BB4] hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-[#111A2B] p-1 rounded-lg border border-[#1E2A3F]">
          {[30, 60, 180, 300].map((sec) => (
            <button
              key={sec}
              onClick={() => setTimeWindowSec(sec)}
              className={`font-mono text-[10px] px-2.5 py-1 rounded font-semibold transition-all ${
                timeWindowSec === sec
                  ? 'bg-[#A78BFA] text-[#0A1020] font-bold'
                  : 'text-[#8B9BB4] hover:text-white'
              }`}
            >
              {sec < 60 ? `${sec}s` : `${sec / 60}m`}
            </button>
          ))}
        </div>
      </div>

      {/* Time Window Notice */}
      <div className="flex items-center justify-between px-1 text-xs font-mono">
        <span className="text-[#8B9BB4] text-[10px]">
          X-AXIS (TIME): <strong className="text-white">{timeWindowSec}s WINDOW</strong>
        </span>
        <span className="text-[#8B9BB4] text-[10px]">
          SAMPLES: <strong className="text-[#22D3EE]">{windowedHistory.length} PTS</strong>
        </span>
      </div>

      {/* STACKED INDIVIDUAL CHARTS: 3 separate charts for ENV stacked vertically */}
      <div className="flex flex-col gap-3">
        {seriesConfig.map((series) => {
          const values = windowedHistory.map((pkt) => getValue(pkt, series.key));
          const currentVal = values.length > 0 ? values[values.length - 1] : 0;

          // Auto-fit Y-axis bounds
          let minVal = values.length > 0 ? Math.min(...values) : 0;
          let maxVal = values.length > 0 ? Math.max(...values) : 10;
          if (minVal === maxVal) {
            minVal -= 0.5;
            maxVal += 0.5;
          } else {
            const span = maxVal - minVal;
            const pad = span * 0.15;
            minVal -= pad;
            maxVal += pad;
          }
          const midVal = (minVal + maxVal) / 2;

          // SVG coordinate calculations (viewBox 0 0 500 80)
          const svgW = 500;
          const svgH = 80;

          let linePath = '';
          let areaPath = '';

          if (windowedHistory.length >= 2) {
            const points = windowedHistory.map((pkt, idx) => {
              const x = (idx / (windowedHistory.length - 1)) * svgW;
              const v = getValue(pkt, series.key);
              const normalized = (v - minVal) / (maxVal - minVal);
              const y = svgH - normalized * svgH;
              return { x, y };
            });

            linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            const firstX = points[0].x.toFixed(1);
            const lastX = points[points.length - 1].x.toFixed(1);
            areaPath = `${linePath} L ${lastX},${svgH} L ${firstX},${svgH} Z`;
          }

          const hoverVal =
            activeHoverPacket !== null ? getValue(activeHoverPacket, series.key) : null;

          return (
            <div
              key={series.key}
              className="space-card flex flex-col justify-between h-[140px] relative overflow-hidden p-3"
            >
              {/* Top Header of Individual Chart: Title, Dot, Unit (Left) & Current Value (Right) */}
              <div className="flex items-center justify-between pb-1 z-10">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: series.color,
                      boxShadow: `0 0 8px ${series.color}`,
                    }}
                  />
                  <span className="font-mono text-[11px] font-bold text-white tracking-wider">
                    {series.title}
                  </span>
                  <span className="font-mono text-[10px] text-[#8B9BB4]">({series.unit})</span>
                </div>

                {/* Current Value readout at top right */}
                <div className="flex items-baseline gap-1 font-mono">
                  {hoverVal !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-[9px] text-[#8B9BB4] uppercase">INSPECT:</span>
                      <span
                        className="text-[15px] font-bold"
                        style={{ color: series.color }}
                      >
                        {hoverVal.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-[#8B9BB4]">{series.unit}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-[16px] font-light text-white tracking-tight"
                        style={{ color: series.color }}
                      >
                        {currentVal.toFixed(1)}
                      </span>
                      <span className="text-[11px] text-[#8B9BB4] font-normal">{series.unit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chart Body with Left Y-Axis Labels & SVG Waveform */}
              <div
                className="relative flex-1 w-full flex items-center bg-[#0A1020] rounded-lg overflow-hidden border border-[#1E2A3F] cursor-crosshair tech-grid-dense"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const idx = Math.round((x / rect.width) * (windowedHistory.length - 1));
                  setHoverIndex(Math.max(0, Math.min(windowedHistory.length - 1, idx)));
                }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                {/* Left Y-Axis Scale Labels (Max, Middle, Min) */}
                <div className="absolute left-1.5 inset-y-1 flex flex-col justify-between pointer-events-none z-10 font-mono text-[9px] text-[#8B9BB4] select-none">
                  <span className="leading-none">{maxVal.toFixed(1)}</span>
                  <span className="leading-none opacity-60">{midVal.toFixed(1)}</span>
                  <span className="leading-none">{minVal.toFixed(1)}</span>
                </div>

                {/* Faint Horizontal Guide Lines */}
                <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-[#22D3EE]/30 w-full" />
                  <div className="border-b border-dashed border-[#22D3EE]/40 w-full" />
                  <div className="border-t border-[#22D3EE]/30 w-full" />
                </div>

                {/* SVG Line with Soft Glow Area */}
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={series.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={series.color} stopOpacity="0.25" />
                      <stop offset="85%" stopColor={series.color} stopOpacity="0.03" />
                      <stop offset="100%" stopColor={series.color} stopOpacity="0" />
                    </linearGradient>
                    <filter id={`glow-${series.gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={series.color} floodOpacity="0.6" />
                    </filter>
                  </defs>

                  {/* Soft Glow Area Fill */}
                  {areaPath && (
                    <path d={areaPath} fill={`url(#${series.gradientId})`} />
                  )}

                  {/* Line Stroke with Soft Glow */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={`url(#glow-${series.gradientId})`}
                    />
                  )}

                  {/* Synchronized Hover Cursor Line */}
                  {hoverIndex !== null && windowedHistory.length > 1 && (
                    <line
                      x1={(hoverIndex / (windowedHistory.length - 1)) * svgW}
                      y1="0"
                      x2={(hoverIndex / (windowedHistory.length - 1)) * svgW}
                      y2={svgH}
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      opacity="0.85"
                    />
                  )}
                </svg>

                {windowedHistory.length < 2 && (
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-[#8B9BB4]/60 pointer-events-none">
                    {windowedHistory.length === 0 ? 'Awaiting telemetry packets...' : '1 sample received (streaming...)'}
                  </div>
                )}

                {/* Hover Tooltip Timestamp Tag */}
                {hoverIndex !== null && activeHoverPacket && (
                  <div
                    className="absolute bottom-1 bg-[#111A2B] px-1.5 py-0.5 rounded border border-[#1E2A3F] pointer-events-none font-mono text-[8px] text-[#22D3EE] z-20"
                    style={{
                      left: `${Math.min(80, Math.max(10, (hoverIndex / (windowedHistory.length - 1)) * 100))}%`,
                    }}
                  >
                    {new Date(activeHoverPacket.timestamp).toISOString().substring(14, 19)}Z
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics Table (Current, Min, Max, Avg) */}
      <div className="space-card flex flex-col gap-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#1E2A3F]">
          <span className="font-mono text-[10px] text-[#8B9BB4] uppercase font-bold tracking-wider">
            TELEMETRY METRICS SUMMARY ({category} BANDS)
          </span>
          <span className="font-mono text-[10px] text-[#22D3EE]">
            {windowedHistory.length} SAMPLES
          </span>
        </div>

        <div className="grid grid-cols-5 text-center font-mono text-[9px] text-[#8B9BB4] pt-1 pb-1 border-b border-[#1E2A3F]/50 uppercase font-semibold">
          <span className="text-left pl-1">CHANNEL</span>
          <span>CURRENT</span>
          <span>MIN</span>
          <span>MAX</span>
          <span>AVG</span>
        </div>

        <div className="flex flex-col divide-y divide-[#1E2A3F]/40">
          {stats.map((st) => (
            <div key={st.key} className="grid grid-cols-5 text-center font-mono text-[11px] py-1.5 items-center">
              <span className="text-left pl-1 font-semibold truncate" style={{ color: st.color }}>
                {st.label}
              </span>
              <span className="text-white font-bold">
                {st.current.toFixed(1)} {st.unit}
              </span>
              <span className="text-[#8B9BB4]">{st.min.toFixed(1)}</span>
              <span className="text-[#8B9BB4]">{st.max.toFixed(1)}</span>
              <span className="text-[#22D3EE]">{st.avg.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CSV Export & Actions */}
      <div className="flex gap-2">
        <button
          onClick={exportCsv}
          className="flex-1 bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] py-2.5 rounded-xl text-[#22D3EE] font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">file_download</span>
          <span>EXPORT CSV TELEMETRY STREAM</span>
        </button>
      </div>
    </div>
  );
}
