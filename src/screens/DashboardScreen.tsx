/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useTelemetry } from '../context/TelemetryContext';

export function DashboardScreen() {
  const {
    currentPacket,
    history,
    isConnected,
    isSerialConnected,
    isStreaming,
    mode,
    liveFieldsPresent,
    lastPacketTime,
    livePacketCount,
    parseErrorCount,
    toggleStreaming,
    toggleConnection,
    connectSerial,
    disconnectSerial,
    calibrateZero,
    ackAlerts,
    clearBuffer,
    exportCsv,
    isCalibrating,
    alertsAcknowledged,
  } = useTelemetry();

  // 3D Viewport Refs
  const mountRef = useRef<HTMLDivElement>(null);
  const cubeSatGroupRef = useRef<THREE.Group | null>(null);
  const manualRotationRef = useRef({ x: 0.3, y: -0.5 });
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Calculate min/max for sensor cards from history
  const sensorStats = useMemo(() => {
    const recent = history.slice(-60);
    const temps = recent.map((p) => p.temp);
    const hums = recent.map((p) => p.hum);
    const press = recent.map((p) => p.press);
    const alts = recent.map((p) => p.altAgl);

    return {
      temp: {
        min: temps.length ? Math.min(...temps) : 25.8,
        max: temps.length ? Math.max(...temps) : 27.2,
      },
      hum: {
        min: hums.length ? Math.min(...hums) : 52.0,
        max: hums.length ? Math.max(...hums) : 56.5,
      },
      press: {
        min: press.length ? Math.min(...press) : 1010.8,
        max: press.length ? Math.max(...press) : 1012.0,
      },
      alt: {
        min: alts.length ? Math.min(...alts) : 141.5,
        max: alts.length ? Math.max(...alts) : 144.2,
      },
    };
  }, [history]);

  // Sparkline generator for Temperature
  const tempSparkline = useMemo(() => {
    const recent = history.slice(-20);
    if (recent.length < 2) return '0,15 50,12 100,8';
    const min = sensorStats.temp.min - 0.2;
    const max = sensorStats.temp.max + 0.2;
    return recent
      .map((item, idx) => {
        const x = (idx / (recent.length - 1)) * 100;
        const norm = (item.temp - min) / (max - min || 1);
        const y = 20 - norm * 16;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [history, sensorStats.temp]);

  // Sparkline generator for Pressure (Purple #A78BFA)
  const pressSparkline = useMemo(() => {
    const recent = history.slice(-20);
    if (recent.length < 2) return '0,14 50,10 100,6';
    const min = sensorStats.press.min - 0.2;
    const max = sensorStats.press.max + 0.2;
    return recent
      .map((item, idx) => {
        const x = (idx / (recent.length - 1)) * 100;
        const norm = (item.press - min) / (max - min || 1);
        const y = 20 - norm * 16;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [history, sensorStats.press]);

  // Center 3D Satellite Viewport Initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1020);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 3.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Simple lighting: Ambient + One Directional Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 5, 3.5);
    scene.add(dirLight);

    // Grid below
    const gridHelper = new THREE.GridHelper(8, 16, 0x22d3ee, 0x1e2a3f);
    gridHelper.position.y = -1.3;
    scene.add(gridHelper);

    // 3D Cube Model Group
    const cubeSat = new THREE.Group();
    cubeSat.renderOrder = 2;
    cubeSatGroupRef.current = cubeSat;

    const cubeSize = 1.35;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // 6 Faces: Semi-transparent Cyan (#00E5FF @ 35% opacity), Orange on +X front
    const faceMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0xff6d00, // +X FRONT
        roughness: 0.2,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x0096c7, // -X
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x7df4ff, // +Y
        roughness: 0.2,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x0077b6, // -Y
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff, // +Z
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      new THREE.MeshStandardMaterial({
        color: 0x00f5d4, // -Z
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ];

    const cubeMesh = new THREE.Mesh(cubeGeo, faceMaterials);
    cubeSat.add(cubeMesh);

    // Front +X orange marker frame
    const frontMarkerGeo = new THREE.PlaneGeometry(0.85, 0.85);
    const frontMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xff6d00,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const frontMarker = new THREE.Mesh(frontMarkerGeo, frontMarkerMat);
    frontMarker.position.set(cubeSize / 2 + 0.005, 0, 0);
    frontMarker.rotation.y = Math.PI / 2;
    cubeSat.add(frontMarker);

    // Neon green outlines (2px thick)
    const edgeRadius = 0.014;
    const edgeTubeMat = new THREE.MeshBasicMaterial({ color: 0x00ff9c });
    const halfS = cubeSize / 2;

    const edgeXGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius, cubeSize, 8);
    [[-halfS, -halfS], [-halfS, halfS], [halfS, -halfS], [halfS, halfS]].forEach(([y, z]) => {
      const tube = new THREE.Mesh(edgeXGeo, edgeTubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, y, z);
      cubeSat.add(tube);
    });

    const edgeYGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius, cubeSize, 8);
    [[-halfS, -halfS], [-halfS, halfS], [halfS, -halfS], [halfS, halfS]].forEach(([x, z]) => {
      const tube = new THREE.Mesh(edgeYGeo, edgeTubeMat);
      tube.position.set(x, 0, z);
      cubeSat.add(tube);
    });

    const edgeZGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius, cubeSize, 8);
    [[-halfS, -halfS], [-halfS, halfS], [halfS, -halfS], [halfS, halfS]].forEach(([x, y]) => {
      const tube = new THREE.Mesh(edgeZGeo, edgeTubeMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(x, y, 0);
      cubeSat.add(tube);
    });

    // Internal RGB coordinate axes
    const axesHelper = new THREE.AxesHelper(1.2);
    cubeSat.add(axesHelper);

    scene.add(cubeSat);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (cubeSatGroupRef.current) {
        const targetPitch = (currentPacket.orientation.pitch * Math.PI) / 180 + manualRotationRef.current.x;
        const targetRoll = (currentPacket.orientation.roll * Math.PI) / 180;
        const targetYaw = (currentPacket.orientation.yaw * Math.PI) / 180 + manualRotationRef.current.y;

        cubeSatGroupRef.current.rotation.x = THREE.MathUtils.damp(cubeSatGroupRef.current.rotation.x, targetPitch, 8, 0.016);
        cubeSatGroupRef.current.rotation.y = THREE.MathUtils.damp(cubeSatGroupRef.current.rotation.y, targetYaw, 8, 0.016);
        cubeSatGroupRef.current.rotation.z = THREE.MathUtils.damp(cubeSatGroupRef.current.rotation.z, targetRoll, 8, 0.016);
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - previousMousePositionRef.current.x;
      const dy = e.clientY - previousMousePositionRef.current.y;
      manualRotationRef.current.y += dx * 0.008;
      manualRotationRef.current.x += dy * 0.008;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      faceMaterials.forEach((m) => m.dispose());
      edgeTubeMat.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentPacket.orientation.pitch, currentPacket.orientation.roll, currentPacket.orientation.yaw]);

  const setViewPreset = (preset: 'iso' | 'top' | 'nadir' | 'solar') => {
    if (preset === 'iso') manualRotationRef.current = { x: 0.3, y: -0.5 };
    else if (preset === 'top') manualRotationRef.current = { x: -Math.PI / 2, y: 0 };
    else if (preset === 'nadir') manualRotationRef.current = { x: Math.PI / 2, y: 0 };
    else if (preset === 'solar') manualRotationRef.current = { x: 0, y: Math.PI / 2 };
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-4 pb-20">
      {/* Dense 3-Column Grid on Laptop/Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Sensor Cards (4 columns on lg) */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          {/* Card 1: Temperature */}
          <div className="space-card relative flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#22D3EE] text-[16px]">thermostat</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  TEMPERATURE
                </span>
              </div>
              <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${
                mode === 'LIVE' && !liveFieldsPresent.temp
                  ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20'
                  : 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20'
              }`}>
                {mode === 'LIVE' && !liveFieldsPresent.temp ? 'AWAITING' : 'NOMINAL'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="font-mono text-[38px] font-light text-white tracking-tight leading-none">
                {mode === 'LIVE' && !liveFieldsPresent.temp ? '--' : currentPacket.temp.toFixed(1)}
              </span>
              <span className="text-[#8B9BB4] text-sm font-normal">°C</span>
            </div>

            {/* Min/Max and Thin Sparkline in Cyan */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8B9BB4] pt-1">
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.temp
                  ? 'KEY: "temperature_c"'
                  : `MIN: ${sensorStats.temp.min.toFixed(1)}°`}
              </span>
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.temp
                  ? ''
                  : `MAX: ${sensorStats.temp.max.toFixed(1)}°`}
              </span>
            </div>
            <div className="w-full h-5 mt-1">
              {mode === 'LIVE' && !liveFieldsPresent.temp ? (
                <div className="w-full h-[1px] bg-[#1E2A3F] mt-2.5" />
              ) : (
                <svg className="w-full h-full text-[#22D3EE]" fill="none" viewBox="0 0 100 24">
                  <path d={`M ${tempSparkline}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>

          {/* Card 2: Humidity */}
          <div className="space-card relative flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#22D3EE] text-[16px]">water_drop</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  HUMIDITY
                </span>
              </div>
              <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${
                mode === 'LIVE' && !liveFieldsPresent.hum
                  ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20'
                  : 'bg-[#22D3EE]/10 text-[#22D3EE] border-[#22D3EE]/20'
              }`}>
                {mode === 'LIVE' && !liveFieldsPresent.hum ? 'AWAITING' : 'STABLE'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="font-mono text-[38px] font-light text-white tracking-tight leading-none">
                {mode === 'LIVE' && !liveFieldsPresent.hum ? '--' : currentPacket.hum.toFixed(1)}
              </span>
              <span className="text-[#8B9BB4] text-sm font-normal">% RH</span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8B9BB4] pt-1">
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.hum
                  ? 'KEY: "humidity_pct"'
                  : `MIN: ${sensorStats.hum.min.toFixed(1)}%`}
              </span>
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.hum
                  ? ''
                  : `MAX: ${sensorStats.hum.max.toFixed(1)}%`}
              </span>
            </div>
            {/* Thin Progress Bar in Cyan */}
            <div className="w-full bg-[#0A1020] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#1E2A3F]">
              <div
                className="h-full bg-[#22D3EE] rounded-full transition-all duration-300"
                style={{
                  width:
                    mode === 'LIVE' && !liveFieldsPresent.hum
                      ? '0%'
                      : `${Math.min(100, Math.max(5, currentPacket.hum))}%`,
                }}
              />
            </div>
          </div>

          {/* Card 3: Pressure (Soft Purple #A78BFA) */}
          <div className="space-card relative flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#A78BFA] text-[16px]">compress</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  BAROMETRIC PRESSURE
                </span>
              </div>
              <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${
                mode === 'LIVE' && !liveFieldsPresent.press
                  ? 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/20'
                  : 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20'
              }`}>
                {mode === 'LIVE' && !liveFieldsPresent.press ? 'AWAITING' : 'STABLE'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="font-mono text-[38px] font-light text-white tracking-tight leading-none">
                {mode === 'LIVE' && !liveFieldsPresent.press ? '--' : currentPacket.press.toFixed(1)}
              </span>
              <span className="text-[#A78BFA] text-sm font-normal">hPa</span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8B9BB4] pt-1">
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.press
                  ? 'KEY: "pressure_hpa"'
                  : `MIN: ${sensorStats.press.min.toFixed(1)}`}
              </span>
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.press
                  ? ''
                  : `MAX: ${sensorStats.press.max.toFixed(1)}`}
              </span>
            </div>
            {/* Sparkline in Purple */}
            <div className="w-full h-5 mt-1">
              {mode === 'LIVE' && !liveFieldsPresent.press ? (
                <div className="w-full h-[1px] bg-[#1E2A3F] mt-2.5" />
              ) : (
                <svg className="w-full h-full text-[#A78BFA]" fill="none" viewBox="0 0 100 24">
                  <path d={`M ${pressSparkline}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>

          {/* Card 4: Altitude AGL */}
          <div className="space-card relative flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#34D399] text-[16px]">height</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  EST. ALTITUDE (AGL)
                </span>
              </div>
              <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${
                mode === 'LIVE' && !liveFieldsPresent.alt
                  ? 'bg-[#8B9BB4]/10 text-[#8B9BB4] border-[#8B9BB4]/20'
                  : 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20'
              }`}>
                {mode === 'LIVE' && !liveFieldsPresent.alt ? 'OPTIONAL' : 'DATUM REL'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="font-mono text-[38px] font-light text-white tracking-tight leading-none">
                {mode === 'LIVE' && !liveFieldsPresent.alt ? '--' : currentPacket.altAgl.toFixed(1)}
              </span>
              <span className="text-[#34D399] text-sm font-normal">m</span>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8B9BB4] pt-1">
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.alt
                  ? 'KEY: "altitude_m"'
                  : `MIN: ${sensorStats.alt.min.toFixed(1)}m`}
              </span>
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.alt
                  ? ''
                  : `MAX: ${sensorStats.alt.max.toFixed(1)}m`}
              </span>
            </div>
            {/* Thin Progress Bar in Green */}
            <div className="w-full bg-[#0A1020] h-1.5 rounded-full overflow-hidden mt-1.5 border border-[#1E2A3F]">
              <div
                className="h-full bg-[#34D399] rounded-full transition-all duration-300"
                style={{
                  width:
                    mode === 'LIVE' && !liveFieldsPresent.alt
                      ? '0%'
                      : `${Math.min(100, (currentPacket.altAgl / 200) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTRE COLUMN: Large 3D Satellite View (6 columns on lg) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 flex flex-col gap-3.5">
          <div className="space-card relative flex flex-col justify-between h-full min-h-[520px] p-0 overflow-hidden">
            {/* Header of 3D Panel */}
            <div className="p-4 pb-2 flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#22D3EE] text-[18px]">view_in_ar</span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-white font-semibold">
                  3D SATELLITE ATTITUDE
                </span>
                <span className="font-mono text-[10px] text-[#8B9BB4]">COSMIC-1 (MPU6050)</span>
              </div>
              <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full ${
                mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                  ? 'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]'
                  : 'bg-[#34D399]/10 border-[#34D399]/20 text-[#34D399]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                    ? 'bg-[#FBBF24]'
                    : 'bg-[#34D399]'
                }`} />
                <span className="font-mono text-[9px] font-medium">
                  {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                    ? 'AWAITING MPU6050'
                    : 'INERTIAL LOCK'}
                </span>
              </div>
            </div>

            {/* Center 3D Box Container with Corner Brackets & Grid */}
            <div className="relative flex-1 w-full bg-[#0A1020] tech-grid overflow-hidden flex items-center justify-center">
              {/* Corner Brackets */}
              <div className="corner-bracket-tl" />
              <div className="corner-bracket-tr" />
              <div className="corner-bracket-bl" />
              <div className="corner-bracket-br" />

              {/* Three.js Canvas Mount */}
              <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

              {/* Green Horizon Line */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-[1.5px] bg-[#00FF9C] shadow-[0_0_8px_rgba(0,255,156,0.7)] flex items-center justify-between">
                  <div className="w-3 h-1.5 border-l border-t border-[#00FF9C] -translate-y-1" />
                  <div className="w-3 h-1.5 border-r border-t border-[#00FF9C] -translate-y-1" />
                </div>
              </div>

              {/* Euler Angles HUD Pill */}
              <div className="absolute top-3 left-3 bg-[#111A2B]/85 backdrop-blur-md border border-[#1E2A3F] rounded-lg px-2.5 py-1.5 font-mono text-[10px] flex items-center gap-3 pointer-events-none">
                <div>
                  <span className="text-[#8B9BB4] text-[8px] block">PITCH</span>
                  <span className="text-[#22D3EE] font-medium">
                    {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                      ? '--'
                      : currentPacket.orientation.pitch >= 0
                      ? `+${currentPacket.orientation.pitch.toFixed(1)}°`
                      : `${currentPacket.orientation.pitch.toFixed(1)}°`}
                  </span>
                </div>
                <div>
                  <span className="text-[#8B9BB4] text-[8px] block">ROLL</span>
                  <span className="text-[#A78BFA] font-medium">
                    {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                      ? '--'
                      : currentPacket.orientation.roll >= 0
                      ? `+${currentPacket.orientation.roll.toFixed(1)}°`
                      : `${currentPacket.orientation.roll.toFixed(1)}°`}
                  </span>
                </div>
                <div>
                  <span className="text-[#8B9BB4] text-[8px] block">YAW</span>
                  <span className="text-[#34D399] font-medium">
                    {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                      ? '--'
                      : `${currentPacket.orientation.yaw.toFixed(1)}°`}
                  </span>
                </div>
              </div>

              {/* Quaternion HUD Pill */}
              <div className="absolute top-3 right-3 bg-[#111A2B]/85 backdrop-blur-md border border-[#1E2A3F] rounded-lg px-2.5 py-1.5 font-mono text-[9px] text-[#8B9BB4] pointer-events-none hidden sm:block">
                <span>
                  {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                    ? 'Q: Awaiting IMU'
                    : `Q: [${currentPacket.quaternion.join(', ')}]`}
                </span>
              </div>
            </div>

            {/* Bottom Row: View Buttons (ISO, TOP, NADIR, SOLAR) & Zero Calibrate */}
            <div className="p-3 bg-[#111A2B] border-t border-[#1E2A3F] flex items-center justify-between flex-wrap gap-2 z-10">
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="text-[#8B9BB4] uppercase text-[9px] mr-1 hidden sm:inline">VIEW:</span>
                {(['iso', 'top', 'nadir', 'solar'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setViewPreset(view)}
                    className="bg-[#0A1020] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white px-2.5 py-1 rounded uppercase font-semibold transition-colors"
                  >
                    {view}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={calibrateZero}
                  disabled={isCalibrating}
                  className="bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020] px-3 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-sm"
                >
                  <span className={`material-symbols-outlined text-[13px] ${isCalibrating ? 'animate-spin' : ''}`}>
                    adjust
                  </span>
                  <span>{isCalibrating ? 'CALIBRATING...' : 'CALIBRATE ZERO'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: GPS Radar and Status Cards (3 columns on lg) */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-3.5">
          {/* Card 1: GPS Radar */}
          <div className="space-card relative flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#22D3EE] text-[16px]">radar</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  GNSS RADAR
                </span>
              </div>
              <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${
                mode === 'LIVE' && !liveFieldsPresent.gnss
                  ? 'bg-[#8B9BB4]/10 text-[#8B9BB4] border-[#8B9BB4]/20'
                  : 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20'
              }`}>
                {mode === 'LIVE' && !liveFieldsPresent.gnss
                  ? 'NO FIX (AWAITING)'
                  : `${currentPacket.gnss.fixType}`}
              </span>
            </div>

            {/* Circular Radar with Green Dots, Cyan Sweep Cone & Coordinates */}
            <div className="relative w-full aspect-square max-w-[200px] mx-auto my-2 rounded-full bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center overflow-hidden">
              {/* Concentric rings */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-[#1E2A3F]" />
              <div className="absolute w-[50%] h-[50%] rounded-full border border-[#1E2A3F]" />
              <div className="absolute w-[20%] h-[20%] rounded-full border border-[#1E2A3F]" />

              {/* Crosshairs */}
              <div className="absolute w-full h-[1px] bg-[#1E2A3F]" />
              <div className="absolute h-full w-[1px] bg-[#1E2A3F]" />

              {/* Cyan Sweep Cone */}
              <div
                className="absolute inset-0 animate-radar-sweep pointer-events-none"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(34, 211, 238, 0.35) 360deg)',
                }}
              />

              {/* Target Satellite Dots */}
              <div className="absolute top-[28%] left-[35%] w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_6px_#34D399]" />
              <div className="absolute top-[65%] left-[70%] w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_5px_#34D399]" />
              <div className="absolute top-[40%] left-[78%] w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_6px_#34D399]" />
              <div className="absolute top-[75%] left-[25%] w-1.5 h-1.5 rounded-full bg-[#34D399] shadow-[0_0_5px_#34D399]" />

              {/* Ground Station Center Dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] border border-white z-10" />
            </div>

            {/* Radar Coordinates Label Tag */}
            <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-2 font-mono text-[10px] text-center">
              <span className="text-[#22D3EE] font-bold block">
                {mode === 'LIVE' && !liveFieldsPresent.gnss
                  ? 'AWAITING GPS TELEMETRY'
                  : `${currentPacket.gnss.lat.toFixed(4)}° N, ${currentPacket.gnss.lng.toFixed(4)}° E`}
              </span>
              <span className="text-[#8B9BB4] text-[9px]">
                {mode === 'LIVE' && !liveFieldsPresent.gnss
                  ? 'KEYS: "latitude", "longitude"'
                  : 'MMMUT GORAKHPUR GROUND STATION'}
              </span>
            </div>
          </div>

          {/* Card 2: Electrical Power System (EPS) Health */}
          <div className="space-card relative flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#34D399] text-[16px]">bolt</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  POWER BUS & BATTERY
                </span>
              </div>
              <span className={`font-mono text-[9px] border px-1.5 py-0.5 rounded-full font-medium ${
                mode === 'LIVE' && !liveFieldsPresent.eps
                  ? 'bg-[#8B9BB4]/10 text-[#8B9BB4] border-[#8B9BB4]/20'
                  : 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20'
              }`}>
                {mode === 'LIVE' && !liveFieldsPresent.eps ? 'NO SENSOR' : 'CHARGED'}
              </span>
            </div>

            <div className="flex items-baseline justify-between my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-[38px] font-light text-white tracking-tight leading-none">
                  {mode === 'LIVE' && !liveFieldsPresent.eps ? '--' : currentPacket.eps.voltage.toFixed(2)}
                </span>
                <span className="text-[#8B9BB4] text-sm">V</span>
              </div>
              <span className="font-mono text-[14px] text-[#34D399] font-medium">
                {mode === 'LIVE' && !liveFieldsPresent.eps ? '--%' : `${currentPacket.eps.soc}%`}
              </span>
            </div>

            {/* Segmented Battery Bar */}
            <div className="w-full bg-[#0A1020] h-2 rounded-full overflow-hidden border border-[#1E2A3F] p-0.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-sm ${
                    mode === 'LIVE' && !liveFieldsPresent.eps
                      ? 'bg-[#1E2A3F]'
                      : currentPacket.eps.soc >= idx * 18
                      ? 'bg-[#34D399]'
                      : 'bg-[#1E2A3F]'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8B9BB4] pt-2">
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.eps
                  ? 'CPU: --'
                  : `CPU TEMP: ${currentPacket.eps.cpuTemp.toFixed(1)}°C`}
              </span>
              <span>
                {mode === 'LIVE' && !liveFieldsPresent.eps
                  ? 'HEAP: --'
                  : `FREE HEAP: ${currentPacket.eps.freeHeap} KB`}
              </span>
            </div>
          </div>

          {/* Card 3: Mission Actions & Controls */}
          <div className="space-card relative flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#22D3EE] text-[16px]">tune</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#8B9BB4] font-semibold">
                  GROUND STATION LINK
                </span>
              </div>
              <span className={`font-mono text-[9px] font-bold ${
                isSerialConnected ? 'text-[#34D399]' : 'text-[#8B9BB4]'
              }`}>
                {isSerialConnected ? '115200 BAUD' : 'OFFLINE'}
              </span>
            </div>

            {/* Quick Connect / Disconnect button */}
            <button
              onClick={isSerialConnected ? disconnectSerial : connectSerial}
              className={`w-full py-2 rounded-lg font-mono text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                isSerialConnected
                  ? 'bg-[#F43F5E]/15 hover:bg-[#F43F5E]/25 text-[#F43F5E] border border-[#F43F5E]/30'
                  : 'bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isSerialConnected ? 'link_off' : 'usb'}
              </span>
              <span>{isSerialConnected ? 'DISCONNECT GROUND STATION' : 'CONNECT GROUND STATION'}</span>
            </button>

            {/* Live Packet & Error Summary */}
            <div className="bg-[#0A1020] border border-[#1E2A3F] rounded-lg p-2 font-mono text-[10px] flex items-center justify-between text-[#8B9BB4]">
              <div>
                <span>PKTS: </span>
                <span className="text-white font-bold">{livePacketCount}</span>
              </div>
              <span>|</span>
              <div>
                <span>ERRORS: </span>
                <span className={parseErrorCount > 0 ? 'text-[#F43F5E] font-bold' : 'text-[#34D399]'}>
                  {parseErrorCount}
                </span>
              </div>
              <span>|</span>
              <div>
                <span>MODE: </span>
                <span className="text-[#22D3EE] font-bold">{mode}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <button
                onClick={toggleStreaming}
                className="bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-white py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px] text-[#22D3EE]">
                  {isStreaming ? 'pause_circle' : 'play_circle'}
                </span>
                <span>{isStreaming ? 'PAUSE' : 'RESUME'}</span>
              </button>

              <button
                onClick={exportCsv}
                className="bg-[#111A2B] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-white py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px] text-[#22D3EE]">download</span>
                <span>EXPORT CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
