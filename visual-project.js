// Visual Project V2 — базовая расстановка точек

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let points = [];
let draggingPoint = null;
let lastTap = 0;

function loadPoints() {
  const saved = localStorage.getItem('visual_points_v2');
  if (saved) points = JSON.parse(saved);
}

function savePoints() {
  localStorage.setItem('visual_points_v2', JSON.stringify(points));
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Рисуем точки
  points.forEach((p, index) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
    ctx.fillStyle = draggingPoint === index ? '#eab308' : '#22c55e';
    ctx.fill();
    ctx.strokeStyle = '#166534';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Номер точки
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(index + 1, p.x, p.y + 4);
  });
}

function getPointAt(x, y) {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy < 20 * 20) return i;
  }
  return -1;
}

// === Touch Events ===
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;

  const now = Date.now();
  const pointIndex = getPointAt(x, y);

  if (pointIndex !== -1) {
    // Долгий тап = удаление
    if (now - lastTap < 300) {
      points.splice(pointIndex, 1);
      savePoints();
      draw();
      return;
    }
    draggingPoint = pointIndex;
  } else {
    // Новый тап = новая точка
    points.push({ x, y });
    savePoints();
  }
  lastTap = now;
  draw();
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (draggingPoint === null) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.touches[0].clientX - rect.left;
  const y = e.touches[0].clientY - rect.top;

  points[draggingPoint].x = x;
  points[draggingPoint].y = y;
  draw();
});

canvas.addEventListener('touchend', () => {
  if (draggingPoint !== null) {
    savePoints();
  }
  draggingPoint = null;
});

// Инициализация
loadPoints();
draw();
console.log('%c[Visual V2] Базовая расстановка готова', 'color:#22c55e');
