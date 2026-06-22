/**
 * sockets.js — Размещение розеток на плане и через развёртку стены
 * Модуль IIFE (Этап 1 — базовая версия)
 */
(function() {
  'use strict';

  let svg;
  let currentSocketTool = 'place';

  function init() {
    svg = document.getElementById('plan-svg');

    // Слушаем клики canvas
    window.addEventListener('ep:canvas-click', onCanvasClickForSockets);

    // Кнопки в вкладке Розетки
    document.querySelectorAll('.tool-btn[data-socket-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn[data-socket-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSocketTool = btn.dataset.socketTool;
      });
    });

    // Переключение вкладок
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchTab(target);
      });
    });

    // Кнопка "Поставить точку на стене" в модале (пока заглушка)
    const placeBtn = document.getElementById('btn-place-on-wall');
    if (placeBtn) {
      placeBtn.addEventListener('click', placePointFromWallInputs);
    }

    // Загружаем существующие розетки
    setTimeout(renderAllSockets, 150);

    console.log('[sockets] Модуль инициализирован');
  }

  function switchTab(tabName) {
    // Скрываем все view
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    // Показываем нужный
    const view = document.getElementById(tabName + '-view');
    if (view) view.classList.add('active');

    // Активируем таб
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');

    // При переключении на план — обновляем рендер
    if (tabName === 'plan' && window.EP && window.EP.Walls) {
      window.EP.Walls.renderAll();
    }
    if (tabName === 'sockets') {
      renderAllSockets();
    }
  }

  function onCanvasClickForSockets(e) {
    const { x, y, tool } = e.detail;
    
    // Работает только если активна вкладка "Розетки" или инструмент select
    const socketsView = document.getElementById('sockets-view');
    const isSocketsActive = socketsView && socketsView.classList.contains('active');

    if (!isSocketsActive && tool !== 'select') return;

    if (currentSocketTool === 'place') {
      placeSocketOnPlan(x, y);
    }
  }

  function placeSocketOnPlan(x, y) {
    if (!window.EP || !window.EP.Storage) return;

    const project = window.EP.Storage.get();

    const socket = {
      category: 'socket',
      plan: { x: Math.round(x), y: Math.round(y) },
      wall: null,                    // будет заполнено при размещении через развёртку
      label: `Розетка ${project.elements.filter(e => e.category === 'socket').length + 1}`,
      params: {
        height: parseInt(document.getElementById('default-height')?.value) || 300,
        type: 'euro'                 // euro | power | data и т.д.
      }
    };

    window.EP.Storage.addElement(socket);
    renderSocket(socket);
    updateSocketsList();
    updateProjectStats();
  }

  function renderSocket(socket) {
    if (!svg || !socket.plan) return;

    // Удаляем старую, если есть
    const old = svg.querySelector(`[data-socket-id="${socket.id}"]`);
    if (old) old.remove();

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('data-socket-id', socket.id);
    g.setAttribute('class', 'socket-group');

    // Круг розетки
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', socket.plan.x);
    circle.setAttribute('cy', socket.plan.y);
    circle.setAttribute('r', '14');
    circle.setAttribute('class', 'socket');
    circle.setAttribute('fill', '#22c55e');
    circle.setAttribute('stroke', '#166534');
    circle.setAttribute('stroke-width', '3');

    // Номер
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', socket.plan.x);
    text.setAttribute('y', socket.plan.y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#052e16');
    text.setAttribute('font-size', '11');
    text.setAttribute('font-weight', '700');
    text.textContent = socket.label ? socket.label.split(' ').pop() : '?';

    g.appendChild(circle);
    g.appendChild(text);
    svg.appendChild(g);

    // Клик по розетке — показать инфо
    g.addEventListener('click', (ev) => {
      ev.stopPropagation();
      showSocketInfo(socket);
    });
  }

  function showSocketInfo(socket) {
    const msg = `${socket.label}\n` +
                `План: ${socket.plan.x} × ${socket.plan.y}\n` +
                (socket.wall ? `Стена: высота ${socket.wall.fromFloor} мм, от угла ${socket.wall.fromCorner} мм` : 'Без привязки к стене');
    alert(msg);
  }

  function renderAllSockets() {
    if (!svg || !window.EP || !window.EP.Storage) return;

    // Удаляем старые
    svg.querySelectorAll('.socket-group').forEach(el => el.remove());

    const project = window.EP.Storage.get();
    (project.elements || [])
      .filter(e => e.category === 'socket')
      .forEach(renderSocket);

    updateSocketsList();
  }

  function updateSocketsList() {
    const listEl = document.getElementById('sockets-list');
    if (!listEl || !window.EP || !window.EP.Storage) return;

    const project = window.EP.Storage.get();
    const sockets = (project.elements || []).filter(e => e.category === 'socket');

    listEl.innerHTML = '';

    if (sockets.length === 0) {
      listEl.innerHTML = '<div style="color:#64748b; padding:12px 0;">Розеток пока нет. Кликните на плане или на стене.</div>';
      return;
    }

    sockets.forEach(s => {
      const item = document.createElement('div');
      item.className = 'socket-item';
      item.innerHTML = `
        <div>
          <strong>${s.label}</strong><br>
          <small style="color:#64748b;">
            ${s.plan ? `План: ${s.plan.x}×${s.plan.y}` : ''}
            ${s.wall ? ` | Высота: ${s.wall.fromFloor} мм` : ''}
          </small>
        </div>
        <button class="btn small danger" data-id="${s.id}">Удалить</button>
      `;

      item.querySelector('button').addEventListener('click', () => {
        if (confirm('Удалить эту розетку?')) {
          deleteSocket(s.id);
        }
      });

      listEl.appendChild(item);
    });
  }

  function deleteSocket(id) {
    const project = window.EP.Storage.get();
    project.elements = (project.elements || []).filter(e => e.id !== id);
    window.EP.Storage.save(project);

    // Перерисовать
    if (svg) {
      const el = svg.querySelector(`[data-socket-id="${id}"]`);
      if (el) el.remove();
    }
    updateSocketsList();
    updateProjectStats();
  }

  function placePointFromWallInputs() {
    // Заглушка для Этапа 1 — в следующей итерации сделаем полноценную развёртку
    const height = parseInt(document.getElementById('point-height').value) || 300;
    const distance = parseInt(document.getElementById('point-distance').value) || 500;

    alert(`(Этап 1) Точка будет поставлена на высоте ${height} мм и расстоянии ${distance} мм от угла.\n\nПолноценная развёртка стены + автоматический пересчёт координат на план будет в следующем обновлении.`);

    // Закрываем модал
    document.getElementById('wall-modal').classList.add('hidden');
  }

  function updateProjectStats() {
    const project = window.EP.Storage.get();
    const socketsEl = document.getElementById('stat-sockets');
    if (socketsEl) {
      const count = (project.elements || []).filter(e => e.category === 'socket').length;
      socketsEl.textContent = count;
    }
  }

  // Публичное API
  window.EP = window.EP || {};
  window.EP.Sockets = {
    init,
    renderAllSockets,
    placeSocketOnPlan
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
