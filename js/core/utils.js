// ==========================================
// NASTY — Utility Functions
// ==========================================

// ---- Toast Notifications ----
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✦', error: '✕', info: '◆', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span style="color:var(--gold)">${icons[type] || icons.info}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- Currency formatter ----
export function formatPrice(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// ---- Truncate text ----
export function truncate(str, n = 60) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// ---- Debounce ----
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ---- Throttle ----
export function throttle(fn, limit = 100) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ---- Generate unique ID ----
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---- Format date ----
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ---- Star rating HTML ----
export function renderStars(rating = 0) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let html = '';
  for (let i = 0; i < full; i++) html += '★';
  if (half) html += '½';
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) html += '☆';
  return html;
}

// ---- Scroll reveal observer ----
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale')
    .forEach(el => observer.observe(el));
}

// ---- Custom cursor ----
export function initCursor() {
  const cursor = document.querySelector('.cursor');
  const ring = document.querySelector('.cursor-ring');
  if (!cursor || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    cursor.style.transform = 'translate(-50%, -50%)';
  });

  function animateRing() {
    ringX += (mouseX - ringX) * 0.15;
    ringY += (mouseY - ringY) * 0.15;
    ring.style.left = ringX + 'px';
    ring.style.top = ringY + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  document.querySelectorAll('a, button, [data-cursor="hover"]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hovering'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hovering'));
  });
}

// ---- Navbar scroll effect ----
export function initNavbar() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', throttle(() => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, 50));
}

// ---- Animate number counter ----
export function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  const startVal = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(startVal + (target - startVal) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// ---- Loading screen ----
export function hideLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;
  setTimeout(() => {
    screen.classList.add('fade-out');
    setTimeout(() => screen.remove(), 800);
  }, 2600);
}

// ---- Simple SPA router ----
export const router = {
  navigate(path) { window.location.href = path; },
  getParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  },
  getHash() { return window.location.hash.slice(1); }
};

// ---- Local cart helpers ----
export const cart = {
  get() { return JSON.parse(localStorage.getItem('nasty_cart') || '[]'); },
  save(items) { localStorage.setItem('nasty_cart', JSON.stringify(items)); },
  add(product) {
    const items = cart.get();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx > -1) items[idx].qty++;
    else items.push({ ...product, qty: 1 });
    cart.save(items);
    cart.updateBadge();
    showToast(`${product.title} added to cart`, 'success');
  },
  remove(id) {
    cart.save(cart.get().filter(i => i.id !== id));
    cart.updateBadge();
  },
  updateQty(id, qty) {
    const items = cart.get();
    const idx = items.findIndex(i => i.id === id);
    if (idx > -1) { items[idx].qty = qty; cart.save(items); }
    cart.updateBadge();
  },
  total() { return cart.get().reduce((s, i) => s + i.price * i.qty, 0); },
  count() { return cart.get().reduce((s, i) => s + i.qty, 0); },
  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const c = cart.count();
      badge.textContent = c;
      badge.style.display = c > 0 ? 'flex' : 'none';
    }
  },
  clear() { localStorage.removeItem('nasty_cart'); cart.updateBadge(); }
};
