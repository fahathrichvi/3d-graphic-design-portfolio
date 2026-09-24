/* =========================================================
   FAHATH — 3D scene (Three.js)
   A glowing creative helix wrapped in film strips, floating
   holo panels and neon rings. Scrolling flies the camera down
   the spiral until it reaches a black hole at the Contact section.
   ========================================================= */
(async () => {
  const canvas = document.getElementById('bg3d');
  const ready = () => window.dispatchEvent(new Event('scene-ready'));
  const fail = () => { document.documentElement.classList.add('no-webgl'); ready(); };

  let THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass;
  try {
    [THREE, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three'),
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]);
  } catch (e) { console.warn('3D disabled:', e); return fail(); }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { console.warn('WebGL unavailable:', e); return fail(); }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = innerWidth < 900;
  const DPR = Math.min(devicePixelRatio, mobile ? 1.5 : 1.75);

  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x04050b, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04050b, 0.011);
  const camera = new THREE.PerspectiveCamera(mobile ? 62 : 50, innerWidth / innerHeight, 0.1, 600);

  /* ---------- palette ---------- */
  const PAL = ['#ffc978', '#ff8a2b', '#ff3fa4', '#8b5cf6', '#34e1ff'].map((c) => new THREE.Color(c));
  const colorAt = (t, out = new THREE.Color()) => {
    t = THREE.MathUtils.clamp(t, 0, 1) * (PAL.length - 1);
    const i = Math.min(Math.floor(t), PAL.length - 2);
    return out.copy(PAL[i]).lerp(PAL[i + 1], t - i);
  };

  /* ---------- helpers ---------- */
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.75)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();

  const pointsMat = (size, opacity = 1) => new THREE.PointsMaterial({
    size, map: glowTex, vertexColors: true, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });

  const TOP = 22, BOTTOM = -150, BH_Y = -168;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ======================================================
     1. STARFIELD
     ====================================================== */
  {
    const N = mobile ? 2200 : 4500;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = rand(60, 260), a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, rand(-320, 140), Math.sin(a) * r], i * 3);
      c.setHSL(Math.random() < 0.7 ? 0.62 : 0.08, 0.5, rand(0.6, 0.95));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(g, pointsMat(1.1, 0.85));
    stars.material.fog = false;
    stars.name = 'stars';
    scene.add(stars);
  }

  /* ======================================================
     2. THE CREATIVE HELIX (DNA strands + glowing rungs)
     ====================================================== */
  const helix = new THREE.Group();
  scene.add(helix);
  const TWIST = 0.32, R = 5;
  const radiusAt = (t) => R * (1 - THREE.MathUtils.smoothstep(t, 0.82, 1) * 0.75);
  {
    const N = mobile ? 1300 : 2600;
    const pos = new Float32Array(N * 2 * 3), col = new Float32Array(N * 2 * 3);
    const rungPos = [], rungCol = [], beadPos = [], beadCol = [];
    const c = new THREE.Color(), c2 = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), y = TOP + (BOTTOM - TOP) * t, a = y * TWIST, r = radiusAt(t);
      colorAt(t, c);
      for (let s = 0; s < 2; s++) {
        const aa = a + s * Math.PI, j = (i * 2 + s) * 3;
        pos[j] = Math.cos(aa) * r + rand(-0.12, 0.12);
        pos[j + 1] = y + rand(-0.12, 0.12);
        pos[j + 2] = Math.sin(aa) * r + rand(-0.12, 0.12);
        const k = s ? 0.75 : 1;
        col[j] = c.r * k; col[j + 1] = c.g * k; col[j + 2] = c.b * k;
      }
      // rungs (base pairs)
      if (i % (mobile ? 10 : 8) === 0) {
        const x1 = Math.cos(a) * r, z1 = Math.sin(a) * r, x2 = -x1, z2 = -z1;
        rungPos.push(x1, y, z1, x2, y, z2);
        c2.copy(c).multiplyScalar(0.6);
        rungCol.push(c2.r, c2.g, c2.b, c2.r, c2.g, c2.b);
        for (let b = 1; b < 6; b++) {
          const f = b / 6;
          beadPos.push(x1 + (x2 - x1) * f, y, z1 + (z2 - z1) * f);
          const bc = new THREE.Color(b % 2 ? '#ffb45c' : '#ffe2a8');
          beadCol.push(bc.r, bc.g, bc.b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    helix.add(new THREE.Points(g, pointsMat(0.3, 0.85)));

    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rungPos, 3));
    rg.setAttribute('color', new THREE.Float32BufferAttribute(rungCol, 3));
    helix.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(beadPos, 3));
    bg.setAttribute('color', new THREE.Float32BufferAttribute(beadCol, 3));
    helix.add(new THREE.Points(bg, pointsMat(0.26, 0.9)));
  }

  /* ======================================================
     3. FILM STRIP RIBBONS spiralling around the helix
     ====================================================== */
  const filmTexture = (hues) => {
    const W = 1024, H = 180, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12,10,24,0.85)'; g.fillRect(0, 0, W, H);
    // edges
    g.fillStyle = 'rgba(255,220,170,0.9)';
    g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3);
    // sprocket holes
    for (let x = 6; x < W; x += 26) {
      g.fillStyle = 'rgba(255,230,190,0.85)';
      g.fillRect(x, 12, 12, 14); g.fillRect(x, H - 26, 12, 14);
    }
    // 4 frames
    const fw = W / 4;
    hues.forEach((h, i) => {
      const x = i * fw + 10, y = 36, w = fw - 20, hh = H - 72;
      const grd = g.createLinearGradient(x, y, x + w, y + hh);
      grd.addColorStop(0, `hsla(${h},95%,62%,0.95)`);
      grd.addColorStop(0.55, `hsla(${(h + 40) % 360},90%,40%,0.7)`);
      grd.addColorStop(1, `hsla(${(h + 200) % 360},90%,30%,0.4)`);
      g.fillStyle = grd; g.fillRect(x, y, w, hh);
      // little "scene" shapes inside frames
      g.globalAlpha = 0.55; g.fillStyle = '#fff';
      g.beginPath();
      if (i % 3 === 0) { g.arc(x + w * 0.62, y + hh * 0.42, hh * 0.22, 0, Math.PI * 2); }
      else if (i % 3 === 1) { g.moveTo(x + 10, y + hh); g.lineTo(x + w * 0.4, y + hh * 0.3); g.lineTo(x + w * 0.7, y + hh * 0.7); g.lineTo(x + w - 10, y + hh * 0.2); g.lineTo(x + w - 10, y + hh); }
      else { g.rect(x + w * 0.2, y + hh * 0.25, w * 0.25, hh * 0.5); g.rect(x + w * 0.55, y + hh * 0.4, w * 0.25, hh * 0.35); }
      g.fill(); g.globalAlpha = 1;
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.strokeRect(x, y, w, hh);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };

  const makeRibbon = ({ radius, twist, phase, width, hues, opacity, yTop = TOP + 4, yBot = BOTTOM + 6 }) => {
    const SEG = mobile ? 600 : 1100;
    const verts = [], uvs = [], idx = [];
    let len = 0, prev = null;
    const frameLen = 9.5; // world units per texture repeat (4 frames)
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG, y = yTop + (yBot - yTop) * t, a = y * twist + phase;
      const r = radius * (1 - THREE.MathUtils.smoothstep(t, 0.8, 1) * 0.6);
      const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      if (prev) len += p.distanceTo(prev);
      prev = p;
      verts.push(p.x, p.y + width / 2, p.z, p.x, p.y - width / 2, p.z);
      uvs.push(len / frameLen, 1, len / frameLen, 0);
      if (i < SEG) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    const m = new THREE.MeshBasicMaterial({
      map: filmTexture(hues), transparent: true, opacity, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    return new THREE.Mesh(g, m);
  };

  const ribbons = new THREE.Group();
  scene.add(ribbons);
  const ribbonA = makeRibbon({ radius: 10, twist: 0.2, phase: 0, width: 2.1, hues: [30, 330, 190, 45], opacity: 0.5 });
  const ribbonB = makeRibbon({ radius: 14, twist: -0.13, phase: 2, width: 1.5, hues: [190, 280, 20, 320], opacity: 0.32 });
  ribbons.add(ribbonA, ribbonB);

  /* ---------- neon light trails ---------- */
  const trails = new THREE.Group();
  scene.add(trails);
  [[12, 0.25, 1.2, 0], [7.5, -0.4, 3.5, 0.3], [16, 0.16, 5, 0.6]].forEach(([r, tw, ph, hueShift]) => {
    const pts = [], cols = [], c = new THREE.Color(), SEG = 900;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG, y = TOP + (BOTTOM - TOP) * t, a = y * tw + ph;
      const rr = r + Math.sin(t * 40) * 0.6;
      pts.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
      colorAt((t + hueShift) % 1, c);
      cols.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    trails.add(new THREE.Line(g, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false,
    })));
  });

  /* ---------- neon halo rings (like the swirl above the tower) ---------- */
  const halos = [];
  [[TOP + 2, 8, '#ffc978'], [TOP + 3.5, 11, '#34e1ff'], [TOP + 1, 14, '#ff3fa4'],
   [-40, 17, '#8b5cf6'], [-85, 15, '#34e1ff'], [-120, 18, '#ff8a2b']].forEach(([y, r, col], i) => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.05, 8, 200, Math.PI * rand(1.2, 1.8)),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.position.y = y;
    m.rotation.x = Math.PI / 2 + rand(-0.25, 0.25);
    m.userData.speed = (i % 2 ? -1 : 1) * rand(0.15, 0.4);
    scene.add(m); halos.push(m);
  });

  /* ======================================================
     4. HOLOGRAPHIC UI PANELS
     ====================================================== */
  const panelTexture = (type, hue) => {
    const W = 320, H = 200, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const col = `hsla(${hue},100%,65%,`;
    g.fillStyle = col + '0.08)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = col + '0.9)'; g.lineWidth = 3; g.strokeRect(2, 2, W - 4, H - 4);
    g.fillStyle = col + '0.9)'; g.fillRect(14, 14, 70, 6); g.fillRect(14, 26, 40, 4);
    g.strokeStyle = col + '0.8)'; g.fillStyle = col + '0.75)'; g.lineWidth = 2;
    if (type === 0) { for (let i = 0; i < 9; i++) { const h = rand(20, 110); g.fillRect(18 + i * 32, H - 20 - h, 18, h); } }
    else if (type === 1) {
      g.beginPath(); for (let i = 0; i <= 12; i++) { const x = 16 + i * 24, y = H - 40 - Math.sin(i * 0.8) * 40 - i * 5; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      g.beginPath(); g.arc(W - 50, 50, 22, 0, Math.PI * 1.4); g.stroke();
    } else {
      // wireframe cube (3D modelling)
      const cx = W / 2, cy = H / 2 + 10, s = 45, o = 22;
      g.strokeRect(cx - s, cy - s + o, s * 1.5, s * 1.5); g.strokeRect(cx - s + o, cy - s, s * 1.5, s * 1.5);
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(cx - s + a * s * 1.5, cy - s + o + b * s * 1.5); g.lineTo(cx - s + o + a * s * 1.5, cy - s + b * s * 1.5); g.stroke(); });
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const panels = [];
  const panelTex = [0, 1, 2, 0, 1, 2].map((type, i) => panelTexture(type, [190, 30, 320, 200, 280, 40][i]));
  const PANEL_N = mobile ? 12 : 22;
  for (let i = 0; i < PANEL_N; i++) {
    const y = TOP - 4 - (i / PANEL_N) * (TOP - BOTTOM - 20) + rand(-3, 3);
    const a = i * 2.4 + rand(-0.3, 0.3), r = rand(15, 22);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2),
      new THREE.MeshBasicMaterial({ map: panelTex[i % panelTex.length], transparent: true, opacity: 0.65, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    m.lookAt(0, y, 0);
    m.userData = { baseY: y, phase: Math.random() * 6 };
    scene.add(m); panels.push(m);
  }

  /* ======================================================
     5. BOKEH DUST
     ====================================================== */
  const dust = (() => {
    const N = mobile ? 500 : 1100;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = rand(3, 30), a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, rand(BOTTOM - 10, TOP + 15), Math.sin(a) * r], i * 3);
      colorAt(Math.random(), c).multiplyScalar(rand(0.4, 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, pointsMat(0.55, 0.7));
    scene.add(p);
    return p;
  })();

  /* ======================================================
     6. BLACK HOLE (finale behind the contact section)
     ====================================================== */
  const bh = new THREE.Group();
  bh.position.y = BH_Y;
  scene.add(bh);

  const disk = new THREE.Group();
  disk.rotation.x = -Math.PI / 2 + 0.12;
  bh.add(disk);

  const diskMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      varying vec2 vPos;
      void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uTime; varying vec2 vPos;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float r = length(vPos);
        float inner = 3.4, outer = 16.0;
        float t = clamp((r - inner) / (outer - inner), 0.0, 1.0);
        float off = uTime * 2.2 / sqrt(r) + 5.0 / r;
        float c = cos(off), s = sin(off);
        vec2 p = mat2(c, -s, s, c) * vPos;
        float n = noise(p * 0.7) * 0.55 + noise(p * 2.1) * 0.3 + noise(p * 5.0) * 0.15;
        float rings = 0.55 + 0.45 * sin(r * 5.0 + n * 6.0);
        float fall = pow(1.0 - t, 2.4);
        float edge = smoothstep(0.0, 0.05, t);
        vec3 cool = vec3(0.55, 0.12, 0.35), warm = vec3(1.0, 0.5, 0.12), hot = vec3(1.0, 0.92, 0.72);
        vec3 col = mix(cool, warm, smoothstep(0.0, 0.6, fall));
        col = mix(col, hot, pow(fall, 3.0));
        float a = (0.15 + n * rings * 1.3) * fall * edge;
        gl_FragColor = vec4(col * 1.4, a);
      }`,
  });
  disk.add(new THREE.Mesh(new THREE.RingGeometry(3.4, 16, 160, 1), diskMat));

  // orbiting particle layers
  const diskLayers = [];
  for (let L = 0; L < 5; L++) {
    const N = mobile ? 350 : 700, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color();
    const rMin = 3.6 + L * 2.2, rMax = rMin + 2.4;
    for (let i = 0; i < N; i++) {
      const r = rand(rMin, rMax), a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, Math.sin(a) * r, rand(-0.15, 0.15)], i * 3);
      c.set(L < 2 ? '#ffe2a8' : L < 4 ? '#ff8a2b' : '#ff3fa4').multiplyScalar(rand(0.5, 1));
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, pointsMat(0.22, 0.9));
    pts.userData.speed = 1.3 / Math.sqrt(rMin);
    disk.add(pts); diskLayers.push(pts);
  }

  // event horizon + photon ring (billboarded)
  const horizon = new THREE.Mesh(new THREE.SphereGeometry(3.1, 48, 48), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bh.add(horizon);
  const photon = new THREE.Mesh(
    new THREE.TorusGeometry(3.35, 0.09, 16, 160),
    new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  bh.add(photon);
  const photonHalo = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 5.2, 96),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 v; void main(){ v = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 v; void main(){ float r = length(v); float a = exp(-(r-3.35)*2.2); gl_FragColor = vec4(vec3(1.0,0.6,0.25)*a, a*0.7); }`,
    })
  );
  bh.add(photonHalo);

  /* ======================================================
     POST-PROCESSING (bloom)
     ====================================================== */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(DPR, 1.25));
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), mobile ? 0.7 : 0.8, 0.5, 0.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ======================================================
     CAMERA FLIGHT (scroll + mouse)
     ====================================================== */
  let scrollP = 0, smoothP = 0, mouseX = 0, mouseY = 0, smx = 0, smy = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollP = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  };
  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('pointermove', (e) => {
    mouseX = e.clientX / innerWidth - 0.5;
    mouseY = e.clientY / innerHeight - 0.5;
  }, { passive: true });
  readScroll();
  smoothP = scrollP;

  const target = new THREE.Vector3();
  const ss = THREE.MathUtils.smoothstep;
  const placeCamera = (p) => {
    const end = ss(p, 0.86, 1);            // final approach to the black hole
    const wide = innerWidth > 900;
    const a = p * Math.PI * 3.2 + smx * 0.35 + 0.6;
    const dist = (wide ? 24 : 34) + end * 4;
    const y = THREE.MathUtils.lerp(TOP - 6, BOTTOM - 6, p) - end * 8.5 - smy * 2;
    camera.position.set(Math.sin(a) * dist, y, Math.cos(a) * dist);

    // shift the helix to the right of the screen on desktop (text sits on the left)
    const side = wide ? 7.5 * (1 - end) : 0;
    const rx = Math.cos(a), rz = -Math.sin(a);
    target.set(-rx * side, THREE.MathUtils.lerp(y - 3, BH_Y + 1.5, end), -rz * side);
    camera.lookAt(target);
  };

  /* ---------- resize ---------- */
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth, innerHeight);
    readScroll();
  });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  const speed = reduceMotion ? 0.15 : 1;
  const stars = scene.getObjectByName('stars');
  let first = true;

  const animate = () => {
    const dt = Math.min(clock.getDelta(), 0.05) * speed;
    const t = clock.elapsedTime * speed;

    smoothP += (scrollP - smoothP) * (reduceMotion ? 1 : 0.06);
    smx += (mouseX - smx) * 0.04;
    smy += (mouseY - smy) * 0.04;
    placeCamera(smoothP);

    helix.rotation.y += dt * 0.12;
    ribbons.rotation.y -= dt * 0.05;
    ribbonA.material.map.offset.x -= dt * 0.06;
    ribbonB.material.map.offset.x += dt * 0.04;
    trails.rotation.y += dt * 0.09;
    stars.rotation.y += dt * 0.004;
    dust.rotation.y -= dt * 0.02;
    halos.forEach((h) => { h.rotation.z += dt * h.userData.speed; });
    panels.forEach((m) => {
      m.position.y = m.userData.baseY + Math.sin(t * 0.8 + m.userData.phase) * 0.6;
      m.material.opacity = 0.45 + Math.sin(t * 1.5 + m.userData.phase) * 0.2;
    });

    diskMat.uniforms.uTime.value = t;
    diskLayers.forEach((l) => { l.rotation.z += dt * l.userData.speed; });
    photon.lookAt(camera.position);
    photonHalo.lookAt(camera.position);

    composer.render();
    if (first) { first = false; ready(); }
    requestAnimationFrame(animate);
  };
  animate();
})();
