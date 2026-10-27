/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { isAudioEnabled, setAudioEnabled } from '../utils/audio';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenEmergencyModal: () => void;
  onOpenOperatorModal: () => void;
}

export function Header({
  currentTab,
  onTabChange,
  onOpenEmergencyModal,
  onOpenOperatorModal,
}: HeaderProps) {
  const {
    isConnected,
    mode,
    setMode,
    baudRate,
    emergencyKillActive,
    packetTotalHeader,
    currentPacket,
  } = useTelemetry();

  const [utcTime, setUtcTime] = useState<string>('00:00:00 UTC');
  const [istTime, setIstTime] = useState<string>('00:00:00 IST');
  const [audioActive, setAudioActiveState] = useState(isAudioEnabled());

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      // UTC time
      const utc = now.toISOString().substring(11, 19) + ' UTC';
      setUtcTime(utc);

      // IST time (UTC + 5 hours 30 mins)
      const istDate = new Date(now.getTime() + 5.5 * 3600 * 1000);
      const istHours = String(istDate.getUTCHours()).padStart(2, '0');
      const istMins = String(istDate.getUTCMinutes()).padStart(2, '0');
      const istSecs = String(istDate.getUTCSeconds()).padStart(2, '0');
      setIstTime(`${istHours}:${istMins}:${istSecs} IST`);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !audioActive;
    setAudioEnabled(next);
    setAudioActiveState(next);
  };

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'telemetry', label: 'Telemetry' },
    { id: 'attitude', label: '3D Attitude' },
    { id: 'charts', label: 'Charts' },
    { id: 'orbit', label: 'Orbit GPS' },
    { id: 'console', label: 'Console' },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#0A1020]/95 backdrop-blur-md border-b border-[#1E2A3F]">
      {/* Top Header Bar */}
      <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center justify-between gap-3 border-b border-[#1E2A3F]/60">
        {/* Left: Logo Icon + Name + Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#111A2B] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE] shadow-sm">
            <span className="material-symbols-outlined text-[19px]">satellite_alt</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-[15px] tracking-wide text-white uppercase">
              ORBITRA
            </span>
            <span className="font-mono text-[11px] font-semibold text-[#22D3EE] bg-[#22D3EE]/10 border border-[#22D3EE]/25 px-1.5 py-0.5 rounded">
              GS-01
            </span>
            <span className="hidden sm:inline-block font-mono text-[10px] text-[#8B9BB4] border-l border-[#1E2A3F] pl-2 tracking-wider">
              COSMIC-1 (LEO)
            </span>
          </div>
        </div>

        {/* Right: Clocks (UTC / IST), Packet Count, Status Pills */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-xs font-mono">
          {/* UTC & IST Clocks */}
          <div className="hidden md:flex items-center gap-2 text-[#8B9BB4] bg-[#111A2B] border border-[#1E2A3F] rounded-lg px-2.5 py-1">
            <span className="text-white font-medium">{utcTime}</span>
            <span className="text-[#1E2A3F]">|</span>
            <span className="text-[#8B9BB4]">{istTime}</span>
          </div>

          {/* Packet Counter */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#111A2B] border border-[#1E2A3F] rounded-lg px-2.5 py-1 text-[#8B9BB4]">
            <span className="text-[10px] text-[#8B9BB4]">PKT:</span>
            <span className="text-white font-medium">{packetTotalHeader.toLocaleString()}</span>
          </div>

          {/* Connection Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors ${
              emergencyKillActive
                ? 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]'
                : isConnected
                ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]'
                : 'bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                emergencyKillActive
                  ? 'bg-[#F43F5E]'
                  : isConnected
                  ? 'bg-[#34D399] shadow-[0_0_6px_#34D399]'
                  : 'bg-[#F43F5E]'
              }`}
            />
            <span className="tracking-wide">
              {emergencyKillActive ? 'RF KILL' : isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {/* Mode Pill Toggle */}
          <button
            onClick={() => setMode(mode === 'LIVE' ? 'SIM' : 'LIVE')}
            className="flex items-center gap-1 bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] px-2 py-1 rounded-full text-[#8B9BB4] hover:text-white transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
            <span className="text-[10px] uppercase font-semibold text-[#22D3EE]">{mode}</span>
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSound}
            title={audioActive ? 'Mute audio' : 'Enable audio'}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border ${
              audioActive
                ? 'bg-[#22D3EE]/10 border-[#22D3EE]/30 text-[#22D3EE]'
                : 'bg-[#111A2B] border-[#1E2A3F] text-[#8B9BB4] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {audioActive ? 'volume_up' : 'volume_off'}
            </span>
          </button>

          {/* Emergency RF Kill Trigger */}
          <button
            onClick={onOpenEmergencyModal}
            title="Emergency RF Kill switch"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border ${
              emergencyKillActive
                ? 'bg-[#F43F5E] text-white border-[#F43F5E] shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                : 'bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border-[#F43F5E]/30'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">e911_emergency</span>
          </button>

          {/* Operator Profile Button */}
          <button
            onClick={onOpenOperatorModal}
            title="Station Operator Info (VU2MMM)"
            className="w-7 h-7 rounded-full bg-[#22D3EE] text-[#0A1020] flex items-center justify-center font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">person</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Bar Below Header */}
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {navTabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`font-sans text-[13px] px-3.5 py-1 rounded-full transition-all duration-150 ${
                  isActive
                    ? 'bg-[#22D3EE] text-[#0A1020] font-semibold shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                    : 'text-[#8B9BB4] hover:text-white hover:bg-[#111A2B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Micro station telemetry pill on the right */}
        <div className="hidden lg:flex items-center gap-3 font-mono text-[11px] text-[#8B9BB4]">
          <div className="flex items-center gap-1">
            <span>RSSI:</span>
            <span className="text-[#22D3EE] font-medium">{currentPacket.link.rssi} dBm</span>
          </div>
          <div className="flex items-center gap-1">
            <span>RTT:</span>
            <span className="text-[#34D399] font-medium">{currentPacket.link.rtt}ms</span>
          </div>
          <div className="flex items-center gap-1">
            <span>BAUD:</span>
            <span className="text-white font-medium">{(baudRate / 1000).toFixed(1)}k</span>
          </div>
        </div>
      </div>
    </header>
  );
}
