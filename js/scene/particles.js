// ==========================================
// NASTY — Particle Systems
// Ember sparks, gold dust, smoke columns
// ==========================================

import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

// ---- Ember spark system ----
export function createEmberSystem(scene, count = 120) {
  const positions = new Float32Array(count * 3);
  const velocities = [];
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Spawn in a disc under the dragon
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 2;
    positions[i * 3]     = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.random() * -3;
    positions[i * 3 + 2] = Math.sin(angle) * radius;

    velocities.push({
      x: (Math.random() - 0.5) * 0.02,
      y: 0.02 + Math.random() * 0.06,
      z: (Math.random() - 0.5) * 0.02,
      life: Math.random(),
      maxLife: 0.6 + Math.random() * 1.2
    });

    // Ember colors: red-orange to gold
    const heat = Math.random();
    colors[i * 3]     = 0.8 + heat * 0.2;
    colors[i * 3 + 1] = 0.2 + heat * 0.5;
    colors[i * 3 + 2] = 0;

    sizes[i] = 2 + Math.random() * 6;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    size: 0.06,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  return {
    particles,
    velocities,
    update(delta) {
      const pos = particles.geometry.attributes.position.array;
      const col = particles.geometry.attributes.color.array;

      for (let i = 0; i < count; i++) {
        const v = velocities[i];
        v.life += delta;

        pos[i * 3]     += v.x;
        pos[i * 3 + 1] += v.y;
        pos[i * 3 + 2] += v.z;

        const lifePct = v.life / v.maxLife;

        // Fade out near end of life, dim near top
        const opacity = lifePct < 0.8 ? 1 : 1 - (lifePct - 0.8) / 0.2;
        col[i * 3 + 1] = (0.2 + (1 - lifePct) * 0.3) * opacity;

        // Reset when dead
        if (v.life >= v.maxLife) {
          v.life = 0;
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 2;
          pos[i * 3]     = Math.cos(angle) * radius;
          pos[i * 3 + 1] = -2 - Math.random();
          pos[i * 3 + 2] = Math.sin(angle) * radius;
        }
      }

      particles.geometry.attributes.position.needsUpdate = true;
      particles.geometry.attributes.color.needsUpdate = true;
    }
  };
}

// ---- Gold dust particles ----
export function createGoldDust(scene, count = 200) {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffd280,
    size: 0.025,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const dust = new THREE.Points(geo, mat);
  scene.add(dust);

  return {
    dust,
    update(elapsed) {
      const pos = dust.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += 0.003;
        pos[i * 3]     += Math.sin(elapsed * 0.5 + i) * 0.001;

        if (pos[i * 3 + 1] > 5) pos[i * 3 + 1] = -4;
      }
      dust.geometry.attributes.position.needsUpdate = true;
      mat.opacity = 0.3 + Math.sin(elapsed * 0.4) * 0.1;
    }
  };
}

// ---- Smoke columns ----
export function createSmokeSystem(scene) {
  const particles = [];
  const group = new THREE.Group();
  scene.add(group);

  for (let i = 0; i < 20; i++) {
    const geo = new THREE.PlaneGeometry(0.8, 0.8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x111118,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(
      (Math.random() - 0.5) * 3,
      Math.random() * -3 - 1,
      (Math.random() - 0.5) * 2
    );
    mesh.userData = { speed: 0.008 + Math.random() * 0.012, offset: Math.random() * Math.PI * 2 };
    group.add(mesh);
    particles.push(mesh);
  }

  return {
    update(elapsed) {
      particles.forEach(p => {
        p.position.y += p.userData.speed;
        p.rotation.z += 0.003;
        const lifeY = (p.position.y + 4) / 6;
        p.material.opacity = Math.max(0, 0.15 - lifeY * 0.2);
        p.scale.setScalar(1 + lifeY * 2);

        if (p.position.y > 5) {
          p.position.set(
            (Math.random() - 0.5) * 3,
            -2 - Math.random(),
            (Math.random() - 0.5) * 2
          );
        }
      });
    }
  };
}

// ---- Lotus bloom particle burst ----
export function bloomBurst(scene, position) {
  const count = 80;
  const positions = new Float32Array(count * 3);
  const velocities = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const speed = 0.04 + Math.random() * 0.08;

    velocities.push({
      x: Math.sin(theta) * Math.cos(phi) * speed,
      y: Math.cos(theta) * speed * 1.5,
      z: Math.sin(theta) * Math.sin(phi) * speed,
      life: 0, maxLife: 1.5
    });
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0xffd700,
    size: 0.06,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const burst = new THREE.Points(geo, mat);
  scene.add(burst);

  const interval = setInterval(() => {
    const pos = burst.geometry.attributes.position.array;
    let allDead = true;

    for (let i = 0; i < count; i++) {
      const v = velocities[i];
      v.life += 0.025;
      if (v.life < v.maxLife) {
        allDead = false;
        pos[i * 3]     += v.x;
        pos[i * 3 + 1] += v.y;
        pos[i * 3 + 2] += v.z;
        v.y -= 0.002; // gravity
      }
    }

    mat.opacity = Math.max(0, 1 - (velocities[0].life / 1.5));
    burst.geometry.attributes.position.needsUpdate = true;

    if (allDead) {
      clearInterval(interval);
      scene.remove(burst);
      geo.dispose();
      mat.dispose();
    }
  }, 16);
}
