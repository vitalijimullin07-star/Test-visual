/**
 * storage.js — Работа с проектом и localStorage
 * Модуль IIFE, экспортирует API через window.EP.Storage
 */
(function() {
  'use strict';

  const STORAGE_KEY = 'test-visual-project-v1';

  // Базовая модель проекта (минимально для Этапа 1)
  function createEmptyProject() {
    return {
      id: 'proj-' + Date.now(),
      name: 'Новая квартира',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      
      // Геометрия
      scalePxPerM: 50,           // 50 px = 1 метр (по умолчанию)
      ceilingHeight: 2700,       // мм
      routePlane: 'floor',       // 'floor' | 'ceiling'
      
      walls: [],                 // [{id, a:{x,y}, b:{x,y}, height:2700}]
      openings: [],              // [{id, wallId, type:'window'|'door'|'entrance', fromCorner, width, height}]
      
      elements: [],              // [{id, category:'socket', plan:{x,y}, wall:{wallId, fromFloor, fromCorner}, label, params}]
      junctionBoxes: [],
      
      groups: [],
      layers: {
        sockets: true,
        lighting: true,
        lowvolt: true,
        warmfloor: true,
        climate: true
      }
    };
  }

  let currentProject = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        currentProject = JSON.parse(raw);
        // Миграция на случай старых версий
        if (!currentProject.walls) currentProject.walls = [];
        if (!currentProject.openings) currentProject.openings = [];
        if (!currentProject.elements) currentProject.elements = [];
        if (!currentProject.scalePxPerM) currentProject.scalePxPerM = 50;
      } else {
        currentProject = createEmptyProject();
      }
    } catch (e) {
      console.error('Ошибка загрузки проекта:', e);
      currentProject = createEmptyProject();
    }
    return currentProject;
  }

  function save(project) {
    if (project) currentProject = project;
    currentProject.updated = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProject));
      // Уведомляем другие модули
      window.dispatchEvent(new CustomEvent('ep:project-saved', { detail: currentProject }));
      return true;
    } catch (e) {
      console.error('Ошибка сохранения:', e);
      return false;
    }
  }

  function get() {
    return currentProject || load();
  }

  function update(partial) {
    Object.assign(currentProject, partial);
    return save();
  }

  function reset() {
    currentProject = createEmptyProject();
    save();
    return currentProject;
  }

  function addWall(wall) {
    if (!currentProject.walls) currentProject.walls = [];
    wall.id = wall.id || 'wall-' + Date.now();
    currentProject.walls.push(wall);
    save();
    return wall;
  }

  function addElement(el) {
    if (!currentProject.elements) currentProject.elements = [];
    el.id = el.id || 'el-' + Date.now();
    currentProject.elements.push(el);
    save();
    window.dispatchEvent(new CustomEvent('ep:element-added', { detail: el }));
    return el;
  }

  function getElementsByCategory(cat) {
    return (currentProject.elements || []).filter(e => e.category === cat);
  }

  // Публичное API
  window.EP = window.EP || {};
  window.EP.Storage = {
    load,
    save,
    get,
    update,
    reset,
    addWall,
    addElement,
    getElementsByCategory,
    createEmptyProject
  };

  // Автозагрузка при старте модуля
  load();
})();
