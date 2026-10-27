# ORBITRA GS-01 Ground Station Telemetry Protocol

This document specifies the exact JSON protocol for transmitting telemetry from the Ground-Station ESP32 to the ORBITRA GS-01 web dashboard over USB Serial via the Web Serial API.

---

## 1. Physical & Serial Link Configuration

- **Transport:** USB Serial (CDC / UART)
- **Baud Rate:** `115200` baud
- **Data Bits:** 8
- **Stop Bits:** 1
- **Parity:** None (8-N-1)
- **Flow Control:** None
- **Line Framing:** Newline-delimited (`\n` or `\r\n`). Each line **must** be a single complete JSON object.

---

## 2. Minimal Sample Packet

Compatible with the standard DHT11 / BMP280 environmental packet:

```json
{"temperature_c":27.2,"humidity_pct":58,"pressure_hpa":1007.8}
```

---

## 3. Full Sensor JSON Schema & Field Names

The dashboard parses one complete JSON object per line. All fields are optional; if a field is omitted, the dashboard will not invent or guess its value.

| Field Name | Type | Unit | Description | Alternative Accepted Keys |
| :--- | :--- | :--- | :--- | :--- |
| `temperature_c` | `number` | °C | Ambient or payload temperature (DHT11 / BMP280) | `temp_c`, `temperature`, `temp`, `t` |
| `humidity_pct` | `number` | % | Relative humidity (DHT11) | `humidity`, `hum_pct`, `hum`, `h` |
| `pressure_hpa` | `number` | hPa | Barometric atmospheric pressure (BMP280) | `pressure`, `press_hpa`, `press`, `p` |
| `altitude_m` | `number` | m | Altitude relative to datum or MSL | `altitude`, `alt_agl`, `alt_msl`, `alt_m`, `alt` |
| `accel_x` | `number` | m/s² | MPU6050 X-axis acceleration | `ax`, `acc_x` |
| `accel_y` | `number` | m/s² | MPU6050 Y-axis acceleration | `ay`, `acc_y` |
| `accel_z` | `number` | m/s² | MPU6050 Z-axis acceleration (+9.81 m/s² nominal 1G) | `az`, `acc_z` |
| `gyro_x` | `number` | °/s | MPU6050 X-axis angular velocity | `gx`, `gyr_x` |
| `gyro_y` | `number` | °/s | MPU6050 Y-axis angular velocity | `gy`, `gyr_y` |
| `gyro_z` | `number` | °/s | MPU6050 Z-axis angular velocity | `gz`, `gyr_z` |
| `pitch` | `number` | deg | Pitch Euler angle (-180° to +180°) | `orientation.pitch` |
| `roll` | `number` | deg | Roll Euler angle (-180° to +180°) | `orientation.roll` |
| `yaw` | `number` | deg | Yaw / heading Euler angle (0° to 360°) | `orientation.yaw` |
| `latitude` | `number` | deg | GPS Latitude in decimal degrees (e.g. `26.7314`) | `lat` |
| `longitude` | `number` | deg | GPS Longitude in decimal degrees (e.g. `83.4331`) | `lng`, `lon` |
| `satellites` | `number` | count | GNSS satellites in view | `sats`, `sat_count` |
| `gps_alt` | `number` | m | GNSS altitude above ellipsoid | `alt_gps` |
| `fix_type` | `string` | text | GPS fix descriptor (e.g. `"3D FIX"`) | `fix` |
| `voltage` | `number` | V | EPS 1S LiPo bus voltage (e.g. `3.85`) | `vbus`, `vbat`, `v_bat` |
| `battery_pct` | `number` | % | State of charge (0 - 100%) | `soc`, `battery` |
| `free_heap` | `number` | KB | ESP32 free heap memory in KB | `heap` |
| `cpu_temp` | `number` | °C | ESP32 internal core temperature | `core_temp` |
| `rssi` | `number` | dBm | ESP-NOW signal strength received at Ground Station | `rssi_dbm` |
| `packet_id` | `number` | integer | Incremental packet sequence counter | `pkt_id`, `seq`, `id` |

---

## 4. Comprehensive Full Packet Example

```json
{
  "packet_id": 1052,
  "temperature_c": 27.2,
  "humidity_pct": 58.0,
  "pressure_hpa": 1007.8,
  "altitude_m": 142.5,
  "accel_x": 0.04,
  "accel_y": -0.02,
  "accel_z": 9.81,
  "gyro_x": 0.15,
  "gyro_y": -0.05,
  "gyro_z": 0.02,
  "pitch": 2.1,
  "roll": -1.2,
  "yaw": 44.0,
  "latitude": 26.7314,
  "longitude": 83.4331,
  "satellites": 8,
  "voltage": 3.84,
  "battery_pct": 84,
  "rssi": -65,
  "free_heap": 182
}
```

---

## 5. Reference ESP32 Ground Station Firmware (Arduino / C++)

The Ground-Station ESP32 receives packets from the CubeSat over **ESP-NOW** and forwards them directly to the USB Serial port at **115200 baud** as newline-delimited JSON:

```cpp
#include <esp_now.h>
#include <WiFi.h>

// Struct matching the CubeSat ESP-NOW payload
typedef struct struct_message {
  float temperature_c;
  float humidity_pct;
  float pressure_hpa;
  float accel_x;
  float accel_y;
  float accel_z;
  float gyro_x;
  float gyro_y;
  float gyro_z;
  float pitch;
  float roll;
  float yaw;
  float lat;
  float lng;
  int sats;
  float voltage;
  uint32_t packet_id;
} struct_message;

struct_message incomingData;

// ESP-NOW Receive Callback
void OnDataRecv(const esp_now_recv_info_t *esp_now_info, const uint8_t *data, int len) {
  memcpy(&incomingData, data, sizeof(incomingData));
  int8_t rssi = esp_now_info->rx_ctrl->rssi;

  // Format as single-line JSON string
  Serial.printf(
    "{\"packet_id\":%u,\"temperature_c\":%.2f,\"humidity_pct\":%.1f,\"pressure_hpa\":%.2f,"
    "\"accel_x\":%.2f,\"accel_y\":%.2f,\"accel_z\":%.2f,"
    "\"pitch\":%.1f,\"roll\":%.1f,\"yaw\":%.1f,"
    "\"lat\":%.4f,\"lng\":%.4f,\"sats\":%d,"
    "\"voltage\":%.2f,\"rssi\":%d}\n",
    incomingData.packet_id,
    incomingData.temperature_c,
    incomingData.humidity_pct,
    incomingData.pressure_hpa,
    incomingData.accel_x,
    incomingData.accel_y,
    incomingData.accel_z,
    incomingData.pitch,
    incomingData.roll,
    incomingData.yaw,
    incomingData.lat,
    incomingData.lng,
    incomingData.sats,
    incomingData.voltage,
    rssi
  );
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK) {
    Serial.println("{\"error\":\"ESP-NOW Init Failed\"}");
    return;
  }

  esp_now_register_recv_cb(OnDataRecv);
}

void loop() {
  // Check for commands sent from the dashboard
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      // Forward command over ESP-NOW to CubeSat or process locally
    }
  }
}
```
