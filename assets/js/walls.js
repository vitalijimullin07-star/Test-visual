/**
 * walls.js — Логика рисования стен и проёмов
 * Модуль IIFE
 */
(function() {
  'use strict';

  let svg;
  let isDrawingWall = false;
  let currentWallPoints = [];
  let tempLine = null;
  let orthogonalSnap = true; // По умолчанию включено

  const WALL_COLOR = '#64748b';
  const OPENING_COLOR = '#eab308';

  function init() {
    svg = document.getElementById('plan-svg');
    if (!svg) return;

    // Слушаем клики от canvas
    window.addEventListener('ep:canvas-click', onCanvasClick);

    // Кнопки инструментов
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        setActiveTool(btn, tool);
        if (window.EP && window.EP.Canvas) {
          window.EP.Canvas.setTool(tool);
        }
      });
    });

    // Загружаем существующие стены при старте
    setTimeout(renderAll, 100);

    // Обработчик кнопки "Прямые углы"
    const orthoBtn = document.getElementById('btn-ortho-toggle');
    if (orthoBtn) {
      orthoBtn.addEventListener('click', () => {
        orthogonalSnap = !orthogonalSnap;
        if (orthogonalSnap) {
          orthoBtn.classList.add('active');
        } else {
          orthoBtn.classList.remove('active');
        }
      });
    }

    console.log('[walls] Модуль инициализирован');
  }

  function setActiveTool(activeBtn, tool) {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');

    if (tool === 'select') {
      isDrawingWall = false;
      currentWallPoints = [];
      removeTempLine();
    }
  }

  function onCanvasClick(e) {
    const { x, y, tool } = e.detail;

    if (tool === 'wall') {
      // Для drag-режима клик используется только для старта, если нужно
      // Основная логика теперь на pointer events (см. ниже)
    } else if (tool === 'window' || tool === 'door') {
      handleOpeningPlacement(x, y, tool);
    }
  }

  function handleWallDrawing(x, y) {
    if (!isDrawingWall) {
      // Начинаем новую стену
      isDrawingWall = true;
      currentWallPoints = [{ x, y }];
      createTempLine(x, y);
      updateStatus('Кликните следующую точку стены (двойной клик — завершить)');
    } else {
      // Добавляем точку
      currentWallPoints.push({ x, y });
      updateTempLine(x, y);

      // Если это вторая точка — применяем snap если нужно и сохраняем стену
      if (currentWallPoints.length >= 2) {
        let endPoint = currentWallPoints[1];
        
        if (orthogonalSnap && currentWallPoints.length === 2) {
          const start = currentWallPoints[0];
          const dx = endPoint.x - start.x;
          const dy = endPoint.y - start.y;
          
          // Прилипание к горизонтали или вертикали
          if (Math.abs(dx) > Math.abs(dy)) {
            endPoint = { x: endPoint.x, y: start.y }; // горизонтальная
          } else {
            endPoint = { x: start.x, y: endPoint.y }; // вертикальная
          }
        }
        
        const wall = {
          a: currentWallPoints[0],
          b: endPoint,
          height: 2700
        };
        addWallToProject(wall);
        finishWallDrawing();
      }
    }
  }

  function createTempLine(x, y) {
    removeTempLine();
    tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tempLine.setAttribute('x1', x);
    tempLine.setAttribute('y1', y);
    tempLine.setAttribute('x2', x);
    tempLine.setAttribute('y2', y);
    tempLine.setAttribute('stroke', '#22c55e');
    tempLine.setAttribute('stroke-width', '6');
    tempLine.setAttribute('stroke-dasharray', '8,4');
    tempLine.setAttribute('class', 'temp-wall');
    svg.appendChild(tempLine);
  }

  function updateTempLine(x, y) {
    if (!tempLine) return;
    tempLine.setAttribute('x2', x);
    tempLine.setAttribute('y2', y);
  }

  function removeTempLine() {
    if (tempLine && tempLine.parentNode) {
      tempLine.parentNode.removeChild(tempLine);
    }
    tempLine = null;
  }

  function finishWallDrawing() {
    isDrawingWall = false;
    currentWallPoints = [];
    removeTempLine();
    updateStatus('Стена добавлена. Выберите инструмент или продолжайте.');
  }

  function addWallToProject(wallData) {
    if (!window.EP || !window.EP.Storage) {
      console.error('Storage не инициализирован');
      return;
    }

    const wall = window.EP.Storage.addWall(wallData);
    renderWall(wall);
    updateProjectStats();
  }

  function renderWall(wall) {
    if (!svg) return;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', wall.a.x);
    line.setAttribute('y1', wall.a.y);
    line.setAttribute('x2', wall.b.x);
    line.setAttribute('y2', wall.b.y);
    line.setAttribute('stroke', WALL_COLOR);
    line.setAttribute('stroke-width', '8');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('class', 'wall');
    line.dataset.wallId = wall.id;

    // Клик по стене → открыть развёртку (пока просто логируем)
    line.addEventListener('click', (ev) => {
      ev.stopPropagation();
      openWallProjection(wall);
    });

    svg.appendChild(line);

    // Подпись длины стены (опционально)
    const midX = (wall.a.x + wall.b.x) / 2;
    const midY = (wall.a.y + wall.b.y) / 2;
    const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
    const lenM = (len / (window.EP.Storage.get().scalePxPerM || 50)).toFixed(2);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', midY - 12);
    text.setAttribute('class', 'wall-label');
    text.textContent = `${lenM} м`;
    svg.appendChild(text);
  }

  function handleOpeningPlacement(x, y, type) {
    // Простая версия: ищем ближайшую стену и ставим проём
    const project = window.EP.Storage.get();
    if (!project.walls.length) {
      alert('Сначала нарисуйте хотя бы одну стену');
      return;
    }

    // Находим ближайшую стену (упрощённо)
    let closestWall = null;
    let minDist = Infinity;

    project.walls.forEach(wall => {
      const dist = distanceToSegment(x, y, wall.a, wall.b);
      if (dist < minDist) {
        minDist = dist;
        closestWall = wall;
      }
    });

    if (!closestWall || minDist > 40) {
      alert('Кликните ближе к стене, чтобы поставить проём');
      return;
    }

    // Вычисляем fromCorner
    const fromCorner = distanceAlongWall(x, y, closestWall);

    const opening = {
      wallId: closestWall.id,
      type: type,
      fromCorner: fromCorner,
      width: type === 'door' ? 900 : 1200,
      height: type === 'door' ? 2100 : 1500
    };

    if (!project.openings) project.openings = [];
    project.openings.push(opening);
    window.EP.Storage.save(project);

    renderOpening(opening, closestWall);
    updateStatus(`Добавлен ${type === 'door' ? 'дверь' : 'окно'}`);
  }

  function distanceToSegment(px, py, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - a.x, py - a.y);
    let t = ((px - a.x) * dx + (py - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * dx;
    const projY = a.y + t * dy;
    return Math.hypot(px - projX, py - projY);
  }

  function distanceAlongWall(px, py, wall) {
    const dx = wall.b.x - wall.a.x;
    const dy = wall.b.y - wall.a.y;
    const len = Math.hypot(dx, dy);
    if (len === 0) return 0;

    const t = ((px - wall.a.x) * dx + (py - wall.a.y) * dy) / (len * len);
    return Math.max(0, Math.min(len, t * len));
  }

  function renderOpening(opening, wall) {
    if (!svg || !wall) return;

    const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
    if (len === 0) return;

    const t1 = opening.fromCorner / len;
    const t2 = (opening.fromCorner + opening.width) / len;

    const x1 = wall.a.x + t1 * (wall.b.x - wall.a.x);
    const y1 = wall.a.y + t1 * (wall.b.y - wall.a.y);
    const x2 = wall.a.x + t2 * (wall.b.x - wall.a.x);
    const y2 = wall.a.y + t2 * (wall.b.y - wall.a.y);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', OPENING_COLOR);
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('class', 'opening');
    line.dataset.openingId = opening.id || Date.now();

    svg.appendChild(line);
  }

  function openWallProjection(wall) {
    // Для Этапа 1 просто показываем алерт с информацией
    // В полной версии здесь откроется модал с развёрткой
    const project = window.EP.Storage.get();
    const scale = project.scalePxPerM || 50;
    const lenM = (Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y) / scale).toFixed(2);

    const modal = document.getElementById('wall-modal');
    if (modal) {
      document.getElementById('wall-modal-title').textContent = `(${lenM} м)`;
      modal.classList.remove('hidden');

      // Закрытие
      document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');

      // TODO в следующем шаге: полноценная развёртка + размещение точек
      const body = modal.querySelector('.modal-body');
      body.innerHTML = `
        <p><strong>Стена:</strong> ${lenM} м</p>
        <p>Здесь будет интерактивная развёртка стены для точного размещения розеток по высоте и расстоянию от угла.</p>
        <p style="color:#64748b; font-size:13px;">(Полная версия развёртки будет готова в следующем обновлении Этапа 1)</p>
      `;
    } else {
      alert(`Стена длиной ${lenM} м. Развёртка будет добавлена в следующем шаге.`);
    }
  }

  function renderAll() {
    if (!svg || !window.EP || !window.EP.Storage) return;

    const project = window.EP.Storage.get();
    svg.querySelectorAll('.wall, .opening, .wall-label').forEach(el => el.remove());

    // Рисуем стены
    (project.walls || []).forEach(wall => renderWall(wall));

    // Рисуем проёмы
    (project.openings || []).forEach(op => {
      const wall = (project.walls || []).find(w => w.id === op.wallId);
      if (wall) renderOpening(op, wall);
    });
  }

  function updateStatus(msg) {
    const status = document.getElementById('status-text');
    if (status) status.textContent = msg;
  }

  function updateProjectStats() {
    const project = window.EP.Storage.get();
    const wallsEl = document.getElementById('stat-walls');
    if (wallsEl) wallsEl.textContent = (project.walls || []).length;
  }

  // Публичное API
  window.EP = window.EP || {};
  window.EP.Walls = {
    init,
    renderAll,
    renderWall,
    openWallProjection
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
