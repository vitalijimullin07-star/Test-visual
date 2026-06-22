/**
 * canvas.js — SVG холст с панорамой, зумом и базовыми инструментами
 * Модуль IIFE
 */
(function() {
  'use strict';

  let svg, container;
  let viewBox = { x: 0, y: 0, w: 800, h: 600 };
  let isPanning = false;
  let lastPan = { x: 0, y: 0 };
  let scale = 1;
  let currentTool = 'select';

  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 8;

  function init() {
    svg = document.getElementById('plan-svg');
    container = document.getElementById('canvas-container');

    if (!svg) {
      console.error('SVG не найден');
      return;
    }

    // Инициализация viewBox
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);

    // Touch / Mouse события для панорамы и зума
    setupPanZoom();

    // Клик по SVG для инструментов
    svg.addEventListener('click', handleSvgClick);
    svg.addEventListener('mousemove', updateMousePos);

    // Двойной клик для сброса вида
    svg.addEventListener('dblclick', resetView);

    console.log('[canvas] Инициализирован');
  }

  function setupPanZoom() {
    // Mouse wheel zoom
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomAtPoint(mouseX, mouseY, zoomFactor);
    }, { passive: false });

    // Mouse pan
    svg.addEventListener('mousedown', (e) => {
      if (e.button === 0 && currentTool === 'select') {
        isPanning = true;
        lastPan = { x: e.clientX, y: e.clientY };
        svg.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
      svg.style.cursor = 'crosshair';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      const dx = e.clientX - lastPan.x;
      const dy = e.clientY - lastPan.y;
      pan(dx, dy);
      lastPan = { x: e.clientX, y: e.clientY };
    });

    // Touch support (простая версия)
    let lastTouchDist = 0;
    svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastTouchDist = getTouchDistance(e.touches);
      } else if (e.touches.length === 1 && currentTool === 'select') {
        isPanning = true;
        lastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    svg.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        // Pinch zoom
        const dist = getTouchDistance(e.touches);
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist;
          const rect = svg.getBoundingClientRect();
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
          zoomAtPoint(cx, cy, factor);
        }
        lastTouchDist = dist;
      } else if (e.touches.length === 1 && isPanning) {
        const dx = e.touches[0].clientX - lastPan.x;
        const dy = e.touches[0].clientY - lastPan.y;
        pan(dx, dy);
        lastPan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: false });

    svg.addEventListener('touchend', () => {
      isPanning = false;
      lastTouchDist = 0;
    });
  }

  function getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  function zoomAtPoint(screenX, screenY, factor) {
    const rect = svg.getBoundingClientRect();
    const svgX = viewBox.x + (screenX / rect.width) * viewBox.w;
    const svgY = viewBox.y + (screenY / rect.height) * viewBox.h;

    const newW = viewBox.w / factor;
    const newH = viewBox.h / factor;

    if (newW < 50 || newW > 4000) return; // лимиты

    viewBox.x = svgX - (screenX / rect.width) * newW;
    viewBox.y = svgY - (screenY / rect.height) * newH;
    viewBox.w = newW;
    viewBox.h = newH;

    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    scale = 800 / viewBox.w;
  }

  function pan(dx, dy) {
    const rect = svg.getBoundingClientRect();
    const dxSvg = (dx / rect.width) * viewBox.w;
    const dySvg = (dy / rect.height) * viewBox.h;

    viewBox.x -= dxSvg;
    viewBox.y -= dySvg;
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
  }

  function resetView() {
    viewBox = { x: 0, y: 0, w: 800, h: 600 };
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    scale = 1;
  }

  function handleSvgClick(e) {
    const rect = svg.getBoundingClientRect();
    const svgX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const svgY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;

    // Передаём координаты в активный инструмент
    const event = new CustomEvent('ep:canvas-click', {
      detail: { x: svgX, y: svgY, tool: currentTool, originalEvent: e }
    });
    window.dispatchEvent(event);
  }

  function updateMousePos(e) {
    const rect = svg.getBoundingClientRect();
    const svgX = viewBox.x + ((e.clientX - rect.left) / rect.width) * viewBox.w;
    const svgY = viewBox.y + ((e.clientY - rect.top) / rect.height) * viewBox.h;
    
    const posEl = document.getElementById('mouse-pos');
    if (posEl) {
      posEl.textContent = `${svgX.toFixed(0)} × ${svgY.toFixed(0)}`;
    }
  }

  function setTool(tool) {
    currentTool = tool;
    // Меняем курсор в зависимости от инструмента
    if (tool === 'wall' || tool === 'window' || tool === 'door') {
      svg.style.cursor = 'crosshair';
    } else {
      svg.style.cursor = 'default';
    }
  }

  function getSVGPoint(x, y) {
    // Преобразует экранные координаты в SVG
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + ((x - rect.left) / rect.width) * viewBox.w,
      y: viewBox.y + ((y - rect.top) / rect.height) * viewBox.h
    };
  }

  function getCurrentScale() {
    return scale;
  }

  function getViewBox() {
    return { ...viewBox };
  }

  function clearCanvas() {
    // Удаляем все динамические элементы (стены, точки и т.д. оставляем через отдельные модули)
    const dynamic = svg.querySelectorAll('.wall, .opening, .socket, .junction, .wall-label');
    dynamic.forEach(el => el.remove());
  }

  // Публичное API
  window.EP = window.EP || {};
  window.EP.Canvas = {
    init,
    setTool,
    getSVGPoint,
    getCurrentScale,
    getViewBox,
    clearCanvas,
    resetView,
    zoomAtPoint
  };

  // Авто-инициализация
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
