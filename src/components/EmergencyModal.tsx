/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencyModal({ isOpen, onClose }: EmergencyModalProps) {
  const { emergencyKillActive, triggerEmergencyKill, resetEmergencyKill } = useTelemetry();
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleExecuteKill = () => {
    triggerEmergencyKill();
    onClose();
  };

  const handleDisengageKill = () => {
    resetEmergencyKill();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111A2B] border border-[#F43F5E]/60 rounded-xl max-w-md w-full p-5 shadow-[0_0_30px_rgba(244,63,94,0.35)] flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center gap-2.5 text-[#F43F5E]">
          <div className="w-8 h-8 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
          </div>
          <div>
            <h2 className="font-sans font-bold text-[15px] text-white tracking-wide uppercase">
              EMERGENCY RF TRANSMITTER KILL
            </h2>
            <span className="font-mono text-[10px] text-[#8B9BB4]">
              CRITICAL COMMAND INTERLOCK • HARD OVERRIDE
            </span>
          </div>
        </div>

        {/* Warning text */}
        <div className="bg-[#F43F5E]/10 border border-[#F43F5E]/25 rounded-lg p-3 text-[11px] font-mono text-[#F43F5E] leading-relaxed">
          <p className="font-bold mb-1">
            ⚠ ATTENTION GROUND CONTROLLER:
          </p>
          Executing RF Kill issues an immediate hardware cutoff to the COSMIC-1 RF power amplifier stage. Ground downlink and transponder telemetry will be terminated until manual reactivation.
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0A1020] border border-[#1E2A3F] font-mono text-[11px]">
          <span className="text-[#8B9BB4]">RF POWER STAGE:</span>
          <span className={`font-bold ${emergencyKillActive ? 'text-[#F43F5E]' : 'text-[#34D399]'}`}>
            {emergencyKillActive ? 'CUT OFF (OFFLINE)' : 'ENERGIZED (NOMINAL)'}
          </span>
        </div>

        {/* Safety Confirm Checkbox */}
        {!emergencyKillActive && (
          <label className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0A1020] border border-[#F43F5E]/30 cursor-pointer text-xs font-mono select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="accent-[#F43F5E] w-4 h-4 rounded"
            />
            <span className="text-white text-[11px]">
              I confirm authority to execute emergency transponder shutdown.
            </span>
          </label>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-[#0A1020] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white py-2 rounded-lg font-mono text-[11px] font-semibold transition-all"
          >
            CANCEL
          </button>

          {emergencyKillActive ? (
            <button
              onClick={handleDisengageKill}
              className="flex-1 bg-[#34D399] hover:bg-[#10B981] text-[#0A1020] py-2 rounded-lg font-mono text-[11px] font-bold shadow-sm transition-all"
            >
              RESTORE RF LINK
            </button>
          ) : (
            <button
              onClick={handleExecuteKill}
              disabled={!confirmed}
              className="flex-1 bg-[#F43F5E] hover:bg-[#E11D48] disabled:opacity-40 text-white py-2 rounded-lg font-mono text-[11px] font-bold shadow-sm transition-all"
            >
              CUT RF STAGE NOW
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
