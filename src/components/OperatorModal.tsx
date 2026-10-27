/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplaySplash?: () => void;
}

export function OperatorModal({ isOpen, onClose, onReplaySplash }: OperatorModalProps) {
  const { port, baudRate, isConnected, mode } = useTelemetry();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111A2B] border border-[#1E2A3F] rounded-xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1E2A3F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#22D3EE] text-[#0A1020] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            <div>
              <h2 className="font-sans font-bold text-[15px] text-white tracking-wide">
                GROUND STATION CONTROLLER
              </h2>
              <span className="font-mono text-[10px] text-[#22D3EE]">
                CALLSIGN: VU2MMM • MMMUT AVIONICS
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8B9BB4] hover:text-white p-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Station Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
          <div className="bg-[#0A1020] p-2.5 rounded-lg border border-[#1E2A3F]">
            <span className="text-[#8B9BB4] text-[9px] block uppercase">STATION LOCATION</span>
            <span className="text-white font-medium">Gorakhpur, UP, India</span>
            <span className="text-[#22D3EE] text-[10px] block">26.7314° N, 83.4331° E</span>
          </div>

          <div className="bg-[#0A1020] p-2.5 rounded-lg border border-[#1E2A3F]">
            <span className="text-[#8B9BB4] text-[9px] block uppercase">ANTENNA ROTOR</span>
            <span className="text-[#34D399] font-medium">AZ: 142° / EL: 45°</span>
            <span className="text-[#8B9BB4] text-[10px] block">Auto-Tracking: ACTIVE</span>
          </div>

          <div className="bg-[#0A1020] p-2.5 rounded-lg border border-[#1E2A3F]">
            <span className="text-[#8B9BB4] text-[9px] block uppercase">GATEWAY HARDWARE</span>
            <span className="text-white font-medium">ESP32-S3 WROOM</span>
            <span className="text-[#8B9BB4] text-[10px] block">{port}</span>
          </div>

          <div className="bg-[#0A1020] p-2.5 rounded-lg border border-[#1E2A3F]">
            <span className="text-[#8B9BB4] text-[9px] block uppercase">RADIO TRANSCEIVER</span>
            <span className="text-white font-medium">LoRa SX1276 (433MHz)</span>
            <span className="text-[#22D3EE] text-[10px] block">BW 125kHz • SF9 • CR 4/5</span>
          </div>
        </div>

        {/* Active Session Info */}
        <div className="bg-[#0A1020] p-3 rounded-lg border border-[#1E2A3F] font-mono text-[11px] flex flex-col gap-1.5">
          <div className="flex justify-between">
            <span className="text-[#8B9BB4]">COMM LINK STATUS:</span>
            <span className={`font-bold ${isConnected ? 'text-[#34D399]' : 'text-[#F43F5E]'}`}>
              {isConnected ? 'ONLINE & SYNCHRONIZED' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8B9BB4]">OPERATION MODE:</span>
            <span className="text-[#22D3EE] font-bold">{mode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8B9BB4]">DATA BAUD RATE:</span>
            <span className="text-white font-bold">{baudRate} bps</span>
          </div>
        </div>

        <div className="flex gap-2">
          {onReplaySplash && (
            <button
              onClick={() => {
                onClose();
                onReplaySplash();
              }}
              className="flex-1 bg-[#0A1020] hover:bg-[#1E2A3F] border border-[#22D3EE]/40 text-[#22D3EE] py-2.5 rounded-lg font-mono text-[11px] font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">play_circle</span>
              <span>REPLAY INTRO</span>
            </button>
          )}
          <button
            onClick={onClose}
            className={`${onReplaySplash ? 'flex-1' : 'w-full'} bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020] py-2.5 rounded-lg font-mono text-[11px] font-bold shadow-sm transition-all`}
          >
            CLOSE CONSOLE
          </button>
        </div>
      </div>
    </div>
  );
}
