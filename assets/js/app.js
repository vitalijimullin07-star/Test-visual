/**
 * app.js — Главный оркестратор приложения (IIFE)
 * Монтирует все модули, обрабатывает UI-события
 */
(function() {
  'use strict';

  let project = null;

  function init() {
    console.log('%c[Test-visual] Запуск приложения...', 'color:#22c55e');

    // Загружаем проект
    if (window.EP && window.EP.Storage) {
      project = window.EP.Storage.load();
    } else {
      console.error('Storage модуль не загружен!');
      return;
    }

    // Инициализируем модули (порядок важен)
    if (window.EP.Canvas) window.EP.Canvas.init();
    if (window.EP.Walls) window.EP.Walls.init();
    if (window.EP.Sockets) window.EP.Sockets.init();

    // Привязываем кнопки шапки
    bindHeaderButtons();

    // Привязываем калибровку масштаба
    bindCalibrate();

    // Обновляем UI начальными данными
    updateUIFromProject();

    // Слушаем изменения проекта
    window.addEventListener('ep:project-saved', () => {
      updateUIFromProject();
    });

    window.addEventListener('ep:element-added', () => {
      updateUIFromProject();
    });

    // Стартовое сообщение
    setTimeout(() => {
      const status = document.getElementById('status-text');
      if (status && project.walls.length === 0) {
        status.textContent = 'Нарисуйте стены с помощью инструмента "Стена" или загрузите проект.';
      }
    }, 800);

    console.log('%c[Test-visual] Приложение готово к работе (Этап 1)', 'color:#22c55e');
  }

  function bindHeaderButtons() {
    // Сохранить
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        if (window.EP.Storage.save()) {
          const origText = saveBtn.textContent;
          saveBtn.textContent = '✅ Сохранено';
          setTimeout(() => saveBtn.textContent = origText, 1200);
        }
      });
    }

    // Загрузить (пока просто перезагружает из localStorage)
    const loadBtn = document.getElementById('btn-load');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        if (confirm('Перезагрузить проект из памяти? Несохранённые изменения будут потеряны.')) {
          location.reload();
        }
      });
    }

    // Печать / PDF
    const printBtn = document.getElementById('btn-print');
    if (printBtn) {
      printBtn.addEventListener('click', printToPDF);
    }

    // Очистить проект
    const clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Очистить весь проект? Это действие нельзя отменить.')) {
          if (window.EP.Storage.reset) {
            window.EP.Storage.reset();
            location.reload();
          }
        }
      });
    }

    // Undo / Redo (заглушки на будущее)
    const undoBtn = document.getElementById('btn-undo');
    if (undoBtn) undoBtn.addEventListener('click', () => alert('Undo будет добавлен позже'));

    const redoBtn = document.getElementById('btn-redo');
    if (redoBtn) redoBtn.addEventListener('click', () => alert('Redo будет добавлен позже'));
  }

  function bindCalibrate() {
    const calibrateBtn = document.getElementById('btn-calibrate');
    const modal = document.getElementById('calibrate-modal');
    const applyBtn = document.getElementById('btn-apply-scale');
    const cancelBtn = document.getElementById('calibrate-cancel');
    const input = document.getElementById('real-length');

    if (!calibrateBtn || !modal) return;

    calibrateBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      if (input) input.focus();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    if (applyBtn && input) {
      applyBtn.addEventListener('click', () => {
        const realMeters = parseFloat(input.value);
        if (!realMeters || realMeters <= 0) {
          alert('Введите корректную длину в метрах');
          return;
        }

        // Берём последнюю нарисованную стену как эталон
        const proj = window.EP.Storage.get();
        if (!proj.walls || proj.walls.length === 0) {
          alert('Сначала нарисуйте хотя бы одну стену');
          modal.classList.add('hidden');
          return;
        }

        const lastWall = proj.walls[proj.walls.length - 1];
        const pxLength = Math.hypot(lastWall.b.x - lastWall.a.x, lastWall.b.y - lastWall.a.y);
        if (pxLength < 10) {
          alert('Стена слишком короткая для калибровки');
          return;
        }

        const newScale = pxLength / realMeters;
        proj.scalePxPerM = newScale;
        window.EP.Storage.save(proj);

        // Обновляем отображение
        updateScaleDisplay(newScale);
        modal.classList.add('hidden');

        // Перерисовываем подписи длин стен
        if (window.EP.Walls && window.EP.Walls.renderAll) {
          window.EP.Walls.renderAll();
        }

        alert(`Масштаб обновлён: 1 м = ${newScale.toFixed(1)} px`);
      });
    }
  }

  function updateScaleDisplay(scalePxPerM) {
    const el = document.getElementById('scale-display');
    if (el) {
      const metersPerPx = (1 / scalePxPerM).toFixed(3);
      el.textContent = `1 px ≈ ${metersPerPx} м`;
    }
  }

  function updateUIFromProject() {
    if (!project) project = window.EP.Storage.get();

    // Название проекта
    const nameEl = document.getElementById('project-name');
    if (nameEl) nameEl.textContent = project.name || 'Новая квартира';

    const nameInput = document.getElementById('project-name-input');
    if (nameInput) {
      nameInput.value = project.name || '';
      nameInput.oninput = () => {
        project.name = nameInput.value;
        if (nameEl) nameEl.textContent = project.name;
        window.EP.Storage.save(project);
      };
    }

    // Высота потолка
    const ceilingInput = document.getElementById('ceiling-height');
    if (ceilingInput) {
      ceilingInput.value = project.ceilingHeight || 2700;
      ceilingInput.onchange = () => {
        project.ceilingHeight = parseInt(ceilingInput.value) || 2700;
        window.EP.Storage.save(project);
      };
    }

    // Плоскость трассировки
    const routeSelect = document.getElementById('route-plane');
    if (routeSelect) {
      routeSelect.value = project.routePlane || 'floor';
      routeSelect.onchange = () => {
        project.routePlane = routeSelect.value;
        window.EP.Storage.save(project);
      };
    }

    // Статистика
    const wallsEl = document.getElementById('stat-walls');
    if (wallsEl) wallsEl.textContent = (project.walls || []).length;

    const socketsEl = document.getElementById('stat-sockets');
    if (socketsEl) {
      const count = (project.elements || []).filter(e => e.category === 'socket').length;
      socketsEl.textContent = count;
    }

    const scaleEl = document.getElementById('stat-scale');
    if (scaleEl && project.scalePxPerM) {
      scaleEl.textContent = `${project.scalePxPerM.toFixed(1)} px/м`;
    }

    // Масштаб в тулбаре
    updateScaleDisplay(project.scalePxPerM || 50);
  }

  function printToPDF() {
    const svg = document.getElementById('plan-svg');
    if (!svg) {
      alert('SVG не найден');
      return;
    }

    // Создаём временный контейнер для печати
    const printContainer = document.createElement('div');
    printContainer.style.cssText = 'padding:40px; background:white; color:black;';
    
    const title = document.createElement('h1');
    title.textContent = project.name || 'План электропроводки';
    title.style.marginBottom = '20px';
    printContainer.appendChild(title);

    // Клонируем SVG
    const svgClone = svg.cloneNode(true);
    svgClone.style.width = '100%';
    svgClone.style.maxWidth = '100%';
    svgClone.style.height = 'auto';
    printContainer.appendChild(svgClone);

    // Информация
    const info = document.createElement('div');
    info.style.marginTop = '30px';
    info.style.fontSize = '14px';
    info.innerHTML = `
      <p><strong>Масштаб:</strong> ${project.scalePxPerM ? (project.scalePxPerM).toFixed(1) : '—'} px на метр</p>
      <p><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>
      <p><strong>Примечание:</strong> План создан в Test-visual (Этап 1)</p>
    `;
    printContainer.appendChild(info);

    // Временно добавляем в body
    document.body.appendChild(printContainer);

    // Печатаем
    const originalTitle = document.title;
    document.title = (project.name || 'План') + ' — Test-visual';
    
    window.print();

    // Убираем временный контейнер
    setTimeout(() => {
      document.body.removeChild(printContainer);
      document.title = originalTitle;
    }, 100);
  }

  // Запуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
