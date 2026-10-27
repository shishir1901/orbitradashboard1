/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

interface SatellitePass {
  id: string;
  passType: 'HIGH ELEVATION' | 'MEDIUM' | 'GRAZING';
  aos: string;
  los: string;
  countdown: string;
  maxEl: number;
  duration: string;
  doppler: string;
}

export function OrbitScreen() {
  const { currentPacket, mode, liveFieldsPresent } = useTelemetry();
  const [subSat, setSubSat] = useState({ lat: 26.73, lng: 83.43 });
  const [orbitTime, setOrbitTime] = useState(0);

  // When live GNSS telemetry is present, track actual coordinates
  useEffect(() => {
    if (mode === 'LIVE' && liveFieldsPresent.gnss) {
      setSubSat({
        lat: currentPacket.gnss.lat,
        lng: currentPacket.gnss.lng,
      });
      return;
    }

    // Otherwise animate satellite position along 51.6° inclination LEO ground track (simulation)
    const timer = setInterval(() => {
      setOrbitTime((t) => t + 1);
      // Orbit model: period = 92.8 minutes
      const t = Date.now() / 1000;
      const period = 5568; // 92.8 min in seconds
      const phase = (t % period) / period;
      const incRad = (51.64 * Math.PI) / 180;
      const lat = Math.sin(phase * Math.PI * 2) * (incRad * (180 / Math.PI));
      const earthRotationSpeed = 360 / 86400; // deg/sec
      const rawLng = (phase * 360 - t * earthRotationSpeed + 83.43) % 360;
      const lng = rawLng > 180 ? rawLng - 360 : rawLng < -180 ? rawLng + 360 : rawLng;

      setSubSat({
        lat: parseFloat(lat.toFixed(4)),
        lng: parseFloat(lng.toFixed(4)),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, liveFieldsPresent.gnss, currentPacket.gnss.lat, currentPacket.gnss.lng]);

  const passes: SatellitePass[] = [
    {
      id: 'pass-1',
      passType: 'HIGH ELEVATION',
      aos: '16:21:40Z',
      los: '16:31:12Z',
      countdown: '23m 41s',
      maxEl: 68,
      duration: '9m 32s',
      doppler: '+3.4 kHz -> -3.4 kHz',
    },
    {
      id: 'pass-2',
      passType: 'MEDIUM',
      aos: '17:54:15Z',
      los: '18:01:45Z',
      countdown: '1h 56m',
      maxEl: 34,
      duration: '7m 30s',
      doppler: '+2.1 kHz -> -2.1 kHz',
    },
    {
      id: 'pass-3',
      passType: 'GRAZING',
      aos: '19:28:02Z',
      los: '19:33:10Z',
      countdown: '3h 30m',
      maxEl: 12,
      duration: '5m 08s',
      doppler: '+1.2 kHz -> -1.2 kHz',
    },
  ];

  // 8 Tracked GNSS Satellites
  const gnssSats = [
    { prn: '04', az: 42, el: 68, snr: 44, type: 'GPS' },
    { prn: '09', az: 118, el: 52, snr: 41, type: 'GPS' },
    { prn: '11', az: 210, el: 38, snr: 37, type: 'NavIC' },
    { prn: '16', az: 285, el: 74, snr: 46, type: 'GPS' },
    { prn: '20', az: 330, el: 22, snr: 34, type: 'GLO' },
    { prn: '26', az: 165, el: 45, snr: 39, type: 'NavIC' },
    { prn: '29', az: 85, el: 60, snr: 43, type: 'GPS' },
    { prn: '31', az: 195, el: 29, snr: 36, type: 'GPS' },
  ];

  // Convert lat/lng to SVG map coordinates (width: 500, height: 250)
  const mapWidth = 500;
  const mapHeight = 250;
  const satX = ((subSat.lng + 180) / 360) * mapWidth;
  const satY = ((90 - subSat.lat) / 180) * mapHeight;

  // Ground station MMMUT Gorakhpur
  const gsX = ((83.4331 + 180) / 360) * mapWidth;
  const gsY = ((90 - 26.7314) / 180) * mapHeight;

  // Generate ground track sine curve points
  const groundTrackPoints = React.useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 360; i += 6) {
      const rad = (i * Math.PI) / 180;
      const lat = Math.sin(rad) * 51.64;
      const x = (i / 360) * mapWidth;
      const y = ((90 - lat) / 180) * mapHeight;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' L ');
  }, []);

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 gap-4 pb-20">
      {/* Orbit Screen Header */}
      <div className="space-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE]">
            <span className="material-symbols-outlined text-[18px]">satellite_alt</span>
          </div>
          <div>
            <span className="font-mono text-[12px] uppercase tracking-wider text-white font-bold block">
              ORBIT GPS & GROUND TRACK
            </span>
            <span className="font-mono text-[10px] text-[#8B9BB4] tracking-wider">
              COSMIC-1 LEO EPHEMERIS • GORAKHPUR GROUND HORIZON
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-[#34D399]/10 border border-[#34D399]/20 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
          <span className="font-mono text-[10px] text-[#34D399] font-medium">3D LOCK (8 SATS)</span>
        </div>
      </div>

      {/* World Map 2D Ground Track Viewport */}
      <div className="space-card flex flex-col gap-2 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[10px] text-[#8B9BB4] uppercase tracking-wider font-semibold">
            MERCATOR ORBITAL PROJECTION
          </span>
          <span className="text-[10px] text-[#22D3EE] font-bold">
            SPD: 27,620 km/h (7.67 km/s)
          </span>
        </div>

        {/* 2D Map Canvas */}
        <div className="relative w-full h-64 bg-[#0A1020] rounded-lg overflow-hidden border border-[#1E2A3F] tech-grid">
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${mapWidth} ${mapHeight}`}
            preserveAspectRatio="none"
          >
            {/* Equator & Tropics */}
            <line x1="0" y1={mapHeight / 2} x2={mapWidth} y2={mapHeight / 2} stroke="#22D3EE" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <line x1="0" y1={mapHeight * 0.36} x2={mapWidth} y2={mapHeight * 0.36} stroke="#8B9BB4" strokeWidth="0.3" strokeDasharray="2 2" opacity="0.2" />
            <line x1="0" y1={mapHeight * 0.64} x2={mapWidth} y2={mapHeight * 0.64} stroke="#8B9BB4" strokeWidth="0.3" strokeDasharray="2 2" opacity="0.2" />

            {/* Continents Outline */}
            <path
              d="M 280,45 L 360,50 L 380,85 L 360,110 L 330,135 L 315,115 L 290,95 L 270,70 Z"
              fill="rgba(34, 211, 238, 0.04)"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="0.8"
            />
            <path
              d="M 90,40 L 150,55 L 140,95 L 115,115 L 125,160 L 140,210 L 115,170 L 95,120 L 70,60 Z"
              fill="rgba(34, 211, 238, 0.04)"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="0.8"
            />
            <path
              d="M 220,90 L 260,95 L 275,130 L 250,180 L 225,140 L 205,105 Z"
              fill="rgba(34, 211, 238, 0.04)"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="0.8"
            />

            {/* Sinusoidal Ground Track */}
            <path
              d={`M ${groundTrackPoints}`}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              opacity="0.6"
            />

            {/* Ground Station Coverage Footprint */}
            <circle
              cx={gsX}
              cy={gsY}
              r="40"
              fill="rgba(52, 211, 153, 0.08)"
              stroke="#34D399"
              strokeWidth="1"
              strokeDasharray="3 2"
            />

            {/* GS Center Marker */}
            <circle cx={gsX} cy={gsY} r="3" fill="#34D399" />
            <text x={gsX + 6} y={gsY - 4} fill="#34D399" fontSize="8" fontFamily="monospace" fontWeight="bold">
              MMMUT GS
            </text>

            {/* Sub-Satellite Live Pin */}
            <g transform={`translate(${satX}, ${satY})`}>
              <circle r="8" fill="none" stroke="#22D3EE" strokeWidth="1" className="animate-ping" opacity="0.75" />
              <circle r="4" fill="#22D3EE" stroke="#ffffff" strokeWidth="1.5" />
              <text x="8" y="3" fill="#22D3EE" fontSize="9" fontFamily="monospace" fontWeight="bold">
                COSMIC-1
              </text>
            </g>
          </svg>

          {/* Bottom Coordinate Strip */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-[#111A2B]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1E2A3F] font-mono text-[10px]">
            <div>
              <span className="text-[#8B9BB4]">SUB-SAT: </span>
              <span className="text-[#22D3EE] font-bold">
                {subSat.lat >= 0 ? `${subSat.lat}° N` : `${Math.abs(subSat.lat)}° S`},{' '}
                {subSat.lng >= 0 ? `${subSat.lng}° E` : `${Math.abs(subSat.lng)}° W`}
              </span>
            </div>
            <div>
              <span className="text-[#8B9BB4]">ALT: </span>
              <span className="text-[#34D399] font-bold">420.4 km (LEO)</span>
            </div>
          </div>
        </div>

        {/* Keplerian Elements Matrix */}
        <div className="bg-[#0A1020] rounded-lg p-3 border border-[#1E2A3F]">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1E2A3F]">
            <span className="font-mono text-[10px] text-[#8B9BB4] uppercase font-bold">
              KEPLERIAN ORBITAL PARAMETERS
            </span>
            <span className="font-mono text-[10px] text-[#22D3EE]">NORAD #99999</span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-[11px]">
            <div>
              <span className="text-[#8B9BB4] text-[9px] block">INCLINATION</span>
              <span className="text-white font-bold">51.64°</span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[9px] block">PERIOD</span>
              <span className="text-white font-bold">92.8 min</span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[9px] block">ECCENTRICITY</span>
              <span className="text-white font-bold">0.00054</span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[9px] block">RAAN</span>
              <span className="text-white font-bold">182.45°</span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[9px] block">ARG PERIGEE</span>
              <span className="text-white font-bold">110.23°</span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[9px] block">MEAN ANOMALY</span>
              <span className="text-[#22D3EE] font-bold">249.91°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ground Station Upcoming Passes Schedule */}
      <div className="space-card flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-[#1E2A3F]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#34D399] text-[18px]">radar</span>
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
              UPCOMING OVERHEAD PASSES
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#8B9BB4]">ANTENNA: AZ/EL AUTO-TRACK</span>
        </div>

        <div className="flex flex-col gap-2">
          {passes.map((p) => (
            <div
              key={p.id}
              className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 flex items-center justify-between text-xs"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-bold text-white">
                    AOS: {p.aos}
                  </span>
                  <span className={`font-mono text-[9px] px-2 py-0.5 rounded font-semibold ${
                    p.passType === 'HIGH ELEVATION'
                      ? 'bg-[#34D399]/20 text-[#34D399]'
                      : 'bg-[#A78BFA]/20 text-[#A78BFA]'
                  }`}>
                    {p.maxEl}° MAX EL
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#8B9BB4] pt-0.5">
                  DOPPLER: {p.doppler}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-mono text-[13px] font-bold text-[#22D3EE]">
                  in {p.countdown}
                </span>
                <span className="font-mono text-[10px] text-[#8B9BB4]">
                  DUR: {p.duration}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GNSS Constellation 8-Sat Bar Signal Grid */}
      <div className="space-card flex flex-col gap-2.5">
        <div className="flex items-center justify-between pb-1 border-b border-[#1E2A3F]">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
            GNSS CONSTELLATION [NEO-6M SATS IN VIEW]
          </span>
          <span className="font-mono text-[10px] text-[#34D399] font-medium">HDOP: 0.92</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {gnssSats.map((sat) => (
            <div key={sat.prn} className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-2.5 flex flex-col gap-1">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-[#22D3EE] font-bold">#{sat.prn}</span>
                <span className="text-[#8B9BB4] text-[9px]">{sat.type}</span>
              </div>
              <div className="flex items-baseline justify-between font-mono text-[12px]">
                <span className="text-white font-medium">{sat.snr}</span>
                <span className="text-[#8B9BB4] text-[9px]">dB-Hz</span>
              </div>
              <div className="w-full bg-[#111A2B] h-1.5 rounded-full overflow-hidden border border-[#1E2A3F]">
                <div
                  className="h-full bg-[#34D399] rounded-full"
                  style={{ width: `${Math.min(100, (sat.snr / 50) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
