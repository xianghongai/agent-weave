import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { useAppStore } from '@/state/app-store';

/** 两组主流动交织丝束的配置。 */
const STREAM_LINES = 22;
const STREAM_SEGMENTS = 80;

/** 右上角延伸副丝束的配置（让右上视野饱满舒展）。 */
const UPPER_LINES = 16;
const UPPER_SEGMENTS = 70;

/** 连接两束流线的穿插横向弧线数量与分段。 */
const CROSS_LINES = 18;
const CROSS_SEGMENTS = 36;

/** 流线上的浮动微光节点数量。 */
const PARTICLES_COUNT = 90;

interface Palette {
  warp: number;
  weft: number;
  upper: number;
  cross: number;
  points: number;
  glow: number;
  lineOpacity: number;
  crossOpacity: number;
  pointsOpacity: number;
  glowOpacity: number;
  fogColor: number;
  fogDensity: number;
  blending: THREE.Blending;
}

/** 深浅主题的调色板：深色通透发光，浅色柔和淡雅。 */
const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: {
    warp: 0x2dd4bf, // 品牌青绿 Teal
    weft: 0x818cf8, // 智能体紫蓝 Indigo
    upper: 0x38bdf8, // 右上轻盈浅青 Sky
    cross: 0x475569, // 柔和交错暗青灰 Slate
    points: 0x7dd3c0,
    glow: 0x2dd4bf, // 顶部柔光
    lineOpacity: 0.38,
    crossOpacity: 0.18,
    pointsOpacity: 0.7,
    glowOpacity: 0.22,
    fogColor: 0x15161d,
    fogDensity: 0.02,
    blending: THREE.AdditiveBlending,
  },
  light: {
    warp: 0x0d9488, // 浅色调深青
    weft: 0x4f46e5, // 浅色调靛蓝
    upper: 0x0284c7, // 浅色调天蓝
    cross: 0x94a3b8, // 浅色灰织线
    points: 0x0d9488,
    glow: 0x0d9488, // 顶部柔光
    lineOpacity: 0.22,
    crossOpacity: 0.12,
    pointsOpacity: 0.4,
    glowOpacity: 0.08,
    fogColor: 0xf8fafc,
    fogDensity: 0.022,
    blending: THREE.NormalBlending,
  },
};

/** 动态生成柔和羽化的高斯径向光晕贴图，用于顶部天光。 */
function createSoftGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.25)');
    gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.04)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

/**
 * 首页全屏 3D 背景组件：
 * 以三维自然流线束（Flowing Woven Ribbons）、右上延伸丝带与顶部柔和光晕构建动态空间，
 * 柔和表达多智能体规则与 MCP 配置的交错汇聚。
 *
 * 仅在首页挂载渲染，切换页面时完整释放所有 WebGL 资源。
 */
export function HomeBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // 系统动态偏好与页面可见性
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = mediaQuery.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', onMotionChange);

    // 场景、相机与渲染器
    const scene = new THREE.Scene();
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : theme;
    let palette = PALETTES[currentTheme === 'light' ? 'light' : 'dark'];
    scene.fog = new THREE.FogExp2(palette.fogColor, palette.fogDensity);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 120);
    // 构图：相机略偏左并俯视，使流线在右下交错并向右上延伸翻腾，避开左侧大标题区
    camera.position.set(-6, 15, 28);
    const lookTarget = new THREE.Vector3(2, 0, 0);
    camera.lookAt(lookTarget);

    const renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // 顶部柔和天光光晕面片
    const glowTexture = createSoftGlowTexture();
    const glowGeo = new THREE.PlaneGeometry(68, 28);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTexture,
      color: palette.glow,
      transparent: true,
      opacity: palette.glowOpacity,
      blending: palette.blending,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(4, 16, -5);
    glowMesh.rotation.x = 0.22;
    scene.add(glowMesh);

    // 材质创建
    const warpMaterial = new THREE.LineBasicMaterial({
      color: palette.warp,
      transparent: true,
      opacity: palette.lineOpacity,
      blending: palette.blending,
      depthWrite: false,
    });

    const weftMaterial = new THREE.LineBasicMaterial({
      color: palette.weft,
      transparent: true,
      opacity: palette.lineOpacity,
      blending: palette.blending,
      depthWrite: false,
    });

    const upperMaterial = new THREE.LineBasicMaterial({
      color: palette.upper,
      transparent: true,
      opacity: palette.lineOpacity * 0.8,
      blending: palette.blending,
      depthWrite: false,
    });

    const crossMaterial = new THREE.LineBasicMaterial({
      color: palette.cross,
      transparent: true,
      opacity: palette.crossOpacity,
      blending: palette.blending,
      depthWrite: false,
    });

    const pointsMaterial = new THREE.PointsMaterial({
      color: palette.points,
      size: 0.16,
      transparent: true,
      opacity: palette.pointsOpacity,
      blending: palette.blending,
      depthWrite: false,
    });

    // 1. 流线束 1（青绿规则流束：沿大弧度穿过空间）
    const warpLineCount = STREAM_LINES;
    const warpSegments = STREAM_SEGMENTS;
    const warpVertexCount = warpLineCount * warpSegments * 2;
    const warpPositions = new Float32Array(warpVertexCount * 3);
    const warpGeometry = new THREE.BufferGeometry();
    const warpPositionAttr = new THREE.BufferAttribute(warpPositions, 3);
    warpGeometry.setAttribute('position', warpPositionAttr);
    const warpLines = new THREE.LineSegments(warpGeometry, warpMaterial);
    scene.add(warpLines);

    // 2. 流线束 2（紫蓝 Agent 流束：以交叉角度斜向穿插，并向右上昂扬延伸）
    const weftLineCount = STREAM_LINES;
    const weftSegments = STREAM_SEGMENTS;
    const weftVertexCount = weftLineCount * weftSegments * 2;
    const weftPositions = new Float32Array(weftVertexCount * 3);
    const weftGeometry = new THREE.BufferGeometry();
    const weftPositionAttr = new THREE.BufferAttribute(weftPositions, 3);
    weftGeometry.setAttribute('position', weftPositionAttr);
    const weftLines = new THREE.LineSegments(weftGeometry, weftMaterial);
    scene.add(weftLines);

    // 3. 右上副流线束（Upper Stream：弥漫延伸到右上空域）
    const upperLineCount = UPPER_LINES;
    const upperSegments = UPPER_SEGMENTS;
    const upperVertexCount = upperLineCount * upperSegments * 2;
    const upperPositions = new Float32Array(upperVertexCount * 3);
    const upperGeometry = new THREE.BufferGeometry();
    const upperPositionAttr = new THREE.BufferAttribute(upperPositions, 3);
    upperGeometry.setAttribute('position', upperPositionAttr);
    const upperLines = new THREE.LineSegments(upperGeometry, upperMaterial);
    scene.add(upperLines);

    // 4. 穿插横向弧线（Cross Threads：连接两束流线的柔性交织线）
    const crossLineCount = CROSS_LINES;
    const crossSegments = CROSS_SEGMENTS;
    const crossVertexCount = crossLineCount * crossSegments * 2;
    const crossPositions = new Float32Array(crossVertexCount * 3);
    const crossGeometry = new THREE.BufferGeometry();
    const crossPositionAttr = new THREE.BufferAttribute(crossPositions, 3);
    crossGeometry.setAttribute('position', crossPositionAttr);
    const crossLines = new THREE.LineSegments(crossGeometry, crossMaterial);
    scene.add(crossLines);

    // 5. 浮动微光节点粒子（沿着流线自然分布）
    const totalPoints = PARTICLES_COUNT;
    const pointPositions = new Float32Array(totalPoints * 3);
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsPositionAttr = new THREE.BufferAttribute(pointPositions, 3);
    pointsGeometry.setAttribute('position', pointsPositionAttr);
    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(pointsMesh);

    // 视差状态与鼠标平滑跟踪
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const onPointerMove = (event: PointerEvent) => {
      targetMouseX = (event.clientX / window.innerWidth) * 2 - 1;
      targetMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 窗口尺寸自适应
    const onResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // 动画时间与渲染循环
    let animationFrameId = 0;
    let time = 0;
    let lastTimestamp = performance.now();
    let isTabVisible = !document.hidden;

    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastTimestamp = performance.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 流束 1（青绿）核心中心线函数：u in [0, 1]
    const getStream1Point = (u: number, t: number, lineIndex: number) => {
      const lineWeight = (lineIndex - (STREAM_LINES - 1) / 2) / ((STREAM_LINES - 1) / 2);
      const envelope = 1 - 0.28 * Math.pow(2 * u - 1, 2);
      const spreadWidth = 5.2 * envelope;

      const baseX = -34 + u * 68;
      const baseZ = -12 + u * 24 + Math.sin(u * 3.2 + t * 0.45) * 6.5;
      const baseY = Math.cos(u * 3.6 + t * 0.5) * 2.8 + Math.sin(u * 1.8 - t * 0.35) * 1.6 - 1.2;

      const localRipple = Math.sin(u * 7.5 + lineIndex * 0.22 + t * 0.6) * 0.4;
      const x = baseX - lineWeight * spreadWidth * 0.2;
      const z = baseZ + lineWeight * spreadWidth * 0.95;
      const y = baseY + lineWeight * 0.4 + localRipple;
      return { x, y, z };
    };

    // 流束 2（紫蓝）核心中心线函数：v in [0, 1]（向右上优雅扬起延伸）
    const getStream2Point = (v: number, t: number, lineIndex: number) => {
      const lineWeight = (lineIndex - (STREAM_LINES - 1) / 2) / ((STREAM_LINES - 1) / 2);
      const envelope = 1 - 0.28 * Math.pow(2 * v - 1, 2);
      const spreadWidth = 5.0 * envelope;

      const baseX = -30 + v * 64;
      const baseZ = 16 - v * 30 + Math.cos(v * 3.0 + t * 0.45) * 6.0;

      // 后半段（v > 0.3）向上升起，平滑延伸进右上角视野
      const rise = Math.pow(Math.max(0, (v - 0.25) / 0.75), 1.5) * 8.5;
      const baseY = Math.sin(v * 3.6 + t * 0.5 + Math.PI * 0.5) * 2.8 - Math.cos(v * 1.8 - t * 0.35) * 1.5 - 1.2 + rise;

      const localRipple = -Math.sin(v * 7.5 + lineIndex * 0.22 + t * 0.6) * 0.4;
      const x = baseX + lineWeight * spreadWidth * 0.25;
      const z = baseZ + lineWeight * spreadWidth * 0.95;
      const y = baseY - lineWeight * 0.4 + localRipple;
      return { x, y, z };
    };

    // 右上副流束（Sky Blue Upper Stream）：w in [0, 1]（点缀右上角天空）
    const getUpperStreamPoint = (w: number, t: number, lineIndex: number) => {
      const lineWeight = (lineIndex - (UPPER_LINES - 1) / 2) / ((UPPER_LINES - 1) / 2);
      const envelope = 1 - 0.22 * Math.pow(2 * w - 1, 2);
      const spreadWidth = 4.0 * envelope;

      const baseX = -10 + w * 46;
      const baseZ = -8 + w * 4 + Math.sin(w * 2.6 + t * 0.4) * 4.0;
      const baseY = 3 + w * 9.5 + Math.cos(w * 3.0 + t * 0.45) * 1.8;

      const localRipple = Math.sin(w * 7.0 + lineIndex * 0.25 + t * 0.55) * 0.3;
      const x = baseX - lineWeight * spreadWidth * 0.2;
      const z = baseZ + lineWeight * spreadWidth * 0.95;
      const y = baseY + lineWeight * 0.3 + localRipple;
      return { x, y, z };
    };

    const render = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(render);
      if (!isTabVisible) {
        return;
      }

      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      // 如果未开启减弱动效，平滑推进时间
      if (!reducedMotion) {
        time += delta * 0.38;
      }

      // 更柔和沉静的鼠标平滑阻尼
      const lerpSpeed = 0.02;
      mouseX += (targetMouseX - mouseX) * lerpSpeed;
      mouseY += (targetMouseY - mouseY) * lerpSpeed;

      // 相机在基础视角上附带轻微视差倾斜
      const parallaxFactor = reducedMotion ? 0.15 : 0.65;
      camera.position.x = -6 + mouseX * 1.5 * parallaxFactor;
      camera.position.y = 15 + mouseY * 1.0 * parallaxFactor;
      camera.lookAt(lookTarget.x + mouseX * 0.4, lookTarget.y + mouseY * 0.25, lookTarget.z);

      // 顶部柔光微妙呼吸
      glowMat.opacity = palette.glowOpacity * (1 + Math.sin(time * 0.5) * 0.18);

      // --- 1. 更新流束 1（青绿）---
      let warpIdx = 0;
      for (let l = 0; l < warpLineCount; l++) {
        for (let s = 0; s < warpSegments; s++) {
          const u0 = s / warpSegments;
          const u1 = (s + 1) / warpSegments;
          const p0 = getStream1Point(u0, time, l);
          const p1 = getStream1Point(u1, time, l);

          warpPositions[warpIdx++] = p0.x;
          warpPositions[warpIdx++] = p0.y;
          warpPositions[warpIdx++] = p0.z;

          warpPositions[warpIdx++] = p1.x;
          warpPositions[warpIdx++] = p1.y;
          warpPositions[warpIdx++] = p1.z;
        }
      }
      warpPositionAttr.needsUpdate = true;

      // --- 2. 更新流束 2（紫蓝，右上延伸）---
      let weftIdx = 0;
      for (let l = 0; l < weftLineCount; l++) {
        for (let s = 0; s < weftSegments; s++) {
          const v0 = s / weftSegments;
          const v1 = (s + 1) / weftSegments;
          const p0 = getStream2Point(v0, time, l);
          const p1 = getStream2Point(v1, time, l);

          weftPositions[weftIdx++] = p0.x;
          weftPositions[weftIdx++] = p0.y;
          weftPositions[weftIdx++] = p0.z;

          weftPositions[weftIdx++] = p1.x;
          weftPositions[weftIdx++] = p1.y;
          weftPositions[weftIdx++] = p1.z;
        }
      }
      weftPositionAttr.needsUpdate = true;

      // --- 3. 更新右上副流束 ---
      let upperIdx = 0;
      for (let l = 0; l < upperLineCount; l++) {
        for (let s = 0; s < upperSegments; s++) {
          const w0 = s / upperSegments;
          const w1 = (s + 1) / upperSegments;
          const p0 = getUpperStreamPoint(w0, time, l);
          const p1 = getUpperStreamPoint(w1, time, l);

          upperPositions[upperIdx++] = p0.x;
          upperPositions[upperIdx++] = p0.y;
          upperPositions[upperIdx++] = p0.z;

          upperPositions[upperIdx++] = p1.x;
          upperPositions[upperIdx++] = p1.y;
          upperPositions[upperIdx++] = p1.z;
        }
      }
      upperPositionAttr.needsUpdate = true;

      // --- 4. 更新穿插横向弧线（Cross Threads）---
      let crossIdx = 0;
      for (let c = 0; c < crossLineCount; c++) {
        const param = (c + 0.5) / crossLineCount;
        const anchor1 = getStream1Point(param, time, Math.floor(c % STREAM_LINES));
        const anchor2 = getStream2Point(param, time, Math.floor((c * 2) % STREAM_LINES));

        const midX = (anchor1.x + anchor2.x) * 0.5;
        const midZ = (anchor1.z + anchor2.z) * 0.5;
        const sag = Math.sin(param * Math.PI) * (Math.sin(param * 4.0 + time * 0.5) * 1.2 - 0.6);
        const midY = (anchor1.y + anchor2.y) * 0.5 + sag;

        for (let s = 0; s < crossSegments; s++) {
          const t0 = s / crossSegments;
          const t1 = (s + 1) / crossSegments;

          const getBezier = (tval: number) => {
            const it = 1 - tval;
            return {
              x: it * it * anchor1.x + 2 * it * tval * midX + tval * tval * anchor2.x,
              y: it * it * anchor1.y + 2 * it * tval * midY + tval * tval * anchor2.y,
              z: it * it * anchor1.z + 2 * it * tval * midZ + tval * tval * anchor2.z,
            };
          };

          const b0 = getBezier(t0);
          const b1 = getBezier(t1);

          crossPositions[crossIdx++] = b0.x;
          crossPositions[crossIdx++] = b0.y;
          crossPositions[crossIdx++] = b0.z;

          crossPositions[crossIdx++] = b1.x;
          crossPositions[crossIdx++] = b1.y;
          crossPositions[crossIdx++] = b1.z;
        }
      }
      crossPositionAttr.needsUpdate = true;

      // --- 5. 更新浮动微光节点粒子 ---
      let pIdx = 0;
      for (let i = 0; i < totalPoints; i++) {
        const u = (i / totalPoints + time * 0.03) % 1;
        const streamType = i % 3;
        const lineIdx = Math.floor((i * 3) % STREAM_LINES);
        let pt: { x: number; y: number; z: number };
        if (streamType === 0) {
          pt = getStream1Point(u, time, lineIdx);
        } else if (streamType === 1) {
          pt = getStream2Point(u, time, lineIdx);
        } else {
          pt = getUpperStreamPoint(u, time, Math.min(lineIdx, UPPER_LINES - 1));
        }

        pointPositions[pIdx++] = pt.x;
        pointPositions[pIdx++] = pt.y + 0.12;
        pointPositions[pIdx++] = pt.z;
      }
      pointsPositionAttr.needsUpdate = true;

      // 渲染这一帧
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(render);

    // 侦听主题变化并动态切换配色
    const updateThemePalette = () => {
      const isDark = document.documentElement.classList.contains('dark');
      palette = PALETTES[isDark ? 'dark' : 'light'];

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(palette.fogColor);
        scene.fog.density = palette.fogDensity;
      }

      const applyMat = (mat: THREE.LineBasicMaterial, color: number, opacity: number) => {
        mat.color.setHex(color);
        mat.opacity = opacity;
        mat.blending = palette.blending;
        mat.needsUpdate = true;
      };

      applyMat(warpMaterial, palette.warp, palette.lineOpacity);
      applyMat(weftMaterial, palette.weft, palette.lineOpacity);
      applyMat(upperMaterial, palette.upper, palette.lineOpacity * 0.8);
      applyMat(crossMaterial, palette.cross, palette.crossOpacity);

      glowMat.color.setHex(palette.glow);
      glowMat.opacity = palette.glowOpacity;
      glowMat.blending = palette.blending;
      glowMat.needsUpdate = true;

      pointsMaterial.color.setHex(palette.points);
      pointsMaterial.opacity = palette.pointsOpacity;
      pointsMaterial.blending = palette.blending;
      pointsMaterial.needsUpdate = true;
    };

    // 观察 DOM 的 class 变动以精确响应主题切换
    const observer = new MutationObserver(() => {
      updateThemePalette();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // 资源清理
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      mediaQuery.removeEventListener('change', onMotionChange);
      observer.disconnect();

      // 释放所有 BufferGeometry 与贴图
      warpGeometry.dispose();
      weftGeometry.dispose();
      upperGeometry.dispose();
      crossGeometry.dispose();
      pointsGeometry.dispose();
      glowGeo.dispose();
      glowTexture.dispose();

      // 释放材质
      warpMaterial.dispose();
      weftMaterial.dispose();
      upperMaterial.dispose();
      crossMaterial.dispose();
      pointsMaterial.dispose();
      glowMat.dispose();

      // 释放渲染器与 DOM
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* 顶部柔和环境天光光晕 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand/12 via-brand/4 to-transparent blur-3xl opacity-80" />
      <div className="pointer-events-none absolute right-1/4 -top-20 size-[32rem] rounded-full bg-indigo-500/10 blur-[110px]" />
    </div>
  );
}
