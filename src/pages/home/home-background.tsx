import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { useAppStore } from '@/state/app-store';

/** 经线（Warp）与纬线（Weft）的分段与线条数量配置。 */
const WARP_LINES = 24;
const WARP_SEGMENTS = 70;
const WEFT_LINES = 24;
const WEFT_SEGMENTS = 70;

const GRID_WIDTH = 56;
const GRID_DEPTH = 50;

interface Palette {
  warp: number;
  weft: number;
  neutral: number;
  points: number;
  lineOpacity: number;
  pointsOpacity: number;
  fogColor: number;
  fogDensity: number;
  blending: THREE.Blending;
}

/** 深浅主题的调色板：深色通透发光，浅色柔和淡雅。 */
const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: {
    warp: 0x2dd4bf, // 品牌青绿 Teal
    weft: 0x818cf8, // 智能体紫蓝 Indigo
    neutral: 0x334155, // 暗色灰网 Slate
    points: 0x7dd3c0,
    lineOpacity: 0.32,
    pointsOpacity: 0.7,
    fogColor: 0x15161d,
    fogDensity: 0.022,
    blending: THREE.AdditiveBlending,
  },
  light: {
    warp: 0x0d9488, // 浅色调深青
    weft: 0x4f46e5, // 浅色调靛蓝
    neutral: 0x94a3b8, // 浅色灰网
    points: 0x0d9488,
    lineOpacity: 0.2,
    pointsOpacity: 0.4,
    fogColor: 0xf8fafc,
    fogDensity: 0.024,
    blending: THREE.NormalBlending,
  },
};

/**
 * 首页全屏 3D 背景组件：
 * 以 Three.js 绘制交织穿插的动态多层经纬织网（Weave Matrix）与微光交点粒子，
 * 柔和表现多智能体规则与 MCP 配置的交错汇聚与编织。
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
    // 构图：相机略微偏左并抬高俯视，使右下方呈现舒展的编织波浪，避开左侧文字标题区
    camera.position.set(-6, 16, 28);
    const lookTarget = new THREE.Vector3(2, -1, 0);
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

    // 粒子：经纬交点微光节点
    const pointsMaterial = new THREE.PointsMaterial({
      color: palette.points,
      size: 0.16,
      transparent: true,
      opacity: palette.pointsOpacity,
      blending: palette.blending,
      depthWrite: false,
    });

    // 1. 经线（沿 X 轴延伸，多条沿 Z 分布）
    const warpLineCount = WARP_LINES;
    const warpSegments = WARP_SEGMENTS;
    const warpVertexCount = warpLineCount * warpSegments * 2;
    const warpPositions = new Float32Array(warpVertexCount * 3);
    const warpGeometry = new THREE.BufferGeometry();
    const warpPositionAttr = new THREE.BufferAttribute(warpPositions, 3);
    warpGeometry.setAttribute('position', warpPositionAttr);
    const warpLines = new THREE.LineSegments(warpGeometry, warpMaterial);
    scene.add(warpLines);

    // 2. 纬线（沿 Z 轴延伸，多条沿 X 分布）
    const weftLineCount = WEFT_LINES;
    const weftSegments = WEFT_SEGMENTS;
    const weftVertexCount = weftLineCount * weftSegments * 2;
    const weftPositions = new Float32Array(weftVertexCount * 3);
    const weftGeometry = new THREE.BufferGeometry();
    const weftPositionAttr = new THREE.BufferAttribute(weftPositions, 3);
    weftGeometry.setAttribute('position', weftPositionAttr);
    const weftLines = new THREE.LineSegments(weftGeometry, weftMaterial);
    scene.add(weftLines);

    // 3. 交织节点粒子（从交点中挑选若干节点）
    const sampleXCount = 12;
    const sampleZCount = 12;
    const totalPoints = sampleXCount * sampleZCount;
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
      // 归一化到 [-1, 1]
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

    // 动画波浪计算函数：垂直高度起伏
    const computeHeight = (x: number, z: number, t: number, strandPhase = 0) => {
      const w1 = Math.sin(x * 0.09 + t * 0.45 + z * 0.06 + strandPhase) * 1.1;
      const w2 = Math.cos(z * 0.08 - t * 0.35 + x * 0.04) * 0.85;
      const ripple = Math.sin(Math.sqrt(x * x + z * z) * 0.08 - t * 0.4) * 0.45;
      // 编织交错效果：依据 z 和 x 的网格奇偶位置交错凸起与凹陷
      const weaveShift = Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.35;
      return w1 + w2 + ripple + weaveShift;
    };

    // 经线在水平面上的波浪蛇行偏移：让每根经线呈现柔和水波曲线
    const computeWarpZ = (x: number, baseZ: number, lineIndex: number, t: number) => {
      const wave = Math.sin(x * 0.1 + t * 0.35 + lineIndex * 0.16) * 1.4;
      const subWave = Math.cos(x * 0.05 - t * 0.25 + baseZ * 0.06) * 0.65;
      return baseZ + wave + subWave;
    };

    // 纬线在水平面上的波浪蛇行偏移：让每根纬线呈现正交水波曲线
    const computeWeftX = (z: number, baseX: number, lineIndex: number, t: number) => {
      const wave = Math.sin(z * 0.1 + t * 0.35 + lineIndex * 0.16) * 1.4;
      const subWave = Math.cos(z * 0.05 - t * 0.25 + baseX * 0.06) * 0.65;
      return baseX + wave + subWave;
    };

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

    const render = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(render);
      if (!isTabVisible) {
        return;
      }

      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      // 如果未开启减弱动效，平滑推进时间（放缓速率使波浪更加舒缓沉静）
      if (!reducedMotion) {
        time += delta * 0.4;
      }

      // 更柔和沉静的鼠标平滑阻尼
      const lerpSpeed = 0.02;
      mouseX += (targetMouseX - mouseX) * lerpSpeed;
      mouseY += (targetMouseY - mouseY) * lerpSpeed;

      // 相机在基础视角上附带轻微视差倾斜，幅度温和克制
      const parallaxFactor = reducedMotion ? 0.15 : 0.65;
      camera.position.x = -6 + mouseX * 1.5 * parallaxFactor;
      camera.position.y = 16 + mouseY * 1.0 * parallaxFactor;
      camera.lookAt(lookTarget.x + mouseX * 0.4, lookTarget.y + mouseY * 0.25, lookTarget.z);

      // --- 1. 更新经线（Warp：波浪状曲线）---
      let warpIdx = 0;
      const xStart = -GRID_WIDTH * 0.5;
      const zStart = -GRID_DEPTH * 0.5;
      const zStep = GRID_DEPTH / (warpLineCount - 1);
      const xStep = GRID_WIDTH / warpSegments;

      for (let l = 0; l < warpLineCount; l++) {
        const baseZ = zStart + l * zStep;
        for (let s = 0; s < warpSegments; s++) {
          const x0 = xStart + s * xStep;
          const x1 = xStart + (s + 1) * xStep;
          const z0 = computeWarpZ(x0, baseZ, l, time);
          const z1 = computeWarpZ(x1, baseZ, l, time);
          const y0 = computeHeight(x0, z0, time, 0);
          const y1 = computeHeight(x1, z1, time, 0);

          // 段起点
          warpPositions[warpIdx++] = x0;
          warpPositions[warpIdx++] = y0;
          warpPositions[warpIdx++] = z0;
          // 段终点
          warpPositions[warpIdx++] = x1;
          warpPositions[warpIdx++] = y1;
          warpPositions[warpIdx++] = z1;
        }
      }
      warpPositionAttr.needsUpdate = true;

      // --- 2. 更新纬线（Weft：波浪状曲线）---
      let weftIdx = 0;
      const weftXStep = GRID_WIDTH / (weftLineCount - 1);
      const weftZStep = GRID_DEPTH / weftSegments;

      for (let l = 0; l < weftLineCount; l++) {
        const baseX = xStart + l * weftXStep;
        for (let s = 0; s < weftSegments; s++) {
          const z0 = zStart + s * weftZStep;
          const z1 = zStart + (s + 1) * weftZStep;
          const x0 = computeWeftX(z0, baseX, l, time);
          const x1 = computeWeftX(z1, baseX, l, time);
          // 加上反相偏移以形成经纬穿插视觉
          const y0 = computeHeight(x0, z0, time, Math.PI * 0.5);
          const y1 = computeHeight(x1, z1, time, Math.PI * 0.5);

          weftPositions[weftIdx++] = x0;
          weftPositions[weftIdx++] = y0;
          weftPositions[weftIdx++] = z0;

          weftPositions[weftIdx++] = x1;
          weftPositions[weftIdx++] = y1;
          weftPositions[weftIdx++] = z1;
        }
      }
      weftPositionAttr.needsUpdate = true;

      // --- 3. 更新节点粒子 ---
      let pIdx = 0;
      const xSampleStep = GRID_WIDTH / (sampleXCount + 1);
      const zSampleStep = GRID_DEPTH / (sampleZCount + 1);

      for (let ix = 1; ix <= sampleXCount; ix++) {
        const baseX = xStart + ix * xSampleStep;
        for (let iz = 1; iz <= sampleZCount; iz++) {
          const baseZ = zStart + iz * zSampleStep;
          const px = computeWeftX(baseZ, baseX, ix, time);
          const pz = computeWarpZ(baseX, baseZ, iz, time);
          const py = computeHeight(px, pz, time, 0) + 0.15;
          pointPositions[pIdx++] = px;
          pointPositions[pIdx++] = py;
          pointPositions[pIdx++] = pz;
        }
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

      // 释放所有 BufferGeometry
      warpGeometry.dispose();
      weftGeometry.dispose();
      pointsGeometry.dispose();

      // 释放材质
      warpMaterial.dispose();
      weftMaterial.dispose();
      pointsMaterial.dispose();

      // 释放渲染器与 DOM
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true" />
  );
}
