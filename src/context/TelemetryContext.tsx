/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPacket, ConsoleLogEntry, LiveFieldsPresent } from '../types/telemetry';
import { playAvionicBeep, playEmergencyAlarm } from '../utils/audio';

// Web Serial types declaration
interface SerialPort {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo?(): { usbVendorId?: number; usbProductId?: number };
}

interface NavigatorWithSerial extends Navigator {
  serial?: {
    requestPort(options?: unknown): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
    addEventListener(type: string, listener: (event: Event) => void): void;
    removeEventListener(type: string, listener: (event: Event) => void): void;
  };
}

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
  
  // Real Web Serial attributes & status
  isSerialSupported: boolean;
  isSerialConnected: boolean;
  isConnecting: boolean;
  serialError: string | null;
  lastPacketTime: number | null;
  livePacketCount: number;
  parseErrorCount: number;
  lastParseError: string | null;
  hasReceivedValidJson: boolean;
  awaitingDataWarning: boolean;
  liveFieldsPresent: LiveFieldsPresent;
  
  // Actions
  toggleStreaming: () => void;
  toggleConnection: () => Promise<void>;
  connectSerial: () => Promise<void>;
  disconnectSerial: () => Promise<void>;
  setMode: (mode: 'LIVE' | 'SIM') => void;
  setBaudRate: (baud: number) => void;
  setPort: (port: string) => void;
  calibrateZero: () => void;
  ackAlerts: () => void;
  triggerEmergencyKill: () => void;
  resetEmergencyKill: () => void;
  clearBuffer: () => void;
  exportCsv: () => void;
  sendCommand: (cmd: string) => Promise<void>;
  clearLogs: () => void;
  injectTestPacket: (jsonStr: string) => boolean;
  dismissSerialError: () => void;
}

const initialDemoPacket: TelemetryPacket = {
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
    fixType: '3D FIX (8 SATS)',
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

const initialLivePacket: TelemetryPacket = {
  timestamp: Date.now(),
  packetId: 0,
  temp: 0,
  hum: 0,
  press: 0,
  altAgl: 0,
  altMsl: 0,
  accel: { x: 0, y: 0, z: 0 },
  gyro: { x: 0, y: 0, z: 0 },
  orientation: { pitch: 0, roll: 0, yaw: 0 },
  quaternion: [0, 0, 0, 1],
  gnss: {
    lat: 26.7314,
    lng: 83.4331,
    sats: 0,
    fixType: 'NO FIX',
    alt: 0,
    speed: 0,
    hdop: 0,
  },
  eps: {
    voltage: 0,
    soc: 0,
    freeHeap: 0,
    cpuTemp: 0,
    currentMa: 0,
  },
  link: {
    rssi: 0,
    rtt: 0,
    dropCount: 0,
    rateHz: 0,
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
    message: '[SERIAL] Ready for Web Serial API direct connection @ 115200 8N1.',
  },
  {
    id: 'log-3',
    timestamp: '15:57:52Z',
    rawTime: Date.now() - 7000,
    type: 'INFO',
    message: '[PROTOCOL] ESP-NOW gateway format: {"temperature_c":...,"humidity_pct":...,"pressure_hpa":...}',
  },
];

const TelemetryContext = createContext<TelemetryContextType | null>(null);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  // Mode: LIVE hardware or SIM demo
  const [mode, setModeState] = useState<'LIVE' | 'SIM'>('LIVE');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [port, setPort] = useState<string>('USB Serial (ESP32 GS)');

  // Simulation state (Demo data kept strictly separate)
  const [demoPacket, setDemoPacket] = useState<TelemetryPacket>(initialDemoPacket);
  const [demoHistory, setDemoHistory] = useState<TelemetryPacket[]>([initialDemoPacket]);

  // Live Hardware state (Received directly from ground ESP32)
  const [livePacket, setLivePacket] = useState<TelemetryPacket>(initialLivePacket);
  const [liveHistory, setLiveHistory] = useState<TelemetryPacket[]>([]);
  const [liveFieldsPresent, setLiveFieldsPresent] = useState<LiveFieldsPresent>({
    temp: false,
    hum: false,
    press: false,
    alt: false,
    accel: false,
    gyro: false,
    orientation: false,
    gnss: false,
    eps: false,
    link: false,
  });

  // General controls
  const [logs, setLogs] = useState<ConsoleLogEntry[]>(initialLogs);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [emergencyKillActive, setEmergencyKillActive] = useState<boolean>(false);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [alertsAcknowledged, setAlertsAcknowledged] = useState<boolean>(false);

  // Web Serial Driver State
  const [isSerialSupported, setIsSerialSupported] = useState<boolean>(false);
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);
  const [livePacketCount, setLivePacketCount] = useState<number>(0);
  const [parseErrorCount, setParseErrorCount] = useState<number>(0);
  const [lastParseError, setLastParseError] = useState<string | null>(null);
  const [hasReceivedValidJson, setHasReceivedValidJson] = useState<boolean>(false);
  const [awaitingDataWarning, setAwaitingDataWarning] = useState<boolean>(false);

  // References for Web Serial streams & cancellation
  const serialPortRef = useRef<SerialPort | null>(null);
  const isReadingRef = useRef<boolean>(false);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const calibrationOffsets = useRef({ ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 });
  const connectTimestampRef = useRef<number | null>(null);

  // Check Web Serial support on mount
  useEffect(() => {
    const nav = navigator as NavigatorWithSerial;
    const supported = typeof nav !== 'undefined' && 'serial' in nav;
    setIsSerialSupported(supported);

    if (!supported) {
      setSerialError('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop to connect to your Ground Station ESP32.');
    }

    // Handle physical device disconnection
    const handleDisconnect = () => {
      if (serialPortRef.current) {
        disconnectSerial();
        setLogs((prev) => [
          ...prev.slice(-199),
          {
            id: `disc-event-${Date.now()}`,
            timestamp: new Date().toISOString().substring(11, 19) + 'Z',
            rawTime: Date.now(),
            type: 'WARN',
            message: '[SERIAL] USB device physically disconnected by host.',
          },
        ]);
      }
    };

    if (supported && nav.serial?.addEventListener) {
      nav.serial.addEventListener('disconnect', handleDisconnect);
      return () => {
        nav.serial?.removeEventListener('disconnect', handleDisconnect);
      };
    }
  }, []);

  // Monitor waiting for data in LIVE mode
  useEffect(() => {
    if (!isSerialConnected) {
      setAwaitingDataWarning(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const now = Date.now();
      if (!hasReceivedValidJson && connectTimestampRef.current && (now - connectTimestampRef.current > 5000)) {
        setAwaitingDataWarning(true);
      } else if (hasReceivedValidJson && lastPacketTime && (now - lastPacketTime > 6000)) {
        setAwaitingDataWarning(true);
      } else {
        setAwaitingDataWarning(false);
      }
    }, 1500);

    return () => clearInterval(checkInterval);
  }, [isSerialConnected, hasReceivedValidJson, lastPacketTime]);

  // Append a message to the console logs
  const addLog = useCallback((type: 'RX' | 'TX' | 'WARN' | 'CRIT' | 'INFO' | 'NMEA', message: string, hex?: string) => {
    const now = Date.now();
    const timestamp = new Date(now).toISOString().substring(11, 19) + 'Z';
    setLogs((prev) => [
      ...prev.slice(-199),
      {
        id: `log-${now}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp,
        rawTime: now,
        type,
        message,
        hex,
      },
    ]);
  }, []);

  // Parse and update state from received JSON object
  const handleJsonTelemetry = useCallback((data: Record<string, unknown>, rawLine: string) => {
    const now = Date.now();
    setLastPacketTime(now);
    setHasReceivedValidJson(true);
    setAwaitingDataWarning(false);
    setLivePacketCount((prev) => prev + 1);

    // Track present fields
    const newFields: Partial<LiveFieldsPresent> = {};

    // Temperature (°C)
    const rawTemp = data.temperature_c ?? data.temp_c ?? data.temperature ?? data.temp ?? data.t;
    const hasTemp = typeof rawTemp === 'number' && !isNaN(rawTemp);
    if (hasTemp) newFields.temp = true;

    // Humidity (%)
    const rawHum = data.humidity_pct ?? data.hum_pct ?? data.humidity ?? data.hum ?? data.h;
    const hasHum = typeof rawHum === 'number' && !isNaN(rawHum);
    if (hasHum) newFields.hum = true;

    // Pressure (hPa)
    const rawPress = data.pressure_hpa ?? data.press_hpa ?? data.pressure ?? data.press ?? data.p;
    const hasPress = typeof rawPress === 'number' && !isNaN(rawPress);
    if (hasPress) newFields.press = true;

    // Altitude (m)
    const rawAlt = data.altitude_m ?? data.alt_agl ?? data.alt_msl ?? data.altitude ?? data.alt ?? data.agl;
    const hasAlt = typeof rawAlt === 'number' && !isNaN(rawAlt);
    if (hasAlt) newFields.alt = true;

    // Accelerometer (m/s²)
    const rawAx = data.accel_x ?? data.ax ?? (data.accel as Record<string, unknown>)?.x;
    const rawAy = data.accel_y ?? data.ay ?? (data.accel as Record<string, unknown>)?.y;
    const rawAz = data.accel_z ?? data.az ?? (data.accel as Record<string, unknown>)?.z;
    const hasAccel = typeof rawAx === 'number' && typeof rawAy === 'number' && typeof rawAz === 'number';
    if (hasAccel) newFields.accel = true;

    // Gyroscope (°/s)
    const rawGx = data.gyro_x ?? data.gx ?? (data.gyro as Record<string, unknown>)?.x;
    const rawGy = data.gyro_y ?? data.gy ?? (data.gyro as Record<string, unknown>)?.y;
    const rawGz = data.gyro_z ?? data.gz ?? (data.gyro as Record<string, unknown>)?.z;
    const hasGyro = typeof rawGx === 'number' && typeof rawGy === 'number' && typeof rawGz === 'number';
    if (hasGyro) newFields.gyro = true;

    // Orientation Euler angles (deg)
    const rawPitch = data.pitch ?? (data.orientation as Record<string, unknown>)?.pitch;
    const rawRoll = data.roll ?? (data.orientation as Record<string, unknown>)?.roll;
    const rawYaw = data.yaw ?? (data.orientation as Record<string, unknown>)?.yaw;
    const hasExplicitOrientation = typeof rawPitch === 'number' && typeof rawRoll === 'number';
    if (hasExplicitOrientation || hasAccel) newFields.orientation = true;

    // GNSS / GPS
    const rawLat = data.latitude ?? data.lat ?? (data.gnss as Record<string, unknown>)?.lat;
    const rawLng = data.longitude ?? data.lng ?? data.lon ?? (data.gnss as Record<string, unknown>)?.lng;
    const rawSats = data.satellites ?? data.sats ?? data.sat_count ?? (data.gnss as Record<string, unknown>)?.sats;
    const hasGnss = typeof rawLat === 'number' && typeof rawLng === 'number';
    if (hasGnss) newFields.gnss = true;

    // EPS / Power
    const rawVolt = data.voltage ?? data.vbus ?? data.vbat ?? data.v_bat ?? (data.eps as Record<string, unknown>)?.voltage;
    const rawSoc = data.battery_pct ?? data.soc ?? data.battery ?? (data.eps as Record<string, unknown>)?.soc;
    const hasEps = typeof rawVolt === 'number' || typeof rawSoc === 'number';
    if (hasEps) newFields.eps = true;

    // Link
    const rawRssi = data.rssi ?? data.rssi_dbm ?? (data.link as Record<string, unknown>)?.rssi;
    const hasLink = typeof rawRssi === 'number';
    if (hasLink) newFields.link = true;

    // Update live fields presence tracking
    setLiveFieldsPresent((prev) => ({
      ...prev,
      ...newFields,
    }));

    // Update live packet without inventing values for missing fields
    setLivePacket((prev) => {
      const pktId = typeof data.packet_id === 'number' ? data.packet_id : typeof data.pkt_id === 'number' ? data.pkt_id : prev.packetId + 1;

      // Accelerations
      const ax = hasAccel ? (rawAx as number) - calibrationOffsets.current.ax : prev.accel.x;
      const ay = hasAccel ? (rawAy as number) - calibrationOffsets.current.ay : prev.accel.y;
      const az = hasAccel ? (rawAz as number) - calibrationOffsets.current.az : prev.accel.z;

      // Gyros
      const gx = hasGyro ? (rawGx as number) - calibrationOffsets.current.gx : prev.gyro.x;
      const gy = hasGyro ? (rawGy as number) - calibrationOffsets.current.gy : prev.gyro.y;
      const gz = hasGyro ? (rawGz as number) - calibrationOffsets.current.gz : prev.gyro.z;

      // Orientation calculation: if pitch/roll given explicitly use them;
      // if only accel given, compute tilt angles from gravity vector; otherwise retain previous
      let pitch = prev.orientation.pitch;
      let roll = prev.orientation.roll;
      let yaw = prev.orientation.yaw;

      if (hasExplicitOrientation) {
        pitch = rawPitch as number;
        roll = rawRoll as number;
        yaw = typeof rawYaw === 'number' ? (rawYaw as number) : prev.orientation.yaw;
      } else if (hasAccel) {
        pitch = parseFloat((Math.atan2(ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI)).toFixed(2));
        roll = parseFloat((Math.atan2(-ay, az) * (180 / Math.PI)).toFixed(2));
      }

      // Quaternion calculation from Euler
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

      // Battery voltage & State of Charge
      const voltage = typeof rawVolt === 'number' ? (rawVolt as number) : prev.eps.voltage;
      const soc = typeof rawSoc === 'number' ? (rawSoc as number) : Math.round(Math.min(100, Math.max(0, ((voltage - 3.4) / (4.2 - 3.4)) * 100)));

      const updated: TelemetryPacket = {
        timestamp: now,
        packetId: pktId,
        temp: hasTemp ? (rawTemp as number) : prev.temp,
        hum: hasHum ? (rawHum as number) : prev.hum,
        press: hasPress ? (rawPress as number) : prev.press,
        altAgl: hasAlt ? (rawAlt as number) : prev.altAgl,
        altMsl: prev.altMsl,
        accel: { x: parseFloat(ax.toFixed(2)), y: parseFloat(ay.toFixed(2)), z: parseFloat(az.toFixed(2)) },
        gyro: { x: parseFloat(gx.toFixed(2)), y: parseFloat(gy.toFixed(2)), z: parseFloat(gz.toFixed(2)) },
        orientation: { pitch, roll, yaw },
        quaternion: [qx, qy, qz, qw],
        gnss: {
          lat: hasGnss ? (rawLat as number) : prev.gnss.lat,
          lng: hasGnss ? (rawLng as number) : prev.gnss.lng,
          sats: typeof rawSats === 'number' ? (rawSats as number) : prev.gnss.sats,
          fixType: typeof data.fix_type === 'string' ? (data.fix_type as string) : hasGnss ? '3D FIX' : prev.gnss.fixType,
          alt: typeof data.gps_alt === 'number' ? (data.gps_alt as number) : prev.gnss.alt,
          speed: typeof data.speed === 'number' ? (data.speed as number) : prev.gnss.speed,
          hdop: typeof data.hdop === 'number' ? (data.hdop as number) : prev.gnss.hdop,
        },
        eps: {
          voltage: parseFloat(voltage.toFixed(2)),
          soc,
          freeHeap: typeof data.free_heap === 'number' ? (data.free_heap as number) : prev.eps.freeHeap,
          cpuTemp: typeof data.cpu_temp === 'number' ? (data.cpu_temp as number) : prev.eps.cpuTemp,
          currentMa: typeof data.current_ma === 'number' ? (data.current_ma as number) : prev.eps.currentMa,
        },
        link: {
          rssi: hasLink ? (rawRssi as number) : prev.link.rssi,
          rtt: typeof data.rtt === 'number' ? (data.rtt as number) : prev.link.rtt,
          dropCount: prev.link.dropCount,
          rateHz: 1.0,
        },
      };

      // Append to live history (capped at 200 items)
      setLiveHistory((hist) => [...hist.slice(-199), updated]);

      return updated;
    });

    playAvionicBeep(1800, 0.03);
  }, []);

  // Process a raw serial line
  const handleRawSerialLine = useCallback((rawLine: string) => {
    // 1. Display raw packet in console
    addLog('RX', rawLine);

    // 2. Parse newline-delimited JSON
    try {
      const parsed = JSON.parse(rawLine);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Payload is not a JSON object');
      }
      handleJsonTelemetry(parsed as Record<string, unknown>, rawLine);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Invalid JSON string';
      setParseErrorCount((prev) => prev + 1);
      const preview = rawLine.length > 50 ? rawLine.substring(0, 47) + '...' : rawLine;
      setLastParseError(`${errMsg} in: "${preview}"`);
      addLog('WARN', `[JSON PARSE ERROR] ${errMsg}: ${rawLine}`);
    }
  }, [addLog, handleJsonTelemetry]);

  // Read loop for Web Serial
  const startSerialReadLoop = useCallback(async (portInstance: SerialPort) => {
    isReadingRef.current = true;
    let partialLineBuffer = '';
    const decoder = new TextDecoder();

    try {
      while (portInstance.readable && isReadingRef.current) {
        const reader = portInstance.readable.getReader();
        readerRef.current = reader;

        try {
          while (isReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;

            if (value) {
              const textChunk = decoder.decode(value, { stream: true });
              partialLineBuffer += textChunk;

              let newlineIdx: number;
              while ((newlineIdx = partialLineBuffer.indexOf('\n')) !== -1) {
                const completeLine = partialLineBuffer.substring(0, newlineIdx).replace(/\r$/, '').trim();
                partialLineBuffer = partialLineBuffer.substring(newlineIdx + 1);

                if (completeLine.length > 0) {
                  handleRawSerialLine(completeLine);
                }
              }
            }
          }
        } catch (innerErr: unknown) {
          if (isReadingRef.current) {
            console.error('Serial stream reader error:', innerErr);
          }
        } finally {
          try {
            reader.releaseLock();
          } catch (_) {
            // ignore
          }
          readerRef.current = null;
        }
      }
    } catch (outerErr: unknown) {
      if (isReadingRef.current) {
        console.error('Serial stream outer loop error:', outerErr);
      }
    } finally {
      isReadingRef.current = false;
    }
  }, [handleRawSerialLine]);

  // Connect to Ground Station using Web Serial API
  const connectSerial = useCallback(async () => {
    const nav = navigator as NavigatorWithSerial;
    if (!nav.serial) {
      setSerialError('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera on desktop.');
      addLog('WARN', '[SERIAL] Web Serial API unsupported in current browser environment.');
      return;
    }

    setSerialError(null);
    setIsConnecting(true);

    try {
      // 1. Request port from user
      const selectedPort = await nav.serial.requestPort();

      // 2. Open port at 115200 baud
      await selectedPort.open({ baudRate });
      serialPortRef.current = selectedPort;
      connectTimestampRef.current = Date.now();

      setIsConnected(true);
      setIsSerialConnected(true);
      setModeState('LIVE');
      setPort('USB Serial (ESP32 GS)');

      playAvionicBeep(1400, 0.08);
      addLog('INFO', `[SERIAL] Connected to USB serial port @ ${baudRate} baud. Reading newline-delimited JSON...`);

      // 3. Start continuous read loop
      startSerialReadLoop(selectedPort);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'NotFoundError') {
        // User cancelled port selection dialog
        addLog('INFO', '[SERIAL] Port selection cancelled by user.');
      } else {
        const msg = e.message || 'Failed to open serial port';
        setSerialError(msg);
        addLog('WARN', `[SERIAL ERROR] ${msg}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [baudRate, addLog, startSerialReadLoop]);

  // Disconnect from Serial Port with robust cleanup
  const disconnectSerial = useCallback(async () => {
    isReadingRef.current = false;

    // 1. Cancel and release reader lock
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (_) {
        // ignore
      }
      try {
        readerRef.current.releaseLock();
      } catch (_) {
        // ignore
      }
      readerRef.current = null;
    }

    // 2. Close serial port
    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close();
      } catch (closeErr) {
        console.warn('Error during serial port close:', closeErr);
      }
      serialPortRef.current = null;
    }

    setIsConnected(false);
    setIsSerialConnected(false);
    playAvionicBeep(600, 0.1, 'sawtooth');
    addLog('WARN', `[SERIAL] Disconnected from USB serial port. Telemetry paused.`);
  }, [addLog]);

  // Toggle connection button
  const toggleConnection = useCallback(async () => {
    if (isSerialConnected) {
      await disconnectSerial();
    } else {
      await connectSerial();
    }
  }, [isSerialConnected, disconnectSerial, connectSerial]);

  // Switch between LIVE and SIM mode
  const setMode = useCallback((newMode: 'LIVE' | 'SIM') => {
    setModeState(newMode);
    addLog('INFO', `[MODE] Switched telemetry mode to ${newMode}.`);
  }, [addLog]);

  // Demo Simulation Loop (ONLY runs in SIM mode so demo data is kept strictly separate)
  useEffect(() => {
    if (mode !== 'SIM' || !isStreaming || emergencyKillActive) return;

    const interval = setInterval(() => {
      setDemoPacket((prev) => {
        const nextPktId = prev.packetId + 1;
        const now = Date.now();

        const tempJitter = (Math.random() - 0.48) * 0.15;
        const humJitter = (Math.random() - 0.5) * 0.25;
        const pressJitter = (Math.random() - 0.49) * 0.15;
        const altJitter = (Math.random() - 0.5) * 0.3;

        const rawAx = 0.03 + Math.sin(now / 2000) * 0.04 + (Math.random() - 0.5) * 0.02 - calibrationOffsets.current.ax;
        const rawAy = -0.02 + Math.cos(now / 2500) * 0.03 + (Math.random() - 0.5) * 0.02 - calibrationOffsets.current.ay;
        const rawAz = 9.81 + Math.sin(now / 3500) * 0.05 + (Math.random() - 0.5) * 0.02 - calibrationOffsets.current.az;

        const rawGx = 0.12 + Math.sin(now / 1500) * 0.08 - calibrationOffsets.current.gx;
        const rawGy = -0.05 + Math.cos(now / 1800) * 0.07 - calibrationOffsets.current.gy;
        const rawGz = 0.01 + Math.sin(now / 2200) * 0.05 - calibrationOffsets.current.gz;

        const pitch = parseFloat((prev.orientation.pitch + rawGx * 0.05).toFixed(2));
        const roll = parseFloat((prev.orientation.roll + rawGy * 0.05).toFixed(2));
        const yaw = parseFloat(((prev.orientation.yaw + rawGz * 0.05 + 360) % 360).toFixed(2));

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

        const newVoltage = parseFloat(Math.max(3.6, Math.min(4.15, prev.eps.voltage + (Math.random() - 0.52) * 0.005)).toFixed(2));
        const soc = Math.round(Math.min(100, Math.max(10, ((newVoltage - 3.4) / (4.2 - 3.4)) * 100)));

        const newTemp = parseFloat(Math.max(18, Math.min(32, prev.temp + tempJitter)).toFixed(1));
        const newHum = parseFloat(Math.max(40, Math.min(75, prev.hum + humJitter)).toFixed(1));
        const newPress = parseFloat(Math.max(990, Math.min(1030, prev.press + pressJitter)).toFixed(1));
        const newAltAgl = parseFloat(Math.max(130, Math.min(160, prev.altAgl + altJitter)).toFixed(1));

        const newPkt: TelemetryPacket = {
          timestamp: now,
          packetId: nextPktId,
          temp: newTemp,
          hum: newHum,
          press: newPress,
          altAgl: newAltAgl,
          altMsl: 102.4,
          accel: { x: parseFloat(rawAx.toFixed(2)), y: parseFloat(rawAy.toFixed(2)), z: parseFloat(rawAz.toFixed(2)) },
          gyro: { x: parseFloat(rawGx.toFixed(2)), y: parseFloat(rawGy.toFixed(2)), z: parseFloat(rawGz.toFixed(2)) },
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

        setDemoHistory((hist) => [...hist.slice(-199), newPkt]);

        if (nextPktId % 4 === 0) {
          const sampleJson = `{"packet_id":${nextPktId},"temperature_c":${newTemp},"humidity_pct":${newHum},"pressure_hpa":${newPress},"rssi":${newPkt.link.rssi}}`;
          addLog('RX', sampleJson);
        }

        return newPkt;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, isStreaming, emergencyKillActive, addLog]);

  // Inject a test JSON packet (for testing and verification)
  const injectTestPacket = useCallback((jsonStr: string) => {
    handleRawSerialLine(jsonStr);
    return true;
  }, [handleRawSerialLine]);

  // Send Uplink Command (writes to real Web Serial port if open)
  const sendCommand = useCallback(async (cmd: string) => {
    const timeStr = new Date().toISOString().substring(11, 19) + 'Z';
    playAvionicBeep(1900, 0.05);

    const hex = Array.from(cmd)
      .map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    setLogs((prev) => [
      ...prev.slice(-199),
      {
        id: `tx-${Date.now()}`,
        timestamp: timeStr,
        rawTime: Date.now(),
        type: 'TX',
        message: `> TX CMD: ${cmd.toUpperCase()}`,
        hex,
      },
    ]);

    // Send over Web Serial if connected
    if (serialPortRef.current && serialPortRef.current.writable) {
      try {
        const writer = serialPortRef.current.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(cmd + '\n'));
        writer.releaseLock();
      } catch (err: unknown) {
        const e = err as Error;
        addLog('WARN', `[TX ERROR] Failed to send serial command: ${e.message}`);
      }
    } else {
      // If not connected to hardware, simulate local acknowledge
      setTimeout(() => {
        let response = `[ACK] Command '${cmd}' accepted by OBC.`;
        const upper = cmd.trim().toUpperCase();
        if (upper === 'PING') response = '{"response":"PONG","rtt_ms":11.8,"rssi_dbm":-63}';
        else if (upper.startsWith('CAL_IMU')) response = '{"response":"CAL_ACK","offsets":{"x":0.03,"y":-0.02,"z":9.81}}';
        else if (upper === 'SAFE_MODE') response = '*** [ALERT] COSMIC-1 entered ATTITUDE_SAFE_HOLD mode ***';

        addLog(upper === 'SAFE_MODE' ? 'WARN' : 'RX', response);
      }, 250);
    }
  }, [addLog]);

  const calibrateZero = useCallback(() => {
    setIsCalibrating(true);
    playAvionicBeep(1800, 0.08);
    const activePkt = mode === 'LIVE' ? livePacket : demoPacket;

    setTimeout(() => {
      calibrationOffsets.current = {
        ax: activePkt.accel.x,
        ay: activePkt.accel.y,
        az: activePkt.accel.z - 9.81,
        gx: activePkt.gyro.x,
        gy: activePkt.gyro.y,
        gz: activePkt.gyro.z,
      };
      setIsCalibrating(false);
      playAvionicBeep(2200, 0.06);
      addLog('INFO', '[CAL] MPU6050 6-DOF zero calibration matrix updated.');
    }, 500);
  }, [mode, livePacket, demoPacket, addLog]);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => {
      const next = !prev;
      playAvionicBeep(next ? 1500 : 700, 0.05);
      return next;
    });
  }, []);

  const ackAlerts = useCallback(() => {
    setAlertsAcknowledged(true);
    playAvionicBeep(1100, 0.04);
    setTimeout(() => setAlertsAcknowledged(false), 2000);
  }, []);

  const triggerEmergencyKill = useCallback(() => {
    setEmergencyKillActive(true);
    playEmergencyAlarm();
    addLog('CRIT', '!!! [EMERGENCY RF KILL] Spacecraft transmitter power stage cut off. Command uplink disabled.');
  }, [addLog]);

  const resetEmergencyKill = useCallback(() => {
    setEmergencyKillActive(false);
    playAvionicBeep(1200, 0.05);
    addLog('INFO', '[RESTORE] Emergency RF Kill interlock disengaged. Normal avionics loop re-armed.');
  }, [addLog]);

  const clearBuffer = useCallback(() => {
    if (mode === 'LIVE') {
      setLiveHistory([]);
      setLivePacketCount(0);
    } else {
      setDemoHistory([]);
    }
    playAvionicBeep(800, 0.05);
  }, [mode]);

  const exportCsv = useCallback(() => {
    playAvionicBeep(1600, 0.05);
    const hist = mode === 'LIVE' ? liveHistory : demoHistory;
    const headers = 'Timestamp,PacketID,Temp_C,Hum_Pct,Press_hPa,Alt_AGL_m,Alt_MSL_m,AccelX,AccelY,AccelZ,GyroX,GyroY,GyroZ,BusVoltage_V,Battery_Pct,RSSI_dBm\n';
    const rows = hist
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
  }, [mode, liveHistory, demoHistory]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const dismissSerialError = useCallback(() => {
    setSerialError(null);
  }, []);

  // Return active packet and history based on selected mode
  const currentPacket = mode === 'LIVE' ? livePacket : demoPacket;
  const history = mode === 'LIVE' ? liveHistory : demoHistory;
  const packetTotalHeader = mode === 'LIVE' ? livePacketCount : demoPacket.packetId;

  return (
    <TelemetryContext.Provider
      value={{
        currentPacket,
        history,
        logs,
        isConnected: isSerialConnected || (mode === 'SIM' && isConnected),
        isStreaming,
        mode,
        baudRate,
        port,
        emergencyKillActive,
        isCalibrating,
        alertsAcknowledged,
        packetTotalHeader,

        isSerialSupported,
        isSerialConnected,
        isConnecting,
        serialError,
        lastPacketTime,
        livePacketCount,
        parseErrorCount,
        lastParseError,
        hasReceivedValidJson,
        awaitingDataWarning,
        liveFieldsPresent,

        toggleStreaming,
        toggleConnection,
        connectSerial,
        disconnectSerial,
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
        injectTestPacket,
        dismissSerialError,
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
