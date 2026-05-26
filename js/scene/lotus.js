// ==========================================
// NASTY — Lotus Bloom (Procedural Three.js)
// Pure geometry — no GLB needed
// ==========================================

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

let lotusGroup = null;
let petalMeshes = [];
let bloomProgress = 0;
let isBloooming = false;
let bloomInterval = null;

// ---- Create a single petal ----
function createPetal(index, totalPetals, layer = 0) {
  const shape = new THREE.Shape();
  const petalLength = 0.7 - layer * 0.15;
  const petalWidth = 0.22 - layer * 0.04;

  // Petal outline — pointed ellipse
  shape.moveTo(0, 0);
  shape.bezierCurveTo(-petalWidth, petalLength * 0.3, -petalWidth * 0.6, petalLength * 0.8, 0, petalLength);
  shape.bezierCurveTo(petalWidth * 0.6, petalLength * 0.8, petalWidth, petalLength * 0.3, 0, 0);

  const geometry = new THREE.ShapeGeometry(shape, 12);

  // Gold-to-white gradient emulation via vertex colors
  const colors = [];
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / petalLength;
    // Root: deep gold, tip: light shimmer
    colors.push(0.6 + y * 0.4, 0.4 + y * 0.45, 0.1 + y * 0.3);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.3,
    roughness: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
    emissive: new THREE.Color(0x3a2000),
    emissiveIntensity: 0.2
  });

  const petal = new THREE.Mesh(geometry, material);

  // Position around circle
  const angle = (index / totalPetals) * Math.PI * 2;
  const radius = 0.18 + layer * 0.12;

  petal.position.x = Math.cos(angle) * radius;
  petal.position.z = Math.sin(angle) * radius;
  petal.rotation.y = -angle;

  // Start closed (rotated flat)
  petal.rotation.x = Math.PI * 0.45;

  petal.userData = {
    targetRotX: -Math.PI * 0.2 + layer * 0.08,
    layer,
    angle,
    openDelay: layer * 0.25 + (index / totalPetals) * 0.15
  };

  return petal;
}

// ---- Build lotus ----
export function createLotus(scene, position = { x: 0, y: -1.5, z: 0 }) {
  if (lotusGroup) scene.remove(lotusGroup);

  lotusGroup = new THREE.Group();
  lotusGroup.position.set(position.x, position.y, position.z);
  petalMeshes = [];

  // 3 layers: outer (8), middle (6), inner (5)
  const layers = [
    { count: 8, radius: 0.36, layer: 0 },
    { count: 6, radius: 0.22, layer: 1 },
    { count: 5, radius: 0.12, layer: 2 }
  ];

  layers.forEach(({ count, layer }) => {
    for (let i = 0; i < count; i++) {
      const petal = createPetal(i, count, layer);
      lotusGroup.add(petal);
      petalMeshes.push(petal);
    }
  });

  // Center stamen — golden sphere
  const stamenGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const stamenMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xff8800,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.1
  });
  const stamen = new THREE.Mesh(stamenGeo, stamenMat);
  stamen.position.y = 0.06;
  lotusGroup.add(stamen);

  // Add point light inside lotus for glow
  const glow = new THREE.PointLight(0xffcc44, 2, 3);
  glow.position.y = 0.2;
  lotusGroup.add(glow);

  scene.add(lotusGroup);
  return lotusGroup;
}

// ---- Bloom animation ----
export function bloomLotus(onComplete) {
  if (isBloooming || !lotusGroup) return;
  isBloooming = true;
  bloomProgress = 0;

  bloomInterval = setInterval(() => {
    bloomProgress += 0.016;

    petalMeshes.forEach((petal) => {
      const delay = petal.userData.openDelay;
      const t = Math.max(0, Math.min(1, (bloomProgress - delay) / 0.6));

      if (t > 0) {
        // Ease out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        const startX = Math.PI * 0.45;
        const endX = petal.userData.targetRotX;
        petal.rotation.x = startX + (endX - startX) * eased;

        // Fade in with bloom
        petal.material.opacity = 0.3 + 0.62 * eased;
        petal.material.emissiveIntensity = 0.1 + 0.4 * eased;
      }
    });

    if (bloomProgress >= 1.6) {
      clearInterval(bloomInterval);
      isBloooming = false;
      onComplete?.();
    }
  }, 16);
}

// ---- Gentle idle float ----
export function updateLotus(elapsed) {
  if (!lotusGroup) return;

  // Float up and down
  lotusGroup.position.y = -1.5 + Math.sin(elapsed * 0.6) * 0.06;
  lotusGroup.rotation.y = elapsed * 0.15;

  // Petal shimmer
  petalMeshes.forEach((petal, i) => {
    const shimmer = Math.sin(elapsed * 1.2 + i * 0.4) * 0.05;
    petal.material.emissiveIntensity = 0.2 + shimmer;
  });
}

// ---- Reset lotus to closed ----
export function resetLotus() {
  if (bloomInterval) clearInterval(bloomInterval);
  isBloooming = false;
  bloomProgress = 0;

  petalMeshes.forEach(petal => {
    petal.rotation.x = Math.PI * 0.45;
    petal.material.opacity = 0;
  });
}
