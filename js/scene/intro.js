// ==========================================
// NASTY — Cinematic Intro Sequence Controller
// Orchestrates: dark void → dragon rise → lotus bloom → logo reveal
// ==========================================

import { playDragonEntrance, onDragonReady, triggerFireBreath } from './dragonScene.js';
import { bloomLotus, createLotus } from './lotus.js';
import { bloomBurst } from './particles.js';

let sequenceStarted = false;
let skipBtn;

export function initIntroSequence(scene) {
  if (sequenceStarted) return;
  sequenceStarted = true;

  // Skip button
  skipBtn = document.getElementById('intro-skip');
  skipBtn?.addEventListener('click', skipIntro);

  // Wait for dragon to be ready
  onDragonReady(() => {
    // Step 0 — short pause in void (0.5s)
    setTimeout(() => step1_DragonRise(scene), 500);
  });
}

// Step 1: Dragon rises from smoke
function step1_DragonRise(scene) {
  playDragonEntrance();

  // Show rumble text
  showIntroText('AWAKENING...', 'intro-sub', 300);

  // After dragon is up, trigger fire breath → lotus
  setTimeout(() => step2_FireToLotus(scene), 2200);
}

// Step 2: Dragon breathes fire, fire becomes lotus
function step2_FireToLotus(scene) {
  triggerFireBreath();

  // Create lotus at bottom of scene
  createLotus(scene, { x: -2, y: -2, z: 1 });

  setTimeout(() => {
    // Bloom the lotus
    bloomLotus(() => {
      // Burst when fully open
      bloomBurst(scene, { x: -2, y: -1.5, z: 1 });
    });
  }, 400);

  // Proceed to logo reveal
  setTimeout(() => step3_LogoReveal(), 1400);
}

// Step 3: NASTY logo shatters in
function step3_LogoReveal() {
  const logoEl = document.getElementById('hero-logo');
  if (logoEl) {
    logoEl.classList.remove('hidden');
    // Wrap each letter
    const text = 'NASTY';
    logoEl.innerHTML = text.split('').map(l =>
      `<span class="nasty-letter">${l}</span>`
    ).join('');
  }

  // Show tagline
  setTimeout(() => {
    const tagEl = document.getElementById('hero-tagline');
    if (tagEl) {
      tagEl.style.animation = 'taglineFade 0.8s ease forwards';
      tagEl.style.opacity = '1';
    }
  }, 700);

  // Show CTA buttons
  setTimeout(() => {
    const ctaEl = document.getElementById('hero-cta');
    if (ctaEl) {
      ctaEl.style.animation = 'taglineFade 0.8s ease forwards';
      ctaEl.style.opacity = '1';
    }
  }, 1100);

  // Show scroll indicator
  setTimeout(() => {
    const scrollEl = document.getElementById('scroll-hint');
    if (scrollEl) scrollEl.classList.remove('hidden');

    // Hide skip button
    if (skipBtn) skipBtn.classList.add('hidden');

    // Dispatch intro done event
    window.dispatchEvent(new CustomEvent('nasty:introDone'));
  }, 1800);
}

// ---- Skip intro ----
function skipIntro() {
  // Immediately show final state
  const logoEl = document.getElementById('hero-logo');
  if (logoEl) {
    logoEl.classList.remove('hidden');
    logoEl.innerHTML = 'NASTY'.split('').map(l =>
      `<span class="nasty-letter" style="animation-delay:0s">${l}</span>`
    ).join('');
  }

  const tagEl = document.getElementById('hero-tagline');
  if (tagEl) { tagEl.style.opacity = '1'; }

  const ctaEl = document.getElementById('hero-cta');
  if (ctaEl) { ctaEl.style.opacity = '1'; }

  const scrollEl = document.getElementById('scroll-hint');
  if (scrollEl) scrollEl.classList.remove('hidden');

  if (skipBtn) skipBtn.classList.add('hidden');
  window.dispatchEvent(new CustomEvent('nasty:introDone'));
}

// ---- Helper: show floating intro text ----
function showIntroText(text, id, delay) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
      el.style.opacity = '1';
      setTimeout(() => { el.style.opacity = '0'; }, 1200);
    }
  }, delay);
}
