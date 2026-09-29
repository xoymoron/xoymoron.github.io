const canvas = document.querySelector('.glitch-pixels');
const context = canvas?.getContext('2d', { alpha: true });

if (context) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pulseTimer;
  let clearTimer;
  let width = 0;
  let height = 0;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function clear() {
    context.clearRect(0, 0, width, height);
  }

  function artworkBounds() {
    const marks = document.querySelectorAll('.glitch-mark, .diagram-mark');
    return marks[Math.floor(Math.random() * marks.length)].getBoundingClientRect();
  }

  function drawBurst() {
    clear();
    const light = document.documentElement.dataset.theme === 'light';
    const colors = light
      ? ['#b51d59', '#5435a2', '#b26619', '#0c8071']
      : ['#fb5b9f', '#9382fa', '#f6b837', '#42c7b4'];
    const rect = artworkBounds();
    const visibleLeft = Math.max(0, rect.left);
    const visibleRight = Math.min(width, rect.right);
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(height, rect.bottom);
    const centerX = visibleLeft + (visibleRight - visibleLeft) * (.26 + Math.random() * .48);
    const centerY = visibleTop + (visibleBottom - visibleTop) * (.26 + Math.random() * .48);
    const size = Math.min((visibleRight - visibleLeft) * (.36 + Math.random() * .18), 190);
    const half = size / 2;

    context.globalAlpha = .92;
    context.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    context.beginPath();
    context.moveTo(centerX - half, centerY - half * .43);
    context.lineTo(centerX + half * .75, centerY - half * .7);
    context.lineTo(centerX + half, centerY + half * .53);
    context.lineTo(centerX - half * .64, centerY + half);
    context.closePath();
    context.fill();
    context.globalAlpha = 1;
  }

  function burst() {
    drawBurst();
    clearTimer = window.setTimeout(clear, 90 + Math.random() * 50);
    pulseTimer = window.setTimeout(burst, 1300 + Math.random() * 2900);
  }

  function syncMotion() {
    window.clearTimeout(pulseTimer);
    window.clearTimeout(clearTimer);
    clear();
    if (!motion.matches) {
      pulseTimer = window.setTimeout(burst, 600 + Math.random() * 1500);
    }
  }

  resize();
  syncMotion();
  window.addEventListener('resize', resize);
  motion.addEventListener('change', syncMotion);
}
