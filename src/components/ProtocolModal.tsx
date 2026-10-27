/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

interface ProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProtocolModal({ isOpen, onClose }: ProtocolModalProps) {
  const { injectTestPacket, isConnected, mode } = useTelemetry();
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleMinimal = '{"temperature_c":27.2,"humidity_pct":58,"pressure_hpa":1007.8}';
  const sampleFull = JSON.stringify(
    {
      packet_id: 1052,
      temperature_c: 27.2,
      humidity_pct: 58.0,
      pressure_hpa: 1007.8,
      altitude_m: 142.5,
      accel_x: 0.04,
      accel_y: -0.02,
      accel_z: 9.81,
      gyro_x: 0.15,
      gyro_y: -0.05,
      gyro_z: 0.02,
      pitch: 2.1,
      roll: -1.2,
      yaw: 44.0,
      latitude: 26.7314,
      longitude: 83.4331,
      satellites: 8,
      voltage: 3.84,
      battery_pct: 84,
      rssi: -65,
      free_heap: 182,
    },
    null,
    2
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTestInject = (json: string) => {
    injectTestPacket(json);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="space-card w-full max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-[#22D3EE]/30 shadow-[0_0_30px_rgba(34,211,238,0.15)]">
        {/* Header */}
        <div className="p-4 bg-[#0A1020] border-b border-[#1E2A3F] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#111A2B] border border-[#22D3EE]/30 flex items-center justify-center text-[#22D3EE]">
              <span className="material-symbols-outlined text-[19px]">data_object</span>
            </div>
            <div>
              <h3 className="font-mono text-[13px] uppercase font-bold text-white tracking-wider">
                ESP32 GROUND STATION JSON PROTOCOL
              </h3>
              <p className="font-mono text-[10px] text-[#8B9BB4]">
                Newline-delimited JSON • 115200 Baud • Web Serial API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#111A2B] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs font-mono">
          {/* Quick Info Box */}
          <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-3 text-[11px] leading-relaxed">
            <p className="text-white">
              The dashboard receives telemetry over <strong>USB Serial at 115200 baud</strong>. Your ground ESP32 should forward one complete JSON object per line ending with <code className="text-[#22D3EE] font-bold">\n</code>.
            </p>
            <p className="text-[#8B9BB4] mt-1">
              • Missing fields are preserved or marked empty — no synthetic values are invented in LIVE mode.
            </p>
          </div>

          {/* Section: Minimal Packet */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#22D3EE] uppercase">
                1. Minimal Sample Packet (DHT11 / BMP280)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestInject(sampleMinimal)}
                  className="bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 px-2 py-0.5 rounded text-[10px] font-bold active:scale-95 transition-all"
                >
                  TEST INJECT
                </button>
                <button
                  onClick={() => copyToClipboard(sampleMinimal, 'min')}
                  className="bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white px-2 py-0.5 rounded text-[10px]"
                >
                  {copied === 'min' ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>
            <pre className="bg-[#050811] p-2.5 rounded-lg border border-[#1E2A3F] text-[#34D399] overflow-x-auto text-[11px]">
              {sampleMinimal}
            </pre>
          </div>

          {/* Section: Supported Field Names Table */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#22D3EE] uppercase">
              2. Supported JSON Fields & Keys
            </span>
            <div className="border border-[#1E2A3F] rounded-lg overflow-hidden">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-[#0A1020] text-[#8B9BB4] border-b border-[#1E2A3F] uppercase">
                  <tr>
                    <th className="p-2">Sensor / Group</th>
                    <th className="p-2">Primary Key</th>
                    <th className="p-2">Accepted Aliases</th>
                    <th className="p-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A3F]/50 bg-[#0A1020]/50 text-white">
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Temperature</td>
                    <td className="p-2 text-[#34D399] font-bold">temperature_c</td>
                    <td className="p-2 text-[#8B9BB4]">temp_c, temp, temperature</td>
                    <td className="p-2 text-[#22D3EE]">°C</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Humidity</td>
                    <td className="p-2 text-[#34D399] font-bold">humidity_pct</td>
                    <td className="p-2 text-[#8B9BB4]">hum_pct, humidity, hum</td>
                    <td className="p-2 text-[#22D3EE]">%</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Pressure</td>
                    <td className="p-2 text-[#34D399] font-bold">pressure_hpa</td>
                    <td className="p-2 text-[#8B9BB4]">press_hpa, pressure, press</td>
                    <td className="p-2 text-[#22D3EE]">hPa</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Altitude</td>
                    <td className="p-2 text-[#34D399] font-bold">altitude_m</td>
                    <td className="p-2 text-[#8B9BB4]">altitude, alt_agl, alt</td>
                    <td className="p-2 text-[#22D3EE]">m</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">MPU6050 Accel</td>
                    <td className="p-2 text-[#34D399] font-bold">accel_x, accel_y, accel_z</td>
                    <td className="p-2 text-[#8B9BB4]">ax, ay, az</td>
                    <td className="p-2 text-[#22D3EE]">m/s²</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">MPU6050 Gyro</td>
                    <td className="p-2 text-[#34D399] font-bold">gyro_x, gyro_y, gyro_z</td>
                    <td className="p-2 text-[#8B9BB4]">gx, gy, gz</td>
                    <td className="p-2 text-[#22D3EE]">°/s</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Orientation</td>
                    <td className="p-2 text-[#34D399] font-bold">pitch, roll, yaw</td>
                    <td className="p-2 text-[#8B9BB4]">orientation.pitch, etc.</td>
                    <td className="p-2 text-[#22D3EE]">deg</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">GNSS / GPS</td>
                    <td className="p-2 text-[#34D399] font-bold">latitude, longitude, sats</td>
                    <td className="p-2 text-[#8B9BB4]">lat, lng, lon, satellites</td>
                    <td className="p-2 text-[#22D3EE]">deg / count</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Battery / EPS</td>
                    <td className="p-2 text-[#34D399] font-bold">voltage, battery_pct</td>
                    <td className="p-2 text-[#8B9BB4]">vbus, vbat, soc</td>
                    <td className="p-2 text-[#22D3EE]">V / %</td>
                  </tr>
                  <tr>
                    <td className="p-2 text-[#8B9BB4]">Link Quality</td>
                    <td className="p-2 text-[#34D399] font-bold">rssi, packet_id</td>
                    <td className="p-2 text-[#8B9BB4]">pkt_id, seq</td>
                    <td className="p-2 text-[#22D3EE]">dBm / #</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Comprehensive Packet Example */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#22D3EE] uppercase">
                3. Full Avionics Packet Example
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTestInject(sampleFull.replace(/\s+/g, ' '))}
                  className="bg-[#22D3EE]/15 hover:bg-[#22D3EE]/25 text-[#22D3EE] border border-[#22D3EE]/30 px-2 py-0.5 rounded text-[10px] font-bold active:scale-95 transition-all"
                >
                  TEST INJECT
                </button>
                <button
                  onClick={() => copyToClipboard(sampleFull, 'full')}
                  className="bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white px-2 py-0.5 rounded text-[10px]"
                >
                  {copied === 'full' ? 'COPIED!' : 'COPY'}
                </button>
              </div>
            </div>
            <pre className="bg-[#050811] p-3 rounded-lg border border-[#1E2A3F] text-[#8B9BB4] overflow-x-auto text-[10px] leading-relaxed">
              {sampleFull}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0A1020] border-t border-[#1E2A3F] flex items-center justify-between">
          <span className="font-mono text-[10px] text-[#8B9BB4]">
            See <span className="text-white">GROUND_STATION_PROTOCOL.md</span> for full C++ ESP32 code.
          </span>
          <button
            onClick={onClose}
            className="bg-[#22D3EE] text-[#0A1020] px-4 py-1.5 rounded-lg font-mono text-[11px] font-bold active:scale-95 transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
