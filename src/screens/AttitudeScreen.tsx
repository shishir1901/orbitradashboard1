/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTelemetry } from '../context/TelemetryContext';

export function AttitudeScreen() {
  const { currentPacket, calibrateZero, isCalibrating, mode, liveFieldsPresent } = useTelemetry();
  const mountRef = useRef<HTMLDivElement>(null);

  const [wireframe, setWireframe] = useState<boolean>(false);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeSatGroupRef = useRef<THREE.Group | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const materialsRef = useRef<THREE.Material[]>([]);

  // Manual rotation drag state
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const manualRotationRef = useRef({ x: 0.3, y: -0.5 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Detect software GL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x080e1c);
    scene.fog = new THREE.FogExp2(0x080e1c, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 3.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 4. Simple Lighting: Ambient + One Directional Light (so the cube does not look flat)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
    directionalLight.position.set(4, 5, 3.5);
    scene.add(directionalLight);

    // Coordinate Stars/Space Particles
    const starCount = 250;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 40;
      starPositions[i + 1] = (Math.random() - 0.5) * 40;
      starPositions[i + 2] = (Math.random() - 0.5) * 40;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.07,
      transparent: true,
      opacity: 0.5,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 5. Reference Ground/Orbital Grid placed below with renderOrder 0 so cube is always in front
    const gridHelper = new THREE.GridHelper(8, 16, 0x00dbe9, 0x161b2a);
    gridHelper.position.y = -1.4;
    gridHelper.renderOrder = 0;
    scene.add(gridHelper);

    // 3D Cube (Satellite Model) Group
    const cubeSat = new THREE.Group();
    cubeSat.renderOrder = 2;
    cubeSatGroupRef.current = cubeSat;

    // 1 & 3: Cube faces with semi-transparent cyan (#00E5FF at ~35% opacity),
    // different shades for each face, and front (+X) face marked in orange (#FF6D00)
    const cubeSize = 1.35;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);

    // BoxGeometry face order: [+X, -X, +Y, -Y, +Z, -Z]
    const faceMaterials: THREE.MeshStandardMaterial[] = [
      // Face 0: +X (FRONT) - Marked in vibrant orange
      new THREE.MeshStandardMaterial({
        color: 0xff6d00, // Front +X face in orange
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      // Face 1: -X (REAR) - Deeper Cyan
      new THREE.MeshStandardMaterial({
        color: 0x0096c7,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      // Face 2: +Y (TOP) - Ice Light Cyan
      new THREE.MeshStandardMaterial({
        color: 0x7df4ff,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      // Face 3: -Y (BOTTOM / NADIR) - Medium Teal Cyan
      new THREE.MeshStandardMaterial({
        color: 0x0077b6,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      // Face 4: +Z (PORT / EAST) - Bright #00E5FF Semi-transparent Cyan
      new THREE.MeshStandardMaterial({
        color: 0x00e5ff,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      // Face 5: -Z (STARBOARD / WEST) - Aqua Cyan
      new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ];

    faceMaterials.forEach((m) => materialsRef.current.push(m));
    const cubeMesh = new THREE.Mesh(cubeGeo, faceMaterials);
    cubeMesh.renderOrder = 2;
    cubeSat.add(cubeMesh);

    // Front (+X) face accent frame: distinct orange outline & crosshair
    const frontMarkerGeo = new THREE.PlaneGeometry(0.85, 0.85);
    const frontMarkerMat = new THREE.MeshBasicMaterial({
      color: 0xff6d00,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    materialsRef.current.push(frontMarkerMat);
    const frontMarker = new THREE.Mesh(frontMarkerGeo, frontMarkerMat);
    frontMarker.position.set(cubeSize / 2 + 0.005, 0, 0);
    frontMarker.rotation.y = Math.PI / 2;
    frontMarker.renderOrder = 3;
    cubeSat.add(frontMarker);

    // Front (+X) center crosshair tick
    const frontTickGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cubeSize / 2 + 0.006, -0.2, 0),
      new THREE.Vector3(cubeSize / 2 + 0.006, 0.2, 0),
      new THREE.Vector3(cubeSize / 2 + 0.006, 0, -0.2),
      new THREE.Vector3(cubeSize / 2 + 0.006, 0, 0.2),
    ]);
    const frontTickMat = new THREE.LineBasicMaterial({ color: 0xffaa00, linewidth: 2 });
    const frontTick = new THREE.LineSegments(frontTickGeo, frontTickMat);
    frontTick.renderOrder = 4;
    cubeSat.add(frontTick);

    // 2. Bright neon green (#00FF9C) 2px thick edges on the cube
    const edgesGeo = new THREE.EdgesGeometry(cubeGeo);
    const edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x00ff9c,
      linewidth: 2,
      depthTest: true,
    });
    const cubeEdges = new THREE.LineSegments(edgesGeo, edgeLineMat);
    cubeEdges.renderOrder = 4;
    cubeSat.add(cubeEdges);

    // 12 physical cylindrical edge tubes (radius 0.014) in neon green #00FF9C
    // Ensures crisp 2px thickness from every angle regardless of GPU line clamping
    const edgeRadius = 0.014;
    const edgeTubeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff9c,
    });
    materialsRef.current.push(edgeTubeMat);

    const halfS = cubeSize / 2;
    // 4 edges along X
    const edgeXGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius, cubeSize, 8);
    [
      [-halfS, -halfS],
      [-halfS, halfS],
      [halfS, -halfS],
      [halfS, halfS],
    ].forEach(([y, z]) => {
      const tube = new THREE.Mesh(edgeXGeo, edgeTubeMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, y, z);
      tube.renderOrder = 4;
      cubeSat.add(tube);
    });

    // 4 edges along Y
    const edgeYGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius, cubeSize, 8);
    [
      [-halfS, -halfS],
      [-halfS, halfS],
      [halfS, -halfS],
      [halfS, halfS],
    ].forEach(([x, z]) => {
      const tube = new THREE.Mesh(edgeYGeo, edgeTubeMat);
      tube.position.set(x, 0, z);
      tube.renderOrder = 4;
      cubeSat.add(tube);
    });

    // 4 edges along Z
    const edgeZGeo = new THREE.CylinderGeometry(edgeRadius, edgeRadius, cubeSize, 8);
    [
      [-halfS, -halfS],
      [-halfS, halfS],
      [halfS, -halfS],
      [halfS, halfS],
    ].forEach(([x, y]) => {
      const tube = new THREE.Mesh(edgeZGeo, edgeTubeMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(x, y, 0);
      tube.renderOrder = 4;
      cubeSat.add(tube);
    });

    // 8 corner vertex spheres in neon green (#00FF9C)
    const cornerGeo = new THREE.SphereGeometry(0.024, 8, 8);
    [-halfS, halfS].forEach((x) => {
      [-halfS, halfS].forEach((y) => {
        [-halfS, halfS].forEach((z) => {
          const corner = new THREE.Mesh(cornerGeo, edgeTubeMat);
          corner.position.set(x, y, z);
          corner.renderOrder = 5;
          cubeSat.add(corner);
        });
      });
    });

    // 3-Axis Gimbal Arrows inside the cube (Clearly visible through the 35% opacity faces)
    const axesHelper = new THREE.AxesHelper(1.2);
    axesHelper.renderOrder = 3;
    axesHelperRef.current = axesHelper;
    cubeSat.add(axesHelper);

    // Subtle Monopole Communication Antennas on Top Face
    const antMat = new THREE.MeshStandardMaterial({
      color: 0xdbfcff,
      metalness: 0.9,
      roughness: 0.1,
    });
    materialsRef.current.push(antMat);

    const antPositions: [number, number, number][] = [
      [halfS * 0.7, halfS, halfS * 0.7],
      [-halfS * 0.7, halfS, halfS * 0.7],
      [halfS * 0.7, halfS, -halfS * 0.7],
      [-halfS * 0.7, halfS, -halfS * 0.7],
    ];

    antPositions.forEach(([x, y, z]) => {
      const antGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.45, 8);
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(x, y + 0.18, z);
      ant.rotation.x = (z > 0 ? 1 : -1) * 0.2;
      ant.rotation.z = (x > 0 ? -1 : 1) * 0.2;
      ant.renderOrder = 4;
      cubeSat.add(ant);
    });

    scene.add(cubeSat);

    // Animation Loop: Rotates using live pitch, roll, and yaw from MPU6050
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (cubeSatGroupRef.current) {
        if (autoRotate) {
          manualRotationRef.current.y += 0.008;
        }

        // Live MPU6050 telemetry integration + manual drag orientation
        const targetPitch = (currentPacket.orientation.pitch * Math.PI) / 180 + manualRotationRef.current.x;
        const targetRoll = (currentPacket.orientation.roll * Math.PI) / 180;
        const targetYaw = (currentPacket.orientation.yaw * Math.PI) / 180 + manualRotationRef.current.y;

        // Smooth damping
        cubeSatGroupRef.current.rotation.x = THREE.MathUtils.damp(
          cubeSatGroupRef.current.rotation.x,
          targetPitch,
          8,
          0.016
        );
        cubeSatGroupRef.current.rotation.y = THREE.MathUtils.damp(
          cubeSatGroupRef.current.rotation.y,
          targetYaw,
          8,
          0.016
        );
        cubeSatGroupRef.current.rotation.z = THREE.MathUtils.damp(
          cubeSatGroupRef.current.rotation.z,
          targetRoll,
          8,
          0.016
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Pointer Drag Interaction
    const handlePointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      manualRotationRef.current.y += deltaX * 0.008;
      manualRotationRef.current.x += deltaY * 0.008;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      renderer.dispose();
      materialsRef.current.forEach((m) => m.dispose());
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentPacket.orientation.pitch, currentPacket.orientation.roll, currentPacket.orientation.yaw, autoRotate]);

  // Update wireframe mode
  useEffect(() => {
    materialsRef.current.forEach((mat) => {
      if ('wireframe' in mat) {
        (mat as THREE.MeshStandardMaterial).wireframe = wireframe;
      }
    });
  }, [wireframe]);

  // Toggle axes helper
  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showAxes;
    }
  }, [showAxes]);

  const resetCamera = () => {
    manualRotationRef.current = { x: 0.3, y: -0.5 };
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 1.8, 3.8);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  const setViewPreset = (view: 'nadir' | 'zenith' | 'iso') => {
    if (view === 'nadir') {
      manualRotationRef.current = { x: Math.PI / 2, y: 0 };
    } else if (view === 'zenith') {
      manualRotationRef.current = { x: -Math.PI / 2, y: 0 };
    } else {
      manualRotationRef.current = { x: 0.3, y: -0.5 };
    }
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 gap-4 pb-20">
      {/* 3D Attitude Header Card */}
      <div className="space-card flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE]">
            <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
          </div>
          <div>
            <span className="font-mono text-[12px] uppercase tracking-wider text-white font-bold block">
              3D ATTITUDE GIMBAL
            </span>
            <span className="font-mono text-[10px] text-[#8B9BB4] tracking-wider">
              COSMIC-1 AVIONICS ORIENTATION • LEO INERTIAL FRAME
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-full ${
          mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
            ? 'bg-[#FBBF24]/10 border-[#FBBF24]/20 text-[#FBBF24]'
            : 'bg-[#34D399]/10 border-[#34D399]/20 text-[#34D399]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
              ? 'bg-[#FBBF24]'
              : 'bg-[#34D399]'
          }`} />
          <span className="font-mono text-[10px] font-medium">
            {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
              ? 'AWAITING MPU6050'
              : 'MPU6050 6-DOF'}
          </span>
        </div>
      </div>

      {/* Main 3D Canvas Viewport Box with Corner Brackets & Tech Grid */}
      <div className="space-card p-0 relative overflow-hidden flex flex-col h-[460px]">
        {/* Corner Brackets */}
        <div className="corner-bracket-tl" />
        <div className="corner-bracket-tr" />
        <div className="corner-bracket-bl" />
        <div className="corner-bracket-br" />

        {/* WebGL Canvas Container */}
        <div ref={mountRef} className="w-full flex-1 cursor-grab active:cursor-grabbing bg-[#0A1020] tech-grid" />

        {/* Artificial Horizon HUD Reticle Overlay with Neon Green Horizon Line */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Neon Green Horizon Line (#00FF9C) across the center */}
          <div className="absolute w-72 h-[1.5px] bg-[#00FF9C] shadow-[0_0_10px_rgba(0,255,156,0.8)] z-10 flex items-center justify-between pointer-events-none">
            <div className="w-3.5 h-2 border-l border-t border-[#00FF9C] -translate-y-1.5" />
            <div className="w-3.5 h-2 border-r border-t border-[#00FF9C] -translate-y-1.5" />
          </div>

          {/* Pitch Ladder Marks */}
          <div className="w-48 h-36 border-t border-b border-[#22D3EE]/20 relative flex items-center justify-center pointer-events-none">
            <div className="w-6 h-[1.5px] bg-[#00FF9C]/80" />
            <div className="w-[1.5px] h-6 bg-[#00FF9C]/80 absolute" />
            <div className="w-2.5 h-2.5 rounded-full border border-[#00FF9C] absolute" />

            <span className="absolute top-1 right-2 font-mono text-[9px] text-[#22D3EE]/70">+15°</span>
            <span className="absolute bottom-1 right-2 font-mono text-[9px] text-[#22D3EE]/70">-15°</span>
          </div>

          {/* Roll angle arc guide */}
          <div className="absolute top-3 w-52 h-12 flex justify-between px-4 text-[#8B9BB4] font-mono text-[9px] pointer-events-none">
            <span>-45°</span>
            <span>0°</span>
            <span>+45°</span>
          </div>
        </div>

        {/* Top-Left Floating Readout Card: Euler Angles */}
        <div className="absolute top-3 left-3 bg-[#111A2B]/85 backdrop-blur-md border border-[#1E2A3F] rounded-lg p-2.5 flex flex-col gap-1 pointer-events-none z-10">
          <span className="font-mono text-[9px] text-[#8B9BB4] tracking-wider uppercase font-semibold">
            EULER ANGLES
          </span>
          <div className="grid grid-cols-3 gap-3 font-mono text-[11px]">
            <div>
              <span className="text-[#8B9BB4] text-[8px] block">PITCH</span>
              <span className="text-[#22D3EE] font-bold">
                {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                  ? '--'
                  : currentPacket.orientation.pitch >= 0
                  ? `+${currentPacket.orientation.pitch.toFixed(1)}°`
                  : `${currentPacket.orientation.pitch.toFixed(1)}°`}
              </span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[8px] block">ROLL</span>
              <span className="text-[#A78BFA] font-bold">
                {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                  ? '--'
                  : currentPacket.orientation.roll >= 0
                  ? `+${currentPacket.orientation.roll.toFixed(1)}°`
                  : `${currentPacket.orientation.roll.toFixed(1)}°`}
              </span>
            </div>
            <div>
              <span className="text-[#8B9BB4] text-[8px] block">YAW</span>
              <span className="text-[#34D399] font-bold">
                {mode === 'LIVE' && !liveFieldsPresent.orientation && !liveFieldsPresent.accel
                  ? '--'
                  : `${currentPacket.orientation.yaw.toFixed(1)}°`}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right Quaternions Card */}
        <div className="absolute top-3 right-3 bg-[#111A2B]/85 backdrop-blur-md border border-[#1E2A3F] rounded-lg p-2.5 font-mono text-[10px] pointer-events-none z-10">
          <span className="text-[#8B9BB4] text-[9px] block tracking-wider uppercase font-semibold">
            QUATERNION
          </span>
          <div className="flex flex-col text-[#8B9BB4] text-[10px]">
            <span>qx: <strong className="text-[#22D3EE]">{currentPacket.quaternion[0]}</strong></span>
            <span>qy: <strong className="text-[#A78BFA]">{currentPacket.quaternion[1]}</strong></span>
            <span>qz: <strong className="text-[#34D399]">{currentPacket.quaternion[2]}</strong></span>
            <span>qw: <strong className="text-white">{currentPacket.quaternion[3]}</strong></span>
          </div>
        </div>

        {/* Bottom Orbit Drag Tip */}
        <div className="absolute bottom-16 left-3 font-mono text-[9px] text-[#8B9BB4] bg-[#0A1020]/80 px-2 py-0.5 rounded border border-[#1E2A3F] pointer-events-none z-10">
          <span className="text-[#22D3EE]">DRAG</span> TO ROTATE • <span className="text-[#FF6D00] font-bold">+X FRONT</span>
        </div>

        {/* View Buttons Row at Bottom of 3D Panel */}
        <div className="p-3 bg-[#111A2B] border-t border-[#1E2A3F] flex items-center justify-between flex-wrap gap-2 z-10">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-[#8B9BB4] uppercase text-[9px] mr-1 hidden sm:inline">VIEW:</span>
            {[
              { id: 'iso', label: 'ISO' },
              { id: 'top', label: 'TOP' },
              { id: 'nadir', label: 'NADIR' },
              { id: 'solar', label: 'SOLAR' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setViewPreset(btn.id as any)}
                className="bg-[#0A1020] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white px-2.5 py-1 rounded uppercase font-semibold transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetCamera}
              className="bg-[#0A1020] hover:bg-[#1E2A3F] border border-[#1E2A3F] text-[#8B9BB4] hover:text-white px-2.5 py-1 rounded font-mono text-[10px] transition-colors"
            >
              RESET CAM
            </button>
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

      {/* Control Dock (Toggles & Settings) */}
      <div className="space-card flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWireframe(!wireframe)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-semibold border transition-all ${
              wireframe
                ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE]'
                : 'bg-[#0A1020] border-[#1E2A3F] text-[#8B9BB4]'
            }`}
          >
            WIREFRAME: {wireframe ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-semibold border transition-all ${
              showAxes
                ? 'bg-[#22D3EE]/20 border-[#22D3EE] text-[#22D3EE]'
                : 'bg-[#0A1020] border-[#1E2A3F] text-[#8B9BB4]'
            }`}
          >
            GIMBAL AXES: {showAxes ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-semibold border transition-all ${
              autoRotate
                ? 'bg-[#34D399]/20 border-[#34D399] text-[#34D399]'
                : 'bg-[#0A1020] border-[#1E2A3F] text-[#8B9BB4]'
            }`}
          >
            TUMBLE: {autoRotate ? 'ON' : 'OFF'}
          </button>
        </div>

        <span className="font-mono text-[10px] text-[#8B9BB4]">
          SENSOR SAMPLING: <strong className="text-[#22D3EE]">100 HZ DMA</strong>
        </span>
      </div>
    </div>
  );
}
