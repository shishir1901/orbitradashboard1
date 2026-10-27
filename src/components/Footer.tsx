/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';

export function Footer() {
  const { currentPacket, port, baudRate, isConnected, isSerialConnected, mode, liveFieldsPresent } = useTelemetry();

  return (
    <footer className="fixed bottom-0 left-0 w-full z-40 bg-[#0A1020]/95 backdrop-blur-md border-t border-[#1E2A3F] px-4 py-1.5 font-mono text-[10px] text-[#8B9BB4] hidden sm:block">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Left: Runtime Info */}
        <div className="flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
          <span className="text-white font-medium">ORBITRA GS-01</span>
          <span>•</span>
          <span>ESP32-S3 GROUND STATION</span>
          <span>•</span>
          <span className="text-[#22D3EE]">{port}</span>
          <span>@</span>
          <span>{baudRate} bps</span>
          <span>•</span>
          <span>MMMUT GORAKHPUR LAB</span>
        </div>

        {/* Right: Health Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <span>HEAP:</span>
            <span className="text-white font-medium">
              {mode === 'LIVE' && !liveFieldsPresent.eps ? '--' : `${currentPacket.eps.freeHeap} KB`}
            </span>
          </div>
          <span className="text-[#1E2A3F]">|</span>
          <div className="flex items-center gap-1">
            <span>CPU:</span>
            <span className="text-white font-medium">
              {mode === 'LIVE' && !liveFieldsPresent.eps ? '--' : `${currentPacket.eps.cpuTemp.toFixed(1)}°C`}
            </span>
          </div>
          <span className="text-[#1E2A3F]">|</span>
          <div className="flex items-center gap-1">
            <span>EPS:</span>
            <span className="text-[#34D399] font-medium">
              {mode === 'LIVE' && !liveFieldsPresent.eps ? '--' : `${currentPacket.eps.voltage.toFixed(2)}V`}
            </span>
            <span className="text-[#8B9BB4]">
              ({mode === 'LIVE' && !liveFieldsPresent.eps ? '--' : `${currentPacket.eps.soc}%`})
            </span>
          </div>
          <span className="text-[#1E2A3F]">|</span>
          <div className="flex items-center gap-1">
            <span>STATUS:</span>
            <span className={`font-semibold ${isConnected ? 'text-[#34D399]' : 'text-[#F43F5E]'}`}>
              {isSerialConnected ? 'WEB SERIAL LIVE' : isConnected ? 'NOMINAL SIM' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
