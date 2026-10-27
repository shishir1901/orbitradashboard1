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
  onOpenProtocolModal?: () => void;
}

export function Header({
  currentTab,
  onTabChange,
  onOpenEmergencyModal,
  onOpenOperatorModal,
  onOpenProtocolModal,
}: HeaderProps) {
  const {
    isConnected,
    isSerialConnected,
    isConnecting,
    isSerialSupported,
    serialError,
    dismissSerialError,
    lastPacketTime,
    livePacketCount,
    parseErrorCount,
    awaitingDataWarning,
    mode,
    setMode,
    baudRate,
    emergencyKillActive,
    packetTotalHeader,
    currentPacket,
    connectSerial,
    disconnectSerial,
  } = useTelemetry();

  const [utcTime, setUtcTime] = useState<string>('00:00:00 UTC');
  const [istTime, setIstTime] = useState<string>('00:00:00 IST');
  const [audioActive, setAudioActiveState] = useState(isAudioEnabled());
  const [lastPacketAgo, setLastPacketAgo] = useState<string>('--');

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

      // Time since last packet
      if (lastPacketTime) {
        const diffSec = Math.round((now.getTime() - lastPacketTime) / 1000);
        if (diffSec < 1) {
          setLastPacketAgo('Just now');
        } else if (diffSec < 60) {
          setLastPacketAgo(`${diffSec}s ago`);
        } else {
          setLastPacketAgo(`${Math.floor(diffSec / 60)}m ago`);
        }
      } else {
        setLastPacketAgo('--');
      }
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [lastPacketTime]);

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
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between gap-3 border-b border-[#1E2A3F]/60">
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

        {/* Right: Connect GS Button, Clocks, Packet Count, Status Pills */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-xs font-mono">
          {/* UTC & IST Clocks */}
          <div className="hidden lg:flex items-center gap-2 text-[#8B9BB4] bg-[#111A2B] border border-[#1E2A3F] rounded-lg px-2.5 py-1">
            <span className="text-white font-medium">{utcTime}</span>
            <span className="text-[#1E2A3F]">|</span>
            <span className="text-[#8B9BB4]">{istTime}</span>
          </div>

          {/* Packet Counter */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#111A2B] border border-[#1E2A3F] rounded-lg px-2.5 py-1 text-[#8B9BB4]">
            <span className="text-[10px] text-[#8B9BB4]">PKT:</span>
            <span className="text-white font-medium">{packetTotalHeader.toLocaleString()}</span>
          </div>

          {/* Last Packet Time (in Live mode) */}
          {mode === 'LIVE' && lastPacketTime && (
            <div className="hidden md:flex items-center gap-1 bg-[#111A2B] border border-[#1E2A3F] rounded-lg px-2 py-1 text-[#8B9BB4]">
              <span className="text-[9px] text-[#8B9BB4]">LAST:</span>
              <span className="text-[#22D3EE] font-medium">{lastPacketAgo}</span>
            </div>
          )}

          {/* Parsing Errors Badge */}
          {parseErrorCount > 0 && (
            <div
              title={`${parseErrorCount} JSON parsing error(s) encountered`}
              className="flex items-center gap-1 bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#F43F5E] px-2 py-1 rounded-lg text-[10px] font-bold"
            >
              <span>ERR:</span>
              <span>{parseErrorCount}</span>
            </div>
          )}

          {/* PRIMARY: Connect / Disconnect Ground Station Button */}
          {isSerialConnected ? (
            <button
              onClick={disconnectSerial}
              title="Disconnect Ground Station USB Serial port"
              className="flex items-center gap-1.5 bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border border-[#F43F5E]/40 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E]" />
              <span className="material-symbols-outlined text-[13px]">link_off</span>
              <span className="tracking-wide">DISCONNECT GS</span>
            </button>
          ) : (
            <button
              onClick={connectSerial}
              disabled={isConnecting}
              title={
                isSerialSupported
                  ? 'Connect Ground Station ESP32 via Web Serial (115200 baud)'
                  : 'Web Serial unsupported in this browser'
              }
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 shadow-sm ${
                isConnecting
                  ? 'bg-[#22D3EE]/30 text-white border border-[#22D3EE]/50 cursor-wait'
                  : 'bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020] shadow-[0_0_12px_rgba(34,211,238,0.35)]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">usb</span>
              <span className="tracking-wide">
                {isConnecting ? 'CONNECTING...' : 'CONNECT GS'}
              </span>
            </button>
          )}

          {/* Mode Pill Toggle (LIVE HW / DEMO SIM) */}
          <button
            onClick={() => setMode(mode === 'LIVE' ? 'SIM' : 'LIVE')}
            title="Toggle between Live Hardware and Demo Simulation mode"
            className="flex items-center gap-1 bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] px-2 py-1 rounded-full text-[#8B9BB4] hover:text-white transition-colors"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${mode === 'LIVE' ? 'bg-[#34D399]' : 'bg-[#22D3EE]'}`} />
            <span className={`text-[10px] uppercase font-bold ${mode === 'LIVE' ? 'text-[#34D399]' : 'text-[#22D3EE]'}`}>
              {mode}
            </span>
          </button>

          {/* Protocol JSON Guide button */}
          {onOpenProtocolModal && (
            <button
              onClick={onOpenProtocolModal}
              title="ESP32 Ground Station JSON Schema & Code Documentation"
              className="w-7 h-7 rounded-lg bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#22D3EE] hover:text-white flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">data_object</span>
            </button>
          )}

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

      {/* Warning/Error notification banner if Web Serial fails or no data arrives */}
      {serialError && (
        <div className="bg-[#F43F5E]/15 border-b border-[#F43F5E]/40 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-[#F43F5E]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px]">error</span>
            <span>{serialError}</span>
          </div>
          <button
            onClick={dismissSerialError}
            className="text-[10px] text-[#8B9BB4] hover:text-white underline ml-3"
          >
            DISMISS
          </button>
        </div>
      )}

      {awaitingDataWarning && !serialError && (
        <div className="bg-[#FBBF24]/15 border-b border-[#FBBF24]/40 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-[#FBBF24]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px] animate-pulse">warning</span>
            <span>
              Connected @ 115200 baud, but no JSON packets received recently. Verify Ground ESP32 is powered and printing newline-delimited JSON.
            </span>
          </div>
          {onOpenProtocolModal && (
            <button
              onClick={onOpenProtocolModal}
              className="text-[10px] text-[#22D3EE] hover:underline font-bold ml-3 shrink-0"
            >
              VIEW PROTOCOL
            </button>
          )}
        </div>
      )}

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
            <span>LINK:</span>
            <span className={isConnected ? 'text-[#34D399] font-medium' : 'text-[#F43F5E] font-medium'}>
              {isConnected ? (isSerialConnected ? 'USB SERIAL' : 'SIMULATED') : 'DISCONNECTED'}
            </span>
          </div>
          <span className="text-[#1E2A3F]">|</span>
          <div className="flex items-center gap-1">
            <span>RSSI:</span>
            <span className="text-[#22D3EE] font-medium">{currentPacket.link.rssi} dBm</span>
          </div>
          <span className="text-[#1E2A3F]">|</span>
          <div className="flex items-center gap-1">
            <span>BAUD:</span>
            <span className="text-white font-medium">{baudRate}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
