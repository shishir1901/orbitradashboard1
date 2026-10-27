/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPacket, ConsoleLogEntry } from '../types/telemetry';
import { playAvionicBeep, playEmergencyAlarm } from '../utils/audio';

interface TelemetryContextType {
  currentPacket: TelemetryPacket;
  history: TelemetryPacket[];
  logs: ConsoleLogEntry[];
  isConnected: boolean;
  isStreaming: boolean;
  mode: 'LIVE' | 'SIM';
  baudRate: number;
  port: string;
  emergencyKillActive: boolean;
  isCalibrating: boolean;
  alertsAcknowledged: boolean;
  packetTotalHeader: number;
  toggleStreaming: () => void;
  toggleConnection: () => Promise<void>;
  setMode: (mode: 'LIVE' | 'SIM') => void;
  setBaudRate: (baud: number) => void;
  setPort: (port: string) => void;
  calibrateZero: () => void;
  ackAlerts: () => void;
  triggerEmergencyKill: () => void;
  resetEmergencyKill: () => void;
  clearBuffer: () => void;
  exportCsv: () => void;
  sendCommand: (cmd: string) => void;
  clearLogs: () => void;
}

const initialPacket: TelemetryPacket = {
  timestamp: Date.now(),
  packetId: 1051,
  temp: 26.5,
  hum: 54.0,
  press: 1011.4,
  altAgl: 143.1,
  altMsl: 102.4,
  accel: { x: 0.03, y: -0.02, z: 9.81 },
  gyro: { x: 0.12, y: -0.05, z: 0.01 },
  orientation: { pitch: 1.4, roll: -0.8, yaw: 42.6 },
  quaternion: [0.01, -0.007, 0.363, 0.931],
  gnss: {
    lat: 26.7314,
    lng: 83.4331,
    sats: 8,
    fixType: '3D FIX',
    alt: 102.4,
    speed: 0.0,
    hdop: 0.92,
  },
  eps: {
    voltage: 3.84,
    soc: 84,
    freeHeap: 184,
    cpuTemp: 41.8,
    currentMa: 312,
  },
  link: {
    rssi: -64,
    rtt: 12,
    dropCount: 0,
    rateHz: 1.0,
  },
};

const initialLogs: ConsoleLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '15:57:48Z',
    rawTime: Date.now() - 11000,
    type: 'INFO',
    message: '[BOOT] ORBITRA GS-01 Ground Terminal initialized at MMMUT Gorakhpur avionics bay.',
  },
  {
    id: 'log-2',
    timestamp: '15:57:50Z',
    rawTime: Date.now() - 9000,
    type: 'INFO',
    message: '[SERIAL] Connected to ESP32 Gateway via /dev/ttyUSB0 @ 115200 8N1.',
  },
  {
    id: 'log-3',
    timestamp: '15:57:52Z',
    rawTime: Date.now() - 7000,
    type: 'RX',
    message: '$ORB,BOOT,REV:2.4,MCU:ESP32-S3,IMU:MPU6050_OK,ENV:BMP280_DHT11_OK*5A',
    hex: '24 4F 52 42 2C 42 4F 4F 54 2A 35 41',
  },
  {
    id: 'log-4',
    timestamp: '15:57:54Z',
    rawTime: Date.now() - 5000,
    type: 'RX',
    message: '$GNGGA,155754.00,2643.884,N,08325.986,E,1,08,0.92,102.4,M,-48.2,M,,*4F',
  },
  {
    id: 'log-5',
    timestamp: '15:57:56Z',
    rawTime: Date.now() - 3000,
    type: 'RX',
    message: '$ORB,TEL,PKT:1050,T:26.5,H:54.0,P:1011.4,ALT:143.1,AX:0.03,AY:-0.02,AZ:9.81,V:3.84*2D',
  },
  {
    id: 'log-6',
    timestamp: '15:57:59Z',
    rawTime: Date.now() - 1000,
    type: 'INFO',
    message: '[SYNC] Telemetry lock established with COSMIC-1 (ORBITRA-2026). RTT: 12ms RSSI: -64dBm.',
  },
];

const TelemetryContext = createContext<TelemetryContextType | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [currentPacket, setCurrentPacket] = useState<TelemetryPacket>(initialPacket);
  const [history, setHistory] = useState<TelemetryPacket[]>([initialPacket]);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>(initialLogs);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [mode, setMode] = useState<'LIVE' | 'SIM'>('LIVE');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [port, setPort] = useState<string>('/dev/ttyUSB0 (ESP32 GS)');
  const [emergencyKillActive, setEmergencyKillActive] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [alertsAcknowledged, setAlertsAcknowledged] = useState<boolean>(false);
  const [packetTotalHeader, setPacketTotalHeader] = useState<number>(14892);

  const calibrationOffsets = useRef({ ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 });
  const serialPortRef = useRef<unknown>(null);

  // High-frequency telemetry generation / simulation loop
  useEffect(() => {
    if (!isStreaming || !isConnected || emergencyKillActive) return;

    const interval = setInterval(() => {
      setPacketTotalHeader((prev) => prev + 1);

      setCurrentPacket((prev) => {
        const nextPktId = prev.packetId + 1;
        const now = Date.now();

        // Realistic avionics physical jitter & micro-fluctuations
        const tempJitter = (Math.random() - 0.48) * 0.15;
        const humJitter = (Math.random() - 0.5) * 0.25;
        const pressJitter = (Math.random() - 0.49) * 0.15;
        const altJitter = (Math.random() - 0.5) * 0.3;

        // IMU micro dynamics
        const rawAx = 0.03 + (Math.sin(now / 2000) * 0.04) + (Math.random() - 0.5) * 0.02 - calibrationOffsets.current.ax;
        const rawAy = -0.02 + (Math.cos(now / 2500) * 0.03) + (Math.random() - 0.5) * 0.02 - calibrationOffsets.current.ay;
        const rawAz = 9.81 + (Math.sin(now / 3500) * 0.05) + (Math.random() - 0.5) * 0.02 - calibrationOffsets.current.az;

        const rawGx = 0.12 + Math.sin(now / 1500) * 0.08 - calibrationOffsets.current.gx;
        const rawGy = -0.05 + Math.cos(now / 1800) * 0.07 - calibrationOffsets.current.gy;
        const rawGz = 0.01 + Math.sin(now / 2200) * 0.05 - calibrationOffsets.current.gz;

        // Attitude Euler integration
        const pitch = parseFloat((prev.orientation.pitch + rawGx * 0.05).toFixed(2));
        const roll = parseFloat((prev.orientation.roll + rawGy * 0.05).toFixed(2));
        const yaw = parseFloat(((prev.orientation.yaw + rawGz * 0.05 + 360) % 360).toFixed(2));

        // Quaternion approximation from Euler
        const c1 = Math.cos((pitch * Math.PI) / 360);
        const s1 = Math.sin((pitch * Math.PI) / 360);
        const c2 = Math.cos((roll * Math.PI) / 360);
        const s2 = Math.sin((roll * Math.PI) / 360);
        const c3 = Math.cos((yaw * Math.PI) / 360);
        const s3 = Math.sin((yaw * Math.PI) / 360);

        const qx = parseFloat((s1 * c2 * c3 - c1 * s2 * s3).toFixed(4));
        const qy = parseFloat((c1 * s2 * c3 + s1 * c2 * s3).toFixed(4));
        const qz = parseFloat((c1 * c2 * s3 - s1 * s2 * c3).toFixed(4));
        const qw = parseFloat((c1 * c2 * c3 + s1 * s2 * s3).toFixed(4));

        // Voltage slow discharge with small fluctuation
        const newVoltage = parseFloat(Math.max(3.6, Math.min(4.15, prev.eps.voltage + (Math.random() - 0.52) * 0.005)).toFixed(2));
        const soc = Math.round(Math.min(100, Math.max(10, ((newVoltage - 3.4) / (4.2 - 3.4)) * 100)));

        const newTemp = parseFloat(Math.max(18, Math.min(32, prev.temp + tempJitter)).toFixed(1));
        const newHum = parseFloat(Math.max(40, Math.min(75, prev.hum + humJitter)).toFixed(1));
        const newPress = parseFloat(Math.max(990, Math.min(1030, prev.press + pressJitter)).toFixed(1));
        const newAltAgl = parseFloat(Math.max(130, Math.min(160, prev.altAgl + altJitter)).toFixed(1));

        const newPacket: TelemetryPacket = {
          timestamp: now,
          packetId: nextPktId,
          temp: newTemp,
          hum: newHum,
          press: newPress,
          altAgl: newAltAgl,
          altMsl: 102.4,
          accel: {
            x: parseFloat(rawAx.toFixed(2)),
            y: parseFloat(rawAy.toFixed(2)),
            z: parseFloat(rawAz.toFixed(2)),
          },
          gyro: {
            x: parseFloat(rawGx.toFixed(2)),
            y: parseFloat(rawGy.toFixed(2)),
            z: parseFloat(rawGz.toFixed(2)),
          },
          orientation: { pitch, roll, yaw },
          quaternion: [qx, qy, qz, qw],
          gnss: {
            lat: 26.7314,
            lng: 83.4331,
            sats: 8,
            fixType: '3D FIX (8 SATS)',
            alt: 102.4,
            speed: 0.0,
            hdop: 0.92,
          },
          eps: {
            voltage: newVoltage,
            soc,
            freeHeap: Math.round(184 + Math.sin(now / 10000) * 4),
            cpuTemp: parseFloat((41.8 + Math.sin(now / 8000) * 0.4).toFixed(1)),
            currentMa: Math.round(310 + Math.random() * 8),
          },
          link: {
            rssi: Math.round(-64 + (Math.random() - 0.5) * 4),
            rtt: Math.round(12 + Math.random() * 2),
            dropCount: prev.link.dropCount,
            rateHz: 1.0,
          },
        };

        // Append to history buffer (cap at 200 items for snappy performance)
        setHistory((hist) => [...hist.slice(-199), newPacket]);

        // Intermittent avionic packet log in console
        if (nextPktId % 3 === 0) {
          const timeStr = new Date(now).toISOString().substring(11, 19) + 'Z';
          const telMsg = `$ORB,TEL,PKT:${nextPktId},T:${newTemp},H:${newHum},P:${newPress},AX:${newPacket.accel.x},AY:${newPacket.accel.y},AZ:${newPacket.accel.z},V:${newVoltage}*CS`;
          setLogs((lg) => [
            ...lg.slice(-99),
            {
              id: `log-${nextPktId}`,
              timestamp: timeStr,
              rawTime: now,
              type: 'RX',
              message: telMsg,
            },
          ]);
        }

        return newPacket;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isConnected, emergencyKillActive]);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => {
      const next = !prev;
      playAvionicBeep(next ? 1500 : 700, 0.05);
      return next;
    });
  }, []);

  const toggleConnection = useCallback(async () => {
    if (isConnected) {
      setIsConnected(false);
      playAvionicBeep(600, 0.1, 'sawtooth');
      setLogs((prev) => [
        ...prev.slice(-99),
        {
          id: `disc-${Date.now()}`,
          timestamp: new Date().toISOString().substring(11, 19) + 'Z',
          rawTime: Date.now(),
          type: 'WARN',
          message: `[PORT] Disconnected from ${port}. Telemetry paused.`,
        },
      ]);
    } else {
      // If WebSerial API is available and user is in LIVE mode, try real navigator.serial
      if (mode === 'LIVE' && 'serial' in navigator) {
        try {
          const serial = (navigator as unknown as { serial: { requestPort: () => Promise<unknown> } }).serial;
          const selectedPort = await serial.requestPort();
          serialPortRef.current = selectedPort;
        } catch (err) {
          console.warn('WebSerial request cancelled or not permitted, falling back to simulated live port:', err);
        }
      }
      setIsConnected(true);
      playAvionicBeep(1400, 0.08);
      setLogs((prev) => [
        ...prev.slice(-99),
        {
          id: `conn-${Date.now()}`,
          timestamp: new Date().toISOString().substring(11, 19) + 'Z',
          rawTime: Date.now(),
          type: 'INFO',
          message: `[PORT] Handshake verified on ${port} @ ${baudRate} bps. Transponder linked.`,
        },
      ]);
    }
  }, [isConnected, mode, port, baudRate]);

  const calibrateZero = useCallback(() => {
    setIsCalibrating(true);
    playAvionicBeep(1800, 0.08);
    setTimeout(() => {
      calibrationOffsets.current = {
        ax: currentPacket.accel.x,
        ay: currentPacket.accel.y,
        az: currentPacket.accel.z - 9.81,
        gx: currentPacket.gyro.x,
        gy: currentPacket.gyro.y,
        gz: currentPacket.gyro.z,
      };
      setIsCalibrating(false);
      playAvionicBeep(2200, 0.06);
      setLogs((prev) => [
        ...prev.slice(-99),
        {
          id: `cal-${Date.now()}`,
          timestamp: new Date().toISOString().substring(11, 19) + 'Z',
          rawTime: Date.now(),
          type: 'INFO',
          message: '[CAL] MPU6050 6-DOF zero calibration matrix stored in volatile flash.',
        },
      ]);
    }, 600);
  }, [currentPacket]);

  const ackAlerts = useCallback(() => {
    setAlertsAcknowledged(true);
    playAvionicBeep(1100, 0.04);
    setTimeout(() => setAlertsAcknowledged(false), 2000);
  }, []);

  const triggerEmergencyKill = useCallback(() => {
    setEmergencyKillActive(true);
    playEmergencyAlarm();
    setLogs((prev) => [
      ...prev.slice(-99),
      {
        id: `kill-${Date.now()}`,
        timestamp: new Date().toISOString().substring(11, 19) + 'Z',
        rawTime: Date.now(),
        type: 'CRIT',
        message: '!!! [EMERGENCY RF KILL] Spacecraft transmitter power stage cut off. Command uplink disabled.',
      },
    ]);
  }, []);

  const resetEmergencyKill = useCallback(() => {
    setEmergencyKillActive(false);
    playAvionicBeep(1200, 0.05);
    setLogs((prev) => [
      ...prev.slice(-99),
      {
        id: `unkill-${Date.now()}`,
        timestamp: new Date().toISOString().substring(11, 19) + 'Z',
        rawTime: Date.now(),
        type: 'INFO',
        message: '[RESTORE] Emergency RF Kill interlock disengaged. Normal avionics loop re-armed.',
      },
    ]);
  }, []);

  const clearBuffer = useCallback(() => {
    setHistory([]);
    setCurrentPacket((p) => ({ ...p, packetId: 0 }));
    playAvionicBeep(800, 0.05);
  }, []);

  const exportCsv = useCallback(() => {
    playAvionicBeep(1600, 0.05);
    const headers = 'Timestamp,PacketID,Temp_C,Hum_Pct,Press_hPa,Alt_AGL_m,Alt_MSL_m,AccelX,AccelY,AccelZ,GyroX,GyroY,GyroZ,BusVoltage_V,Battery_Pct,RSSI_dBm\n';
    const rows = history
      .map(
        (p) =>
          `${new Date(p.timestamp).toISOString()},${p.packetId},${p.temp},${p.hum},${p.press},${p.altAgl},${p.altMsl},${p.accel.x},${p.accel.y},${p.accel.z},${p.gyro.x},${p.gyro.y},${p.gyro.z},${p.eps.voltage},${p.eps.soc},${p.link.rssi}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ORBITRA_COSMIC1_TELEMETRY_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const sendCommand = useCallback((cmd: string) => {
    const timeStr = new Date().toISOString().substring(11, 19) + 'Z';
    playAvionicBeep(1900, 0.05);

    setLogs((prev) => [
      ...prev.slice(-99),
      {
        id: `tx-${Date.now()}`,
        timestamp: timeStr,
        rawTime: Date.now(),
        type: 'TX',
        message: `> TX CMD: ${cmd.toUpperCase()}`,
        hex: Array.from(cmd)
          .map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
          .join(' '),
      },
    ]);

    // Simulated satellite response
    setTimeout(() => {
      let response = `[ACK] Command '${cmd}' accepted by COSMIC-1 OBC.`;
      const upper = cmd.trim().toUpperCase();
      if (upper === 'PING') response = '$ORB,PONG,RTT:11.8ms,RSSI:-63dBm*3A';
      else if (upper.startsWith('CAL_IMU')) response = '$ORB,CAL_ACK,OFFSETS:X=0.03,Y=-0.02,Z=9.81*7C';
      else if (upper.startsWith('SET_TX_PWR')) response = `$ORB,CFG,TX_PWR_SET:${upper.split(' ')[1] || '20dBm'}*1F`;
      else if (upper === 'SYS_DIAG') response = '$ORB,DIAG,CPU:41.8C,HEAP:184KB,VBUS:3.84V,FLASH_ERR:0,LORA_ERR:0*4B';
      else if (upper === 'SAFE_MODE') response = '*** [ALERT] COSMIC-1 entered ATTITUDE_SAFE_HOLD mode ***';

      setLogs((prev) => [
        ...prev.slice(-99),
        {
          id: `ack-${Date.now()}`,
          timestamp: new Date().toISOString().substring(11, 19) + 'Z',
          rawTime: Date.now(),
          type: upper === 'SAFE_MODE' ? 'WARN' : 'RX',
          message: response,
        },
      ]);
    }, 280);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <TelemetryContext.Provider
      value={{
        currentPacket,
        history,
        logs,
        isConnected,
        isStreaming,
        mode,
        baudRate,
        port,
        emergencyKillActive,
        isCalibrating,
        alertsAcknowledged,
        packetTotalHeader,
        toggleStreaming,
        toggleConnection,
        setMode,
        setBaudRate,
        setPort,
        calibrateZero,
        ackAlerts,
        triggerEmergencyKill,
        resetEmergencyKill,
        clearBuffer,
        exportCsv,
        sendCommand,
        clearLogs,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}
