/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

type LogFilter = 'ALL' | 'RX' | 'TX' | 'NMEA' | 'WARN';

export function ConsoleScreen() {
  const { logs, sendCommand, clearLogs, isConnected, port, baudRate } = useTelemetry();
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const [showHex, setShowHex] = useState<boolean>(false);
  const [inputCmd, setInputCmd] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((l) => {
    if (filter === 'ALL') return true;
    if (filter === 'RX') return l.type === 'RX';
    if (filter === 'TX') return l.type === 'TX';
    if (filter === 'NMEA') return l.type === 'NMEA' || l.message.startsWith('$GN');
    if (filter === 'WARN') return l.type === 'WARN' || l.type === 'CRIT';
    return true;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    sendCommand(inputCmd.trim());
    setInputCmd('');
  };

  const handleQuickCmd = (cmd: string) => {
    sendCommand(cmd);
  };

  const exportLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.type}] ${l.message} ${l.hex ? `(HEX: ${l.hex})` : ''}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORBITRA_SERIAL_LOG_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickCommands = [
    { label: 'PING', cmd: 'PING' },
    { label: 'SYS_DIAG', cmd: 'SYS_DIAG' },
    { label: 'CAL_IMU', cmd: 'CAL_IMU' },
    { label: 'TX 20dBm', cmd: 'SET_TX_PWR 20dBm' },
    { label: 'BEACON 1Hz', cmd: 'BEACON_RATE 1Hz' },
    { label: 'SAFE_MODE', cmd: 'SAFE_MODE' },
  ];

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 gap-4 pb-20">
      {/* Console Screen Header */}
      <div className="space-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE]">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
          </div>
          <div>
            <span className="font-mono text-[12px] uppercase tracking-wider text-white font-bold block">
              EVENT & SERIAL CONSOLE
            </span>
            <span className="font-mono text-[10px] text-[#8B9BB4] tracking-wider">
              {port} @ {baudRate} BAUD • 8-N-1 SERIAL STREAM
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHex(!showHex)}
            className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold border transition-all ${
              showHex
                ? 'bg-[#A78BFA]/20 border-[#A78BFA] text-[#A78BFA]'
                : 'bg-[#0A1020] border-[#1E2A3F] text-[#8B9BB4]'
            }`}
          >
            HEX DUMP: {showHex ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Terminal Viewport Container */}
      <div className="space-card flex flex-col gap-3 p-4">
        {/* Terminal Controls Bar */}
        <div className="flex items-center justify-between gap-2 text-xs flex-wrap pb-2 border-b border-[#1E2A3F]">
          {/* Filter Chips */}
          <div className="flex gap-1 overflow-x-auto">
            {(['ALL', 'RX', 'TX', 'NMEA', 'WARN'] as LogFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`font-mono text-[10px] px-2.5 py-1 rounded-full font-bold transition-all ${
                  filter === f
                    ? 'bg-[#22D3EE] text-[#0A1020]'
                    : 'bg-[#0A1020] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Auto-scroll, Clear, Export */}
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className="flex items-center gap-1.5 text-[#8B9BB4] hover:text-white transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoScroll ? 'bg-[#34D399]' : 'bg-[#8B9BB4]'}`} />
              AUTOSCROLL
            </button>
            <span className="text-[#1E2A3F]">|</span>
            <button
              onClick={clearLogs}
              className="text-[#F43F5E] hover:underline"
            >
              CLEAR
            </button>
            <span className="text-[#1E2A3F]">|</span>
            <button
              onClick={exportLogs}
              className="text-[#22D3EE] hover:underline"
            >
              EXPORT LOG
            </button>
          </div>
        </div>

        {/* Black Monospace Terminal Display */}
        <div
          ref={scrollRef}
          className="h-96 overflow-y-auto bg-[#050811] rounded-lg p-3 font-mono text-[11px] flex flex-col gap-1 border border-[#1E2A3F] select-text"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-[#8B9BB4] italic py-8 text-center">
              No log messages matching filter criteria.
            </div>
          ) : (
            filteredLogs.map((entry) => {
              let badgeColor = 'bg-[#111A2B] text-[#8B9BB4] border-[#1E2A3F]';
              if (entry.type === 'RX') badgeColor = 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30';
              if (entry.type === 'TX') badgeColor = 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30';
              if (entry.type === 'WARN') badgeColor = 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/30';
              if (entry.type === 'CRIT') badgeColor = 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40';

              return (
                <div key={entry.id} className="flex flex-col gap-0.5 leading-relaxed font-mono">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#8B9BB4] text-[9px] shrink-0">{entry.timestamp}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold shrink-0 ${badgeColor}`}
                    >
                      {entry.type}
                    </span>
                    <span
                      className={`break-all ${
                        entry.type === 'TX'
                          ? 'text-[#22D3EE] font-semibold'
                          : entry.type === 'WARN'
                          ? 'text-[#FBBF24]'
                          : entry.type === 'CRIT'
                          ? 'text-[#F43F5E] font-bold'
                          : entry.message.startsWith('$')
                          ? 'text-white'
                          : 'text-[#8B9BB4]'
                      }`}
                    >
                      {entry.message}
                    </span>
                  </div>
                  {showHex && entry.hex && (
                    <div className="text-[9px] text-[#A78BFA] pl-16 tracking-wider font-mono">
                      HEX: {entry.hex}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Quick Command Chips */}
        <div className="flex gap-1.5 overflow-x-auto pt-1">
          {quickCommands.map((q) => (
            <button
              key={q.cmd}
              onClick={() => handleQuickCmd(q.cmd)}
              className="bg-[#0A1020] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#22D3EE] px-2.5 py-1 rounded font-mono text-[10px] font-semibold whitespace-nowrap active:scale-95 transition-all"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Command Uplink CLI Prompt Input Form */}
        <form onSubmit={handleSend} className="flex gap-2 pt-1">
          <div className="flex-1 bg-[#0A1020] border border-[#1E2A3F] focus-within:border-[#22D3EE] rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#22D3EE] font-bold">TX &gt;</span>
            <input
              type="text"
              value={inputCmd}
              onChange={(e) => setInputCmd(e.target.value)}
              placeholder="Enter uplink telemetry command (e.g. PING, CAL_IMU, SYS_DIAG)..."
              className="w-full bg-transparent text-white placeholder-[#8B9BB4] font-mono text-[11px] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!isConnected}
            className="bg-[#22D3EE] hover:bg-[#06B6D4] active:scale-95 text-[#0A1020] font-mono text-[11px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-40 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">send</span>
            <span>UPLINK</span>
          </button>
        </form>
      </div>
    </div>
  );
}
