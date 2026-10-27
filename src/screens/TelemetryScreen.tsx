/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

export function TelemetryScreen() {
  const {
    currentPacket,
    history,
    isConnected,
    isStreaming,
    mode,
    setMode,
    toggleStreaming,
    toggleConnection,
    calibrateZero,
    ackAlerts,
    clearBuffer,
    exportCsv,
    isCalibrating,
    alertsAcknowledged,
  } = useTelemetry();

  const [utcTime, setUtcTime] = useState<string>('00:00:00 UTC');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toISOString().substring(11, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute SVG sparkline points from history for Temperature
  const sparklinePoints = useMemo(() => {
    const recent = history.slice(-15);
    if (recent.length < 2) {
      return '0,18 15,16 30,19 45,12 60,14 75,9 90,11 100,7';
    }
    const min = 24.5;
    const max = 28.5;
    const pts = recent.map((item, idx) => {
      const x = (idx / (recent.length - 1)) * 100;
      const normalized = Math.max(0, Math.min(1, (item.temp - min) / (max - min)));
      const y = 22 - normalized * 18;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return pts.join(' ');
  }, [history]);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 gap-4 pb-20">
      {/* Mission ID & Status Banner */}
      <div className="space-card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE] shrink-0">
              <span className="material-symbols-outlined text-[20px]">satellite_alt</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[16px] text-white font-bold tracking-wide">
                  COSMIC-1 (ORBITRA-2026)
                </span>
                <span className="font-mono text-[10px] text-[#22D3EE] bg-[#22D3EE]/10 border border-[#22D3EE]/30 px-1.5 py-0.5 rounded">
                  LEO
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#8B9BB4] tracking-wider uppercase">
                MMMUT AVIONICS LAB • GORAKHPUR GROUND STATION
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#34D399]/10 border border-[#34D399]/30 px-3 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_6px_#34D399]" />
            <span className="font-mono text-[10px] text-[#34D399] font-bold tracking-wider">
              NOMINAL ORBIT
            </span>
          </div>
        </div>

        {/* Port Connection Control Bar */}
        <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8B9BB4] text-[16px]">usb</span>
              <span className="font-mono text-[11px] text-[#22D3EE] font-medium">/dev/ttyUSB0</span>
              <span className="font-mono text-[10px] text-[#8B9BB4]">(ESP32 GS)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex bg-[#111A2B] p-0.5 rounded-lg border border-[#1E2A3F]">
                <button
                  onClick={() => setMode('LIVE')}
                  className={`font-mono text-[10px] px-2.5 py-1 rounded font-semibold transition-all ${
                    mode === 'LIVE'
                      ? 'bg-[#22D3EE] text-[#0A1020]'
                      : 'text-[#8B9BB4] hover:text-white'
                  }`}
                >
                  LIVE HW
                </button>
                <button
                  onClick={() => setMode('SIM')}
                  className={`font-mono text-[10px] px-2.5 py-1 rounded font-semibold transition-all ${
                    mode === 'SIM'
                      ? 'bg-[#22D3EE] text-[#0A1020]'
                      : 'text-[#8B9BB4] hover:text-white'
                  }`}
                >
                  DEMO SIM
                </button>
              </div>

              <button
                onClick={toggleConnection}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-[11px] font-bold transition-all ${
                  isConnected
                    ? 'bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020] shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                    : 'bg-[#F43F5E] hover:bg-[#E11D48] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {isConnected ? 'sensors' : 'sensors_off'}
                </span>
                <span>{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
              </button>
            </div>
          </div>

          {/* Micro Telemetry Pills */}
          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono">
            <div className="bg-[#111A2B] border border-[#1E2A3F] rounded py-1.5 px-1">
              <span className="text-[9px] text-[#8B9BB4] block">PKTS</span>
              <span className="text-[12px] text-white font-bold">{currentPacket.packetId.toLocaleString()}</span>
            </div>
            <div className="bg-[#111A2B] border border-[#1E2A3F] rounded py-1.5 px-1">
              <span className="text-[9px] text-[#8B9BB4] block">DROP</span>
              <span className="text-[12px] text-[#34D399] font-bold">{currentPacket.link.dropCount}</span>
            </div>
            <div className="bg-[#111A2B] border border-[#1E2A3F] rounded py-1.5 px-1">
              <span className="text-[9px] text-[#8B9BB4] block">RATE</span>
              <span className="text-[12px] text-white font-bold">{currentPacket.link.rateHz.toFixed(1)} Hz</span>
            </div>
            <div className="bg-[#111A2B] border border-[#1E2A3F] rounded py-1.5 px-1">
              <span className="text-[9px] text-[#8B9BB4] block">RSSI</span>
              <span className="text-[12px] text-[#22D3EE] font-bold">{currentPacket.link.rssi} dBm</span>
            </div>
            <div className="bg-[#111A2B] border border-[#1E2A3F] rounded py-1.5 px-1">
              <span className="text-[9px] text-[#8B9BB4] block">RTT</span>
              <span className="text-[12px] text-[#34D399] font-bold">{currentPacket.link.rtt}ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Environmental Telemetry */}
      <div className="space-card flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#1E2A3F]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#22D3EE] text-[18px]">thermostat</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
              ENVIRONMENTAL AVIONICS [DHT11 • BMP280]
            </span>
          </div>
          <span className="font-mono text-[9px] bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 px-2 py-0.5 rounded-full font-medium">
            CALIBRATED
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Temperature */}
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-[#8B9BB4]">TEMP (DHT11)</span>
              <span className="font-mono text-[9px] text-[#34D399]">15°-35°</span>
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="font-mono text-[38px] font-light text-white leading-none">
                {currentPacket.temp.toFixed(1)}
              </span>
              <span className="text-[#8B9BB4] text-sm">°C</span>
            </div>
            <div className="w-full h-5">
              <svg className="w-full h-full text-[#22D3EE]" fill="none" viewBox="0 0 100 24">
                <path d={`M ${sparklinePoints}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-[#8B9BB4]">HUMIDITY</span>
              <span className="font-mono text-[9px] text-[#22D3EE]">RH %</span>
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="font-mono text-[38px] font-light text-white leading-none">
                {currentPacket.hum.toFixed(1)}
              </span>
              <span className="text-[#8B9BB4] text-sm">%</span>
            </div>
            <div className="w-full bg-[#111A2B] h-1.5 rounded-full overflow-hidden border border-[#1E2A3F]">
              <div
                className="h-full bg-[#22D3EE] rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(5, currentPacket.hum))}%` }}
              />
            </div>
          </div>

          {/* Pressure (Soft Purple #A78BFA) */}
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-[#8B9BB4]">PRESSURE</span>
              <span className="font-mono text-[9px] text-[#A78BFA] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px]">trending_up</span>+0.2
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="font-mono text-[38px] font-light text-white leading-none">
                {currentPacket.press.toFixed(1)}
              </span>
              <span className="text-[#A78BFA] text-sm">hPa</span>
            </div>
            <span className="font-mono text-[9px] text-[#8B9BB4]">BMP280 MSL STABLE</span>
          </div>

          {/* Altitude AGL */}
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="font-mono text-[10px] text-[#8B9BB4]">EST. ALT (AGL)</span>
              <span className="material-symbols-outlined text-[#8B9BB4] text-[13px]">height</span>
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="font-mono text-[38px] font-light text-white leading-none">
                {currentPacket.altAgl.toFixed(1)}
              </span>
              <span className="text-[#34D399] text-sm">m</span>
            </div>
            <span className="font-mono text-[9px] text-[#8B9BB4]">REL LAUNCH DATUM</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Inertial IMU (MPU6050) */}
      <div className="space-card flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#1E2A3F]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#A78BFA] text-[18px]">screen_rotation</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
              INERTIAL IMU [MPU6050]
            </span>
          </div>
          <span className="font-mono text-[9px] bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 px-2 py-0.5 rounded-full font-medium">
            STATIONARY
          </span>
        </div>

        {/* 3-Axis Acceleration Bars */}
        <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col gap-2 font-mono">
          <div className="flex justify-between items-center text-[10px] text-[#8B9BB4]">
            <span>3-AXIS ACCELERATION (m/s²)</span>
            <span className="text-white font-medium">1G REF (+9.81 Z)</span>
          </div>

          {/* X Axis */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8B9BB4] w-4">X</span>
            <div className="flex-1 bg-[#111A2B] h-2 rounded-sm overflow-hidden flex border border-[#1E2A3F]">
              <div className="w-1/2 flex justify-end">
                <div
                  className="h-full bg-[#22D3EE]"
                  style={{ width: `${Math.min(100, Math.abs(currentPacket.accel.x) * 12)}%` }}
                />
              </div>
              <div className="w-1/2" />
            </div>
            <span className="w-16 text-right font-bold text-white">
              {currentPacket.accel.x >= 0 ? `+${currentPacket.accel.x.toFixed(2)}` : currentPacket.accel.x.toFixed(2)}
            </span>
          </div>

          {/* Y Axis */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8B9BB4] w-4">Y</span>
            <div className="flex-1 bg-[#111A2B] h-2 rounded-sm overflow-hidden flex border border-[#1E2A3F]">
              <div className="w-1/2 flex justify-end">
                <div
                  className="h-full bg-[#A78BFA]"
                  style={{ width: `${Math.min(100, Math.abs(currentPacket.accel.y) * 12)}%` }}
                />
              </div>
              <div className="w-1/2" />
            </div>
            <span className="w-16 text-right font-bold text-white">
              {currentPacket.accel.y >= 0 ? `+${currentPacket.accel.y.toFixed(2)}` : currentPacket.accel.y.toFixed(2)}
            </span>
          </div>

          {/* Z Axis */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-[#8B9BB4] w-4">Z</span>
            <div className="flex-1 bg-[#111A2B] h-2 rounded-sm overflow-hidden flex border border-[#1E2A3F]">
              <div className="w-1/2" />
              <div className="w-1/2 flex justify-start">
                <div
                  className="h-full bg-[#34D399]"
                  style={{ width: `${Math.min(100, (currentPacket.accel.z / 10) * 100)}%` }}
                />
              </div>
            </div>
            <span className="w-16 text-right font-bold text-[#34D399]">
              {currentPacket.accel.z >= 0 ? `+${currentPacket.accel.z.toFixed(2)}` : currentPacket.accel.z.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Gyro Velocity Row */}
        <div className="grid grid-cols-3 gap-2 font-mono">
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-2.5 text-center">
            <span className="text-[9px] text-[#8B9BB4] block">GYRO X</span>
            <span className="text-[13px] text-white font-bold">
              {currentPacket.gyro.x >= 0 ? `+${currentPacket.gyro.x.toFixed(2)}` : currentPacket.gyro.x.toFixed(2)}°/s
            </span>
          </div>
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-2.5 text-center">
            <span className="text-[9px] text-[#8B9BB4] block">GYRO Y</span>
            <span className="text-[13px] text-white font-bold">
              {currentPacket.gyro.y >= 0 ? `+${currentPacket.gyro.y.toFixed(2)}` : currentPacket.gyro.y.toFixed(2)}°/s
            </span>
          </div>
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-2.5 text-center">
            <span className="text-[9px] text-[#8B9BB4] block">GYRO Z</span>
            <span className="text-[13px] text-white font-bold">
              {currentPacket.gyro.z >= 0 ? `+${currentPacket.gyro.z.toFixed(2)}` : currentPacket.gyro.z.toFixed(2)}°/s
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={calibrateZero}
            disabled={isCalibrating}
            className="flex-1 bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020] py-2 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <span className={`material-symbols-outlined text-[15px] ${isCalibrating ? 'animate-spin' : ''}`}>
              adjust
            </span>
            <span>{isCalibrating ? 'CALIBRATING...' : 'CALIBRATE ZERO'}</span>
          </button>
          <button
            onClick={ackAlerts}
            className="flex-1 bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white py-2 rounded-lg font-mono text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">check_circle</span>
            <span>{alertsAcknowledged ? 'ALERTS CLEARED' : 'ACK ALERTS'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Power Bus & System Health */}
      <div className="space-card flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1 border-b border-[#1E2A3F]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#34D399] text-[18px]">bolt</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
              EPS & SYSTEM HEALTH [1S LiPo]
            </span>
          </div>
          <span className="font-mono text-[9px] text-[#34D399] font-medium">STATE: CHARGED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start font-mono text-[10px]">
              <span className="text-[#8B9BB4]">BUS VOLTAGE</span>
              <span className="text-[#34D399] font-bold">{currentPacket.eps.soc}%</span>
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="font-mono text-[38px] font-light text-white leading-none">
                {currentPacket.eps.voltage.toFixed(2)}
              </span>
              <span className="text-[#8B9BB4] text-sm font-normal">V</span>
            </div>
            <div className="flex gap-1 h-2">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-sm ${
                    currentPacket.eps.soc >= idx * 18 ? 'bg-[#34D399]' : 'bg-[#1E2A3F]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start font-mono text-[10px]">
              <span className="text-[#8B9BB4]">FREE HEAP (ESP32)</span>
              <span className="material-symbols-outlined text-[14px] text-[#8B9BB4]">memory</span>
            </div>
            <div className="flex items-baseline gap-1.5 my-2">
              <span className="font-mono text-[38px] font-light text-white leading-none">
                {currentPacket.eps.freeHeap}
              </span>
              <span className="text-[#8B9BB4] text-sm font-normal">KB</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8B9BB4]">
              <span>CPU CORE TEMP</span>
              <span className="text-white font-medium">{currentPacket.eps.cpuTemp.toFixed(1)}°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={toggleStreaming}
          className="bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] text-[#22D3EE]">
            {isStreaming ? 'pause_circle' : 'play_circle'}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase">
            {isStreaming ? 'PAUSE FEED' : 'RESUME FEED'}
          </span>
        </button>

        <button
          onClick={exportCsv}
          className="bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-white p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px] text-[#22D3EE]">download</span>
          <span className="font-mono text-[10px] font-semibold uppercase">EXPORT CSV</span>
        </button>

        <button
          onClick={clearBuffer}
          className="bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border border-[#F43F5E]/30 p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">layers_clear</span>
          <span className="font-mono text-[10px] font-semibold uppercase">CLEAR BUF</span>
        </button>
      </div>
    </div>
  );
}
