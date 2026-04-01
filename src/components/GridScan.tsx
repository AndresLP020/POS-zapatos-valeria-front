'use client';

import { BloomEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineStyle;
uniform float uLineJitter;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uBloomOpacity;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
varying vec2 vUv;

uniform float uScanStarts[8];
uniform float uScanCount;

const int MAX_SCANS = 8;

float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0);
    vec3 rd = normalize(vec3(p, 2.0));

    float cR = cos(uTilt), sR = sin(uTilt);
    rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;
    float cY = cos(uYaw), sY = sin(uYaw);
    rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;

    vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
    rd.xy += skew * rd.z;

    vec3 color = vec3(0.0);
    float minT = 1e20;
    float gridScale = max(1e-5, uGridScale);
    float fadeStrength = 2.0;
    vec2 gridUV = vec2(0.0);
    float hitIsY = 1.0;

    for (int i = 0; i < 4; i++) {
      float isY = float(i < 2);
      float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
      float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
      float den = isY * rd.y + (1.0 - isY) * rd.x;
      float t = num / den;
      vec3 h = ro + rd * t;
      float depthBoost = smoothstep(0.0, 3.0, h.z);
      h.xy += skew * 0.15 * depthBoost;
      bool use = t > 0.0 && t < minT;
      gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
      minT = use ? t : minT;
      hitIsY = use ? isY : hitIsY;
    }

    vec3 hit = ro + rd * minT;
    float dist = length(hit - ro);
    float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
    if (jitterAmt > 0.0) {
      vec2 j = vec2(sin(gridUV.y * 2.7 + iTime * 1.8), cos(gridUV.x * 2.3 - iTime * 1.6)) * (0.15 * jitterAmt);
      gridUV += j;
    }
    float fx = fract(gridUV.x);
    float fy = fract(gridUV.y);
    float ax = min(fx, 1.0 - fx);
    float ay = min(fy, 1.0 - fy);
    float wx = fwidth(gridUV.x);
    float wy = fwidth(gridUV.y);
    float halfPx = max(0.0, uLineThickness) * 0.5;
    float tx = halfPx * wx;
    float ty = halfPx * wy;
    float lineX = 1.0 - smoothstep(tx, tx + wx, ax);
    float lineY = 1.0 - smoothstep(ty, ty + wy, ay);
    float lineMask = max(lineX, lineY);
    float fade = exp(-dist * fadeStrength);

    float dur = max(0.05, uScanDuration);
    float del = max(0.0, uScanDelay);
    float scanZ = clamp((mod(iTime, dur + del) - del) / dur, 0.0, 1.0) * 2.0;
    if (uScanDirection > 0.5 && uScanDirection < 1.5) scanZ = (1.0 - scanZ) * 2.0;
    float dz = abs(hit.z - scanZ);
    float sigma = max(0.001, 0.18 * max(0.1, uScanGlow) * uScanSoftness);
    float lineBand = exp(-0.5 * (dz * dz) / (sigma * sigma));
    float phaseWindow = smoother01(0.0, clamp(uPhaseTaper, 0.0, 0.49), scanZ * 0.5);
    float combinedPulse = lineBand * phaseWindow * clamp(uScanOpacity, 0.0, 1.0);
    float combinedAura = exp(-0.5 * (dz * dz) / ((sigma * 2.0) * (sigma * 2.0))) * 0.25 * combinedPulse;

    for (int i = 0; i < MAX_SCANS; i++) {
      if (float(i) >= uScanCount) break;
      float tActiveI = iTime - uScanStarts[i];
      float phaseI = clamp(tActiveI / dur, 0.0, 1.0);
      float scanZI = phaseI * 2.0;
      float dzI = abs(hit.z - scanZI);
      float lineBandI = exp(-0.5 * (dzI * dzI) / (sigma * sigma));
      combinedPulse += lineBandI * clamp(uScanOpacity, 0.0, 1.0);
      combinedAura += exp(-0.5 * (dzI * dzI) / ((sigma * 2.0) * (sigma * 2.0))) * 0.25 * clamp(uScanOpacity, 0.0, 1.0);
    }

    vec3 gridCol = uLinesColor * lineMask * fade;
    vec3 scanCol = uScanColor * combinedPulse;
    vec3 scanAura = uScanColor * combinedAura;
    color = clamp(gridCol + scanCol + scanAura, 0.0, 1.0);

    float n = fract(sin(dot(gl_FragCoord.xy + vec2(iTime * 123.4), vec2(12.9898,78.233))) * 43758.5453123);
    color += (n - 0.5) * uNoise;
    color = clamp(color, 0.0, 1.0);
    float alpha = clamp(max(lineMask, combinedPulse), 0.0, 1.0);
    fragColor = vec4(color, alpha);
}

void main(){
  vec4 c;
  mainImage(c, vUv * iResolution.xy);
  gl_FragColor = c;
}
`;

type GridScanProps = {
  enableWebcam?: boolean;
  showPreview?: boolean;
  modelsPath?: string;
  sensitivity?: number;
  lineThickness?: number;
  linesColor?: string;
  scanColor?: string;
  scanOpacity?: number;
  gridScale?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  lineJitter?: number;
  scanDirection?: 'forward' | 'backward' | 'pingpong';
  enablePost?: boolean;
  bloomIntensity?: number;
  bloomThreshold?: number;
  bloomSmoothing?: number;
  chromaticAberration?: number;
  noiseIntensity?: number;
  scanGlow?: number;
  scanSoftness?: number;
  scanPhaseTaper?: number;
  scanDuration?: number;
  scanDelay?: number;
  enableGyro?: boolean;
  scanOnClick?: boolean;
  snapBackDelay?: number;
  className?: string;
  style?: React.CSSProperties;
};

const MAX_SCANS = 8;

export function GridScan({
  enableWebcam = false,
  showPreview = false,
  modelsPath = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
  sensitivity = 0.55,
  lineThickness = 1,
  linesColor = '#392e4e',
  scanColor = '#FF9FFC',
  scanOpacity = 0.4,
  gridScale = 0.1,
  lineStyle = 'solid',
  lineJitter = 0.1,
  scanDirection = 'pingpong',
  enablePost = true,
  bloomIntensity = 0.6,
  bloomThreshold = 0,
  bloomSmoothing = 0,
  chromaticAberration = 0.002,
  noiseIntensity = 0.01,
  scanGlow = 0.5,
  scanSoftness = 2,
  scanPhaseTaper = 0.9,
  scanDuration = 2.0,
  scanDelay = 2.0,
  enableGyro = false,
  scanOnClick = false,
  snapBackDelay = 250,
  className,
  style,
}: GridScanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomRef = useRef<BloomEffect | null>(null);
  const chromaRef = useRef<ChromaticAberrationEffect | null>(null);
  const rafRef = useRef<number | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [uiFaceActive, setUiFaceActive] = useState(false);
  const lookTarget = useRef(new THREE.Vector2(0, 0));
  const tiltTarget = useRef(0);
  const yawTarget = useRef(0);
  const lookCurrent = useRef(new THREE.Vector2(0, 0));
  const lookVel = useRef(new THREE.Vector2(0, 0));
  const tiltCurrent = useRef(0);
  const tiltVel = useRef(0);
  const yawCurrent = useRef(0);
  const yawVel = useRef(0);
  const scanStartsRef = useRef<number[]>([]);
  const bufX = useRef<number[]>([]);
  const bufY = useRef<number[]>([]);
  const bufT = useRef<number[]>([]);
  const bufYaw = useRef<number[]>([]);

  const s = THREE.MathUtils.clamp(sensitivity, 0, 1);
  const skewScale = THREE.MathUtils.lerp(0.06, 0.2, s);
  const tiltScale = THREE.MathUtils.lerp(0.12, 0.3, s);
  const yawScale = THREE.MathUtils.lerp(0.1, 0.28, s);
  const depthResponse = THREE.MathUtils.lerp(0.25, 0.45, s);
  const smoothTime = THREE.MathUtils.lerp(0.45, 0.12, s);
  const maxSpeed = Infinity;
  const yBoost = THREE.MathUtils.lerp(1.2, 1.6, s);

  const pushScan = (t: number) => {
    const arr = scanStartsRef.current.slice();
    if (arr.length >= MAX_SCANS) arr.shift();
    arr.push(t);
    scanStartsRef.current = arr;
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms as any;
    const buf = new Array(MAX_SCANS).fill(0);
    for (let i = 0; i < arr.length && i < MAX_SCANS; i++) buf[i] = arr[i];
    u.uScanStarts.value = buf;
    u.uScanCount.value = arr.length;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let leaveTimer: number | null = null;
    const onMove = (e: MouseEvent) => {
      if (uiFaceActive) return;
      if (leaveTimer) window.clearTimeout(leaveTimer);
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      lookTarget.current.set(nx, ny);
    };
    const onClick = async () => {
      const nowSec = performance.now() / 1000;
      if (scanOnClick) pushScan(nowSec);
      const dev = DeviceOrientationEvent as any;
      if (enableGyro && typeof window !== 'undefined' && window.DeviceOrientationEvent && typeof dev.requestPermission === 'function') {
        try { await dev.requestPermission(); } catch {}
      }
    };
    const onLeave = () => {
      if (uiFaceActive) return;
      if (leaveTimer) window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => {
        lookTarget.current.set(0, 0);
        tiltTarget.current = 0;
        yawTarget.current = 0;
      }, Math.max(0, snapBackDelay || 0));
    };
    el.addEventListener('mousemove', onMove);
    if (scanOnClick) el.addEventListener('click', onClick);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      if (scanOnClick) el.removeEventListener('click', onClick);
      if (leaveTimer) window.clearTimeout(leaveTimer);
    };
  }, [uiFaceActive, snapBackDelay, scanOnClick, enableGyro]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const uniforms: any = {
      iResolution: { value: new THREE.Vector3(container.clientWidth, container.clientHeight, renderer.getPixelRatio()) },
      iTime: { value: 0 },
      uSkew: { value: new THREE.Vector2(0, 0) },
      uTilt: { value: 0 },
      uYaw: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: srgbColor(linesColor) },
      uScanColor: { value: srgbColor(scanColor) },
      uGridScale: { value: gridScale },
      uLineStyle: { value: lineStyle === 'dashed' ? 1 : lineStyle === 'dotted' ? 2 : 0 },
      uLineJitter: { value: Math.max(0, Math.min(1, lineJitter || 0)) },
      uScanOpacity: { value: scanOpacity },
      uNoise: { value: noiseIntensity },
      uBloomOpacity: { value: bloomIntensity },
      uScanGlow: { value: scanGlow },
      uScanSoftness: { value: scanSoftness },
      uPhaseTaper: { value: scanPhaseTaper },
      uScanDuration: { value: scanDuration },
      uScanDelay: { value: scanDelay },
      uScanDirection: { value: scanDirection === 'backward' ? 1 : scanDirection === 'pingpong' ? 2 : 0 },
      uScanStarts: { value: new Array(MAX_SCANS).fill(0) },
      uScanCount: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    materialRef.current = material;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    if (enablePost) {
      const composer = new EffectComposer(renderer);
      composerRef.current = composer;
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new BloomEffect({
        intensity: 1.0,
        luminanceThreshold: bloomThreshold,
        luminanceSmoothing: bloomSmoothing,
      });
      bloom.blendMode.opacity.value = Math.max(0, bloomIntensity);
      bloomRef.current = bloom;
      const chroma = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(chromaticAberration, chromaticAberration),
        radialModulation: true,
        modulationOffset: 0.0,
      });
      chromaRef.current = chroma;
      composer.addPass(new EffectPass(camera, bloom, chroma));
    }

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      uniforms.iResolution.value.set(container.clientWidth, container.clientHeight, renderer.getPixelRatio());
      if (composerRef.current) composerRef.current.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      lookCurrent.current.copy(smoothDampVec2(lookCurrent.current, lookTarget.current, lookVel.current, smoothTime, maxSpeed, dt));
      const tiltSm = smoothDampFloat(tiltCurrent.current, tiltTarget.current, { v: tiltVel.current }, smoothTime, maxSpeed, dt);
      tiltCurrent.current = tiltSm.value;
      tiltVel.current = tiltSm.v;
      const yawSm = smoothDampFloat(yawCurrent.current, yawTarget.current, { v: yawVel.current }, smoothTime, maxSpeed, dt);
      yawCurrent.current = yawSm.value;
      yawVel.current = yawSm.v;

      const skew = new THREE.Vector2(lookCurrent.current.x * skewScale, -lookCurrent.current.y * yBoost * skewScale);
      uniforms.uSkew.value.set(skew.x, skew.y);
      uniforms.uTilt.value = tiltCurrent.current * tiltScale;
      uniforms.uYaw.value = THREE.MathUtils.clamp(yawCurrent.current * yawScale, -0.6, 0.6);
      uniforms.iTime.value = now / 1000;
      renderer.clear(true, true, true);
      if (composerRef.current) composerRef.current.render(dt);
      else renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      material.dispose();
      quad.geometry.dispose();
      if (composerRef.current) composerRef.current.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      container.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        const faceapi = await import('face-api.js');
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelsPath),
        ]);
        if (!canceled) setModelsReady(true);
      } catch {
        if (!canceled) setModelsReady(false);
      }
    };
    if (enableWebcam) load();
    return () => { canceled = true; };
  }, [modelsPath, enableWebcam]);

  useEffect(() => {
    if (!enableGyro) return;
    const handler = (e: DeviceOrientationEvent) => {
      if (uiFaceActive) return;
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? 0;
      lookTarget.current.set(THREE.MathUtils.clamp(gamma / 45, -1, 1), THREE.MathUtils.clamp(-beta / 30, -1, 1));
      tiltTarget.current = THREE.MathUtils.degToRad(gamma) * 0.4;
    };
    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
  }, [enableGyro, uiFaceActive]);

  return (
    <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${className ?? ''}`} style={style}>
      {showPreview && (
        <div className="pointer-events-none absolute bottom-3 right-3 h-[132px] w-[220px] overflow-hidden rounded-lg border border-white/25 bg-black shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
          <video ref={videoRef} muted playsInline autoPlay className="h-full w-full -scale-x-100 object-cover" />
          <div className="absolute left-2 top-2 rounded-[6px] bg-black/50 px-[6px] py-[2px] text-[12px] leading-[1.2] text-white backdrop-blur-[4px]">
            {enableWebcam ? (modelsReady ? (uiFaceActive ? 'Face: tracking' : 'Face: searching') : 'Loading models') : 'Webcam disabled'}
          </div>
        </div>
      )}
    </div>
  );
}

function srgbColor(hex: string) {
  const c = new THREE.Color(hex);
  return c.convertSRGBToLinear();
}

function smoothDampVec2(current: THREE.Vector2, target: THREE.Vector2, currentVelocity: THREE.Vector2, smoothTime: number, maxSpeed: number, deltaTime: number) {
  const out = current.clone();
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current.clone().sub(target);
  const originalTo = target.clone();
  const maxChange = maxSpeed * smoothTime;
  if (change.length() > maxChange) change.setLength(maxChange);
  target = current.clone().sub(change);
  const temp = currentVelocity.clone().addScaledVector(change, omega).multiplyScalar(deltaTime);
  currentVelocity.sub(temp.clone().multiplyScalar(omega));
  currentVelocity.multiplyScalar(exp);
  out.copy(target.clone().add(change.add(temp).multiplyScalar(exp)));
  if (originalTo.clone().sub(current).dot(out.clone().sub(originalTo)) > 0) {
    out.copy(originalTo);
    currentVelocity.set(0, 0);
  }
  return out;
}

function smoothDampFloat(current: number, target: number, velRef: { v: number }, smoothTime: number, maxSpeed: number, deltaTime: number) {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const originalTo = target;
  const maxChange = maxSpeed * smoothTime;
  change = Math.sign(change) * Math.min(Math.abs(change), maxChange);
  target = current - change;
  const temp = (velRef.v + omega * change) * deltaTime;
  velRef.v = (velRef.v - omega * temp) * exp;
  let out = target + (change + temp) * exp;
  if ((originalTo - current) * (out - originalTo) > 0) {
    out = originalTo;
    velRef.v = 0;
  }
  return { value: out, v: velRef.v };
}
