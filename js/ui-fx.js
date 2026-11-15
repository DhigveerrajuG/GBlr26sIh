/**
 * SIH Support Desk - UI Effects, Confetti, and Toasts
 */

// --- Toast System ---
function showToast(title, message, type = 'info', duration = 4500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconMap = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || iconMap.info}</div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  if (window.soundFX) {
    if (type === 'success') window.soundFX.playSuccess();
    else if (type === 'error' || type === 'warning') window.soundFX.playAlert();
    else window.soundFX.playClick();
  }

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  }, duration);
}

// --- Confetti Explosion Effect ---
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas') || (() => {
    const c = document.createElement('canvas');
    c.id = 'confettiCanvas';
    document.body.appendChild(c);
    return c;
  })();

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const count = 90;
  const colors = ['#007366', '#005A50', '#D97706', '#F59E0B', '#10B981', '#3B82F6', '#EC4899'];

  for (let i = 0; i < count; i++) {
    pieces.push({
      x: canvas.width / 2,
      y: canvas.height / 2 + 100,
      w: Math.random() * 9 + 5,
      h: Math.random() * 9 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18 - 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }

  let animationFrame;
  let startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.008;

      if (p.opacity > 0 && p.y < canvas.height + 50) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    });

    if (activeCount > 0 && elapsed < 3500) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  render();
}

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Device ID Helper
function getDeviceId() {
  const DEVICE_KEY = 'sih_device_id';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    if (window.crypto && window.crypto.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      id = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    } else {
      id = 'dev-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

window.showToast = showToast;
window.launchConfetti = launchConfetti;
window.escapeHtml = escapeHtml;
window.getDeviceId = getDeviceId;
