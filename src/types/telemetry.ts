/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TelemetryPacket {
  timestamp: number; // ms
  packetId: number;
  temp: number; // °C DHT11
  hum: number; // % DHT11
  press: number; // hPa BMP280
  altAgl: number; // m Rel Launch Datum
  altMsl: number; // m MSL
  accel: {
    x: number;
    y: number;
    z: number;
  }; // m/s²
  gyro: {
    x: number;
    y: number;
    z: number;
  }; // °/s
  orientation: {
    pitch: number;
    roll: number;
    yaw: number;
  }; // deg
  quaternion: [number, number, number, number];
  gnss: {
    lat: number;
    lng: number;
    sats: number;
    fixType: string;
    alt: number;
    speed: number;
    hdop: number;
  };
  eps: {
    voltage: number; // V
    soc: number; // %
    freeHeap: number; // KB
    cpuTemp: number; // °C
    currentMa: number;
  };
  link: {
    rssi: number; // dBm
    rtt: number; // ms
    dropCount: number;
    rateHz: number;
  };
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  rawTime: number;
  type: 'RX' | 'TX' | 'WARN' | 'CRIT' | 'INFO' | 'NMEA';
  message: string;
  hex?: string;
}

export interface SatellitePass {
  id: string;
  aos: string;
  los: string;
  duration: string;
  maxElevation: number; // deg
  azimuthAos: number; // deg
  azimuthLos: number; // deg
  status: 'UPCOMING' | 'ACTIVE' | 'PASSED';
  dopplerShiftKhz: number;
}export interface LiveFieldsPresent {
  temp: boolean;
  hum: boolean;
  press: boolean;
  alt: boolean;
  accel: boolean;
  gyro: boolean;
  orientation: boolean;
  gnss: boolean;
  eps: boolean;
  link: boolean;
}

export interface SerialStatus {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  portLabel: string;
  baudRate: number;
  lastPacketTime: number | null;
  livePacketCount: number;
  parseErrorCount: number;
  lastParseError: string | null;
  hasReceivedValidJson: boolean;
  awaitingDataWarning: boolean;
  error: string | null;
}
