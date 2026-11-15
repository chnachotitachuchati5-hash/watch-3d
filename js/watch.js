/**
 * Procedural luxury mechanical wristwatch built from Three.js primitives.
 * No external model files.
 */

export function createWatch(THREE) {
  const group = new THREE.Group();
  const parts = [];

  const colors = {
    steel: 0xc5ccd3,
    steelDark: 0x8c939c,
    gold: 0xd4af6a,
    goldBright: 0xf0d4a0,
    brass: 0xc4a45a,
    brassDark: 0x8a7038,
    rhodium: 0xb7bec7,
    leather: 0x3a241c,
    leatherEdge: 0x4a3226,
    navy: 0x0c1018,
    ruby: 0x8a1020,
    blued: 0x1a2a55,
    glass: 0xbcdfff,
  };

  function phys(opts) {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.25,
      envMapIntensity: 1.1,
      ...opts,
    });
  }

  // Unique material instances per part so highlights stay local.
  const mat = {
    steel: () => phys({ color: colors.steel, roughness: 0.18, clearcoat: 0.55, clearcoatRoughness: 0.18 }),
    steelSoft: () => phys({ color: colors.steelDark, roughness: 0.35, metalness: 0.9 }),
    gold: () => phys({ color: colors.gold, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.25 }),
    goldBright: () => phys({ color: colors.goldBright, roughness: 0.12, metalness: 1 }),
    brass: () => phys({ color: colors.brass, roughness: 0.32 }),
    brassDark: () => phys({ color: colors.brassDark, roughness: 0.4 }),
    rhodium: () => phys({ color: colors.rhodium, roughness: 0.28, metalness: 0.95 }),
    leather: () => phys({ color: colors.leather, metalness: 0.04, roughness: 0.72, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
    leatherEdge: () => phys({ color: colors.leatherEdge, metalness: 0.06, roughness: 0.65 }),
    ruby: () => phys({ color: colors.ruby, metalness: 0.15, roughness: 0.12, emissive: new THREE.Color(0x3a0008), emissiveIntensity: 0.35, transparent: true, opacity: 0.92 }),
    glass: () => phys({ color: 0xffffff, metalness: 0.0, roughness: 0.02, transmission: 0.0, transparent: true, opacity: 0.07, envMapIntensity: 0.9, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false }),
    glassTint: () => phys({ color: 0xcfe6ff, metalness: 0.0, roughness: 0.04, transparent: true, opacity: 0.08, depthWrite: false, envMapIntensity: 0.7 }),
    blued: () => phys({ color: colors.blued, roughness: 0.22, metalness: 0.95 }),
    black: () => phys({ color: 0x111111, metalness: 0.4, roughness: 0.4 }),
  };

  function addPart(id, nameTh, nameEn, fact, object, assembled, exploded) {
    object.name = id;
    object.userData.partId = id;
    object.position.copy(assembled);
    object.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.userData.partId = id;
      }
    });
    group.add(object);
    const rec = { id, nameTh, nameEn, fact, object, assembled: assembled.clone(), exploded: exploded.clone() };
    parts.push(rec);
    return rec;
  }

  function ringShape(inner, outer) {
    const s = new THREE.Shape();
    s.absarc(0, 0, outer, 0, Math.PI * 2, false);
    const h = new THREE.Path();
    h.absarc(0, 0, inner, 0, Math.PI * 2, true);
    s.holes.push(h);
    return s;
  }

  function extrudeRing(inner, outer, depth, bevel = 0.02, segments = 72) {
    return new THREE.ExtrudeGeometry(ringShape(inner, outer), {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: segments,
    });
  }

  function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r);
    s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h);
    s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r);
    s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }

  function makeScrew(size = 0.08, steelMat) {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(size, size, size * 0.4, 16), steelMat);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(size * 1.4, size * 0.5, size * 0.18), mat.black());
    head.rotation.x = Math.PI / 2;
    slot.rotation.x = 0;
    g.add(head);
    g.add(slot);
    return g;
  }

  function makeJewel(r = 0.055) {
    const g = new THREE.Group();
    const setting = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.03, 20), mat.gold());
    setting.rotation.x = Math.PI / 2;
    const jewel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 20), mat.ruby());
    jewel.rotation.x = Math.PI / 2;
    jewel.position.z = 0.012;
    g.add(setting, jewel);
    return g;
  }

  /* ---------------- Dial texture ---------------- */
  function makeDialTexture() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = "#0b0e14";
    ctx.fillRect(0, 0, size, size);

    // Sunburst
    const rays = 280;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const lite = i % 2 === 0 ? 0.07 : 0.03;
      const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * cx, cy + Math.sin(a) * cy);
      g.addColorStop(0, `rgba(40, 48, 62, ${0.9})`);
      g.addColorStop(0.15, `rgba(22, 28, 40, ${0.5 + lite})`);
      g.addColorStop(1, `rgba(8, 10, 16, ${0.2})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * cx, cy + Math.sin(a) * cy);
      ctx.stroke();
    }

    // Soft vignette
    const vg = ctx.createRadialGradient(cx, cy, 40, cx, cy, cx);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, size, size);

    // Minute track
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const major = i % 5 === 0;
      ctx.strokeStyle = major ? "#d4af6a" : "rgba(212,175,106,0.45)";
      ctx.lineWidth = major ? 4 : 2;
      const r0 = major ? 0.86 : 0.89;
      const r1 = 0.94;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * cx * r0, Math.sin(a) * cx * r0);
      ctx.lineTo(Math.cos(a) * cx * r1, Math.sin(a) * cx * r1);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "#e8d5a3";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 52px Kanit, sans-serif";
    ctx.fillText("NOY", cx, cy - 150);
    ctx.font = "300 28px Kanit, sans-serif";
    ctx.fillStyle = "rgba(232,213,163,0.8)";
    ctx.fillText("GENÈVE  ·  AUTOMATIC", cx, cy + 170);
    ctx.font = "300 22px Kanit, sans-serif";
    ctx.fillStyle = "rgba(232,213,163,0.55)";
    ctx.fillText("28 800 vph", cx, cy + 210);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
    return tex;
  }

  /* ---------------- Gears ---------------- */
  function gearShape(outerR, teeth, toothDepth = null) {
    const depth = toothDepth ?? outerR * 0.16;
    const innerR = outerR - depth;
    const s = new THREE.Shape();
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.28;
      const a2 = a0 + step * 0.50;
      const a3 = a0 + step * 0.72;
      const a4 = a0 + step;
      const pts = [
        [Math.cos(a0) * innerR, Math.sin(a0) * innerR],
        [Math.cos(a1) * innerR, Math.sin(a1) * innerR],
        [Math.cos(a1) * outerR, Math.sin(a1) * outerR],
        [Math.cos(a2) * outerR, Math.sin(a2) * outerR],
        [Math.cos(a3) * outerR, Math.sin(a3) * outerR],
        [Math.cos(a3) * innerR, Math.sin(a3) * innerR],
      ];
      if (i === 0) s.moveTo(pts[0][0], pts[0][1]);
      else s.lineTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) s.lineTo(pts[k][0], pts[k][1]);
    }
    s.closePath();
    return s;
  }

  function makeGear({ radius, teeth, thickness = 0.07, hole = 0.06, spokes = 0, material, rim = 0.0 }) {
    const g = new THREE.Group();
    const shape = gearShape(radius, teeth);
    if (hole > 0) {
      const h = new THREE.Path();
      h.absarc(0, 0, hole, 0, Math.PI * 2, true);
      shape.holes.push(h);
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 1,
      curveSegments: Math.max(6, teeth),
    });
    geo.center();
    const mesh = new THREE.Mesh(geo, material);
    g.add(mesh);
    if (spokes > 0) {
      const spokeMat = material;
      for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2;
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.85, 0.07, thickness * 0.8), spokeMat);
        spoke.position.set(Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32, 0);
        spoke.rotation.z = a;
        g.add(spoke);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(hole * 1.6, 0.05), Math.max(hole * 1.6, 0.05), thickness + 0.02, 16), material);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    g.userData.spin = 0;
    return g;
  }

  function spiralGeom(turns, r0, r1, tube, points = 160) {
    const pts = [];
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const a = t * turns * Math.PI * 2;
      const r = r0 + (r1 - r0) * t;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, (t - 0.5) * 0.01));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, points, tube, 5, false);
  }

  /* ===================== STRAPS ===================== */
  function makeStrap(isTop) {
    const g = new THREE.Group();
    const leather = mat.leather();
    const edge = mat.leatherEdge();
    const steelM = mat.steel();
    const length = 2.55;
    const width = 1.12;
    const thick = 0.16;
    const shape = roundedRectShape(width, length, 0.12);
    if (isTop) {
      // holes
      for (let i = 0; i < 5; i++) {
        const hole = new THREE.Path();
        hole.absarc(0, -length / 2 + 0.45 + i * 0.28, 0.055, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
    }
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: thick,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
        curveSegments: 12,
      }),
      leather
    );
    body.geometry.translate(0, 0, -thick / 2);
    g.add(body);

    // stitching
    const stitchMat = new THREE.MeshBasicMaterial({ color: 0x3a2a20 });
    const stitchCount = 18;
    for (const side of [-1, 1]) {
      for (let i = 0; i < stitchCount; i++) {
        const t = i / (stitchCount - 1);
        const y = -length / 2 + 0.1 + t * (length - 0.2);
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.01), stitchMat);
        s.position.set(side * (width / 2 - 0.1), y, thick / 2 + 0.005);
        g.add(s);
      }
    }

    if (!isTop) {
      // buckle
      const buckle = new THREE.Group();
      const frame = new THREE.Mesh(extrudeRing(0.0, 0.0, 0.06, 0, 4), steelM);
      // rounded buckle frame
      const bShape = roundedRectShape(0.85, 0.55, 0.08);
      const bHole = roundedRectShape(0.62, 0.34, 0.05);
      // rebuild hole as path
      const bs = roundedRectShape(0.85, 0.55, 0.08);
      const hp = new THREE.Path();
      const hw = 0.62, hh = 0.34, hr = 0.05;
      hp.moveTo(-hw / 2 + hr, -hh / 2);
      hp.lineTo(hw / 2 - hr, -hh / 2);
      hp.absarc(hw / 2 - hr, -hh / 2 + hr, hr, -Math.PI / 2, 0, false);
      hp.lineTo(hw / 2, hh / 2 - hr);
      hp.absarc(hw / 2 - hr, hh / 2 - hr, hr, 0, Math.PI / 2, false);
      hp.lineTo(-hw / 2 + hr, hh / 2);
      hp.absarc(-hw / 2 + hr, hh / 2 - hr, hr, Math.PI / 2, Math.PI, false);
      hp.lineTo(-hw / 2, -hh / 2 + hr);
      hp.absarc(-hw / 2 + hr, -hh / 2 + hr, hr, Math.PI, Math.PI * 1.5, false);
      bs.holes.push(hp);
      const frameMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bs, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, curveSegments: 8 }),
        steelM
      );
      frameMesh.geometry.translate(0, 0, -0.03);
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.04), steelM);
      prong.position.y = 0.08;
      buckle.add(frameMesh, prong);
      buckle.position.y = -length / 2 - 0.12;
      g.add(buckle);

      // keepers
      for (const y of [0.15, 0.45]) {
        const loop = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.12, thick + 0.08), steelM);
        loop.position.y = -length / 2 + y + 0.9;
        g.add(loop);
      }
    }

    // attach end closer to case — a slightly raised leather pad
    const pad = new THREE.Mesh(new THREE.BoxGeometry(width * 0.98, 0.28, thick + 0.02), edge);
    pad.position.y = length / 2 - 0.05;
    g.add(pad);

    // orient: top strap extends +Y, bottom -Y. Geometry is centered; shift so near end sits at lugs.
    const sign = isTop ? 1 : -1;
    g.rotation.z = isTop ? Math.PI : 0;
    // After rotation, +Y of local strap (away from case) points correctly.
    return g;
  }

  /* ===================== CASE ===================== */
  function makeCase() {
    const g = new THREE.Group();
    const steel = mat.steel();
    const steelSoft = mat.steelSoft();
    const pts = [
      new THREE.Vector2(1.50, -0.50),
      new THREE.Vector2(2.00, -0.50),
      new THREE.Vector2(2.10, -0.42),
      new THREE.Vector2(2.13, -0.18),
      new THREE.Vector2(2.15, 0.05),
      new THREE.Vector2(2.12, 0.28),
      new THREE.Vector2(2.04, 0.42),
      new THREE.Vector2(1.84, 0.42),
      new THREE.Vector2(1.78, 0.34),
      new THREE.Vector2(1.70, 0.34),
      new THREE.Vector2(1.70, -0.22),
      new THREE.Vector2(1.58, -0.22),
      new THREE.Vector2(1.50, -0.32),
      new THREE.Vector2(1.50, -0.50),
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), steel);
    body.rotation.x = Math.PI / 2;
    g.add(body);

    // mid brushed ring
    const mid = new THREE.Mesh(new THREE.TorusGeometry(2.145, 0.035, 8, 96), steelSoft);
    mid.position.z = 0.04;
    g.add(mid);

    // lugs
    for (const signY of [-1, 1]) {
      for (const signX of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.58, 0.28), steel);
        horn.position.set(signX * 0.50, signY * 2.16, 0.0);
        horn.rotation.z = signY * signX * -0.14;
        horn.scale.set(1, 1.0, 0.9);
        g.add(horn);
      }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12), steel);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, signY * 2.40, 0);
      g.add(bar);
      const capL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), steel);
      const capR = capL.clone();
      capL.position.set(-0.6, signY * 2.40, 0);
      capR.position.set(0.6, signY * 2.40, 0);
      g.add(capL, capR);
    }

    // crown tube
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.28, 20), steel);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(2.18, 0, 0.06);
    g.add(tube);

    return g;
  }

  /* ===================== BEZEL ===================== */
  function makeBezel() {
    const g = new THREE.Group();
    const gold = mat.gold();
    const goldB = mat.goldBright();
    const ring = new THREE.Mesh(extrudeRing(1.86, 2.16, 0.14, 0.016, 80), gold);
    ring.geometry.translate(0, 0, -0.07);
    g.add(ring);

    // Reeded edge: thin radial boxes on the outer rim only.
    const flutes = 96;
    for (let i = 0; i < flutes; i++) {
      const a = (i / flutes) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.048, 0.125), i % 2 === 0 ? gold : goldB);
      const r = 2.145;
      f.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.01);
      f.rotation.z = a;
      g.add(f);
    }
    const pip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), mat.goldBright());
    pip.position.set(0, 2.01, 0.09);
    g.add(pip);
    return g;
  }

  /* ===================== CRYSTAL ===================== */
  function makeCrystal() {
    const g = new THREE.Group();
    const glass = mat.glass();
    // Shallow sapphire: large sphere, small polar angle, rim radius ≈ 1.80
    const r = 8.0;
    const phi = Math.asin(1.80 / r);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 80, 32, 0, Math.PI * 2, 0, phi), glass);
    dome.rotation.x = Math.PI / 2;
    dome.position.z = -r * Math.cos(phi);
    g.add(dome);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.80, 1.80, 0.05, 64, 1, true), mat.glassTint());
    rim.rotation.x = Math.PI / 2;
    rim.position.z = 0.0;
    g.add(rim);
    return g;
  }

  /* ===================== DIAL + HANDS ===================== */
  const hands = { hour: null, minute: null, second: null };

  function makeHandShape(length, halfW, tipW) {
    const s = new THREE.Shape();
    s.moveTo(-halfW * 0.4, -0.18);
    s.lineTo(halfW * 0.4, -0.18);
    s.lineTo(halfW, 0.15);
    s.lineTo(tipW, length);
    s.lineTo(0, length + 0.08);
    s.lineTo(-tipW, length);
    s.lineTo(-halfW, 0.15);
    s.closePath();
    return s;
  }

  function makeHands() {
    const g = new THREE.Group();
    const gold = mat.gold();
    const goldB = mat.goldBright();
    const blued = mat.blued();

    const hourGeo = new THREE.ExtrudeGeometry(makeHandShape(0.95, 0.13, 0.045), {
      depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2,
    });
    hourGeo.translate(0, 0, -0.025);
    const hour = new THREE.Mesh(hourGeo, gold);
    const mercedes = new THREE.Mesh(new THREE.CircleGeometry(0.07, 20), mat.black());
    mercedes.position.set(0, 0.52, 0.03);
    hour.add(mercedes);

    const minGeo = new THREE.ExtrudeGeometry(makeHandShape(1.42, 0.10, 0.035), {
      depth: 0.045, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2,
    });
    minGeo.translate(0, 0, -0.022);
    const minute = new THREE.Mesh(minGeo, goldB);

    // seconds: slim with counterweight
    const sec = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1.72, 0.02), blued);
    shaft.position.y = 0.55;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 8), mat.gold());
    tip.position.y = 1.48;
    const cw = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), blued);
    cw.position.set(0, -0.38, 0.01);
    const cwArm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.32, 0.02), blued);
    cwArm.position.y = -0.22;
    sec.add(shaft, tip, cw, cwArm);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 24), gold);
    cap.rotation.x = Math.PI / 2;
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.07, 20), goldB);
    cap2.rotation.x = Math.PI / 2;
    cap2.position.z = 0.02;

    g.add(hour, minute, sec, cap, cap2);
    hands.hour = hour;
    hands.minute = minute;
    hands.second = sec;
    return g;
  }

  function makeDial() {
    const g = new THREE.Group();
    const tex = makeDialTexture();
    const faceMat = phys({
      map: tex,
      metalness: 0.25,
      roughness: 0.45,
      envMapIntensity: 0.5,
      color: 0xffffff,
    });
    const edgeMat = mat.black();
    const backMat = mat.black();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.78, 0.05, 80), [edgeMat, faceMat, backMat]);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);

    const gold = mat.gold();
    const goldB = mat.goldBright();
    for (let h = 1; h <= 12; h++) {
      const ang = (h / 12) * Math.PI * 2;
      const cardinal = h % 3 === 0;
      const w = cardinal ? 0.16 : 0.09;
      const len = cardinal ? 0.28 : 0.20;
      const idx = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.06), cardinal ? goldB : gold);
      const r = 1.48;
      idx.position.set(Math.sin(ang) * r, Math.cos(ang) * r, 0.05);
      idx.rotation.z = -ang;
      g.add(idx);
    }
    // inner rail
    const rail = new THREE.Mesh(new THREE.TorusGeometry(1.68, 0.012, 8, 80), gold);
    rail.position.z = 0.03;
    g.add(rail);
    return g;
  }

  /* ===================== MOVEMENT ===================== */
  function makeMovement() {
    const g = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.1, 64), mat.rhodium());
    plate.rotation.x = Math.PI / 2;
    g.add(plate);

    // decorative recesses
    const recessMat = mat.steelSoft();
    const recesses = [
      { x: 0, y: 0, r: 0.42 },
      { x: -0.7, y: 0.35, r: 0.52 },
      { x: 0.62, y: -0.28, r: 0.38 },
      { x: 0.15, y: 0.7, r: 0.28 },
      { x: -0.2, y: -0.7, r: 0.3 },
    ];
    for (const rc of recesses) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rc.r, rc.r, 0.04, 32), recessMat);
      m.rotation.x = Math.PI / 2;
      m.position.set(rc.x, rc.y, 0.04);
      g.add(m);
    }

    // perlage dots
    const perlMat = phys({ color: 0x9aa3ad, metalness: 0.95, roughness: 0.4 });
    let seed = 17;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 0.3 + rnd() * 1.15;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (x * x + y * y > 1.5 * 1.5) continue;
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), perlMat);
      d.position.set(x, y, 0.052);
      g.add(d);
    }

    // bridges
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.15, 0.08),
      mat.rhodium()
    );
    bridge.position.set(0.55, -0.15, 0.1);
    bridge.rotation.z = -0.4;
    g.add(bridge);

    // jewels at typical pivots
    const jewels = [
      [0, 0], [-0.7, 0.35], [0.35, 0.45], [0.62, -0.28], [-0.15, -0.55], [0.55, -0.55],
    ];
    for (const [x, y] of jewels) {
      const j = makeJewel(0.05);
      j.position.set(x, y, 0.07);
      g.add(j);
    }

    // screws
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const sc = makeScrew(0.06, mat.steel());
      sc.position.set(Math.cos(a) * 1.42, Math.sin(a) * 1.42, 0.07);
      g.add(sc);
    }

    return g;
  }

  /* ===================== GEARS ===================== */
  const spinning = [];

  function makeGears() {
    const g = new THREE.Group();
    const brass = mat.brass();
    const brassD = mat.brassDark();
    const steel = mat.steel();

    const center = makeGear({ radius: 0.42, teeth: 48, thickness: 0.06, hole: 0.05, material: brass });
    center.position.set(0, 0, 0.0);
    const third = makeGear({ radius: 0.28, teeth: 30, thickness: 0.055, hole: 0.04, material: brassD });
    third.position.set(0.38, 0.48, 0.05);
    const fourth = makeGear({ radius: 0.22, teeth: 24, thickness: 0.05, hole: 0.035, material: brass });
    fourth.position.set(-0.15, -0.55, 0.08);
    const escape = makeGear({ radius: 0.16, teeth: 15, thickness: 0.05, hole: 0.03, material: steel });
    escape.position.set(0.58, -0.42, 0.1);
    const ratchet = makeGear({ radius: 0.2, teeth: 20, thickness: 0.05, hole: 0.04, material: brassD });
    ratchet.position.set(-0.55, 0.15, 0.06);

    // pinions (small steel)
    const pinion = makeGear({ radius: 0.09, teeth: 8, thickness: 0.08, hole: 0.02, material: steel });
    pinion.position.set(0.38, 0.48, 0.12);

    g.add(center, third, fourth, escape, ratchet, pinion);

    spinning.push(
      { mesh: center, rate: -2 * Math.PI / 3600 },          // centre / minute: 1 rev/hour
      { mesh: third, rate: -2 * Math.PI / 60 * 0.35 },      // visible mid
      { mesh: fourth, rate: -2 * Math.PI / 60 },            // seconds
      { mesh: escape, rate: -2 * Math.PI * 2.5 },           // fast
      { mesh: ratchet, rate: -2 * Math.PI / 60 * 0.12 },
      { mesh: pinion, rate: -2 * Math.PI / 60 * 1.4 },
    );
    return g;
  }

  /* ===================== BALANCE ===================== */
  const balance = { wheel: null, spring: null };

  function makeBalance() {
    const g = new THREE.Group();
    const steel = mat.steel();
    const gold = mat.gold();
    const blued = mat.blued();

    const wheel = new THREE.Group();
    const rim = new THREE.Mesh(extrudeRing(0.32, 0.40, 0.05, 0.008, 48), steel);
    rim.geometry.translate(0, 0, -0.025);
    wheel.add(rim);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.06, 0.03), steel);
      arm.rotation.z = a;
      wheel.add(arm);
    }
    // timing screws
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 10), gold);
      sc.rotation.z = a + Math.PI / 2;
      sc.position.set(Math.cos(a) * 0.40, Math.sin(a) * 0.40, 0);
      sc.rotation.y = Math.PI / 2;
      // orient cylinder radially
      sc.rotation.set(0, 0, a);
      sc.rotateZ(a);
      sc.rotation.z = a;
      sc.rotateX(Math.PI / 2);
      wheel.add(sc);
    }
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 12), steel);
    staff.rotation.x = Math.PI / 2;
    wheel.add(staff);
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16), gold);
    roller.rotation.x = Math.PI / 2;
    roller.position.z = 0.06;
    wheel.add(roller);

    const spring = new THREE.Mesh(spiralGeom(9, 0.04, 0.30, 0.008, 220), blued);
    spring.position.z = 0.07;

    // balance cock (bridge)
    const cock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.7, 0.06), mat.rhodium());
    cock.position.set(0, 0.15, 0.14);

    g.add(wheel, spring, cock);
    const j = makeJewel(0.04);
    j.position.set(0, 0, 0.17);
    g.add(j);

    balance.wheel = wheel;
    balance.spring = spring;
    return g;
  }

  /* ===================== MAINSPRING BARREL ===================== */
  function makeBarrel() {
    const g = new THREE.Group();
    const brass = mat.brass();
    const brassD = mat.brassDark();
    const steel = mat.steel();

    const drum = new THREE.Mesh(extrudeRing(0.08, 0.48, 0.16, 0.01, 48), brass);
    drum.geometry.translate(0, 0, -0.08);
    g.add(drum);

    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.03, 48), brassD);
    lid.rotation.x = Math.PI / 2;
    lid.position.z = 0.09;
    g.add(lid);

    const spring = new THREE.Mesh(spiralGeom(6, 0.1, 0.42, 0.018, 140), mat.blued());
    spring.position.z = 0.0;
    g.add(spring);

    const arbor = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), steel);
    arbor.rotation.x = Math.PI / 2;
    g.add(arbor);

    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.04), steel);
    hook.position.set(0.4, 0, 0);
    g.add(hook);

    spinning.push({ mesh: g, rate: -2 * Math.PI / 60 * 0.04 });
    return g;
  }

  /* ===================== CROWN ===================== */
  function makeCrown() {
    const g = new THREE.Group();
    const steel = mat.steel();
    const gold = mat.gold();

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12), steel);
    stem.rotation.z = Math.PI / 2;
    stem.position.x = -0.15;
    g.add(stem);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.22, 24), gold);
    body.rotation.z = Math.PI / 2;
    body.position.x = 0.22;
    g.add(body);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 24), gold);
    cap.rotation.z = Math.PI / 2;
    cap.position.x = 0.36;
    g.add(cap);

    // flutes
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.035, 0.04), mat.goldBright());
      f.position.set(0.22, Math.cos(a) * 0.175, Math.sin(a) * 0.175);
      f.rotation.x = a;
      g.add(f);
    }
    return g;
  }

  /* ===================== CASEBACK ===================== */
  function makeCaseback() {
    const g = new THREE.Group();
    const steel = mat.steel();
    const gold = mat.gold();
    const glass = mat.glassTint();

    const ring = new THREE.Mesh(extrudeRing(1.28, 2.00, 0.12, 0.02, 72), steel);
    ring.geometry.translate(0, 0, -0.06);
    g.add(ring);

    const glassDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.04, 64), glass);
    glassDisc.rotation.x = Math.PI / 2;
    g.add(glassDisc);

    // engraved inner ring
    const inner = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.025, 8, 64), gold);
    inner.position.z = 0.05;
    g.add(inner);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const sc = makeScrew(0.07, steel);
      sc.position.set(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0.07);
      g.add(sc);
    }
    return g;
  }

  /* ---------- assemble parts with assembled / exploded poses ---------- */

  const strapTop = makeStrap(true);
  strapTop.position.set(0, 0, 0); // will be set by addPart
  addPart(
    "strapTop",
    "สายด้านบน",
    "Upper strap",
    "สายหนังสองครึ่งถูกยึดกับขายึด (lugs) ด้วยสปริงบาร์เล็ก ๆ แรงกดของสปริงทำให้สายไม่หลุด แต่ถอดออกได้เมื่อบีบปลายสปริงเข้าหากัน",
    strapTop,
    new THREE.Vector3(0, 3.62, -0.05),
    new THREE.Vector3(0, 4.85, 0.35)
  );

  const strapBottom = makeStrap(false);
  addPart(
    "strapBottom",
    "สายด้านล่าง",
    "Lower strap & buckle",
    "ด้านนี้มีตัวหัวเข็มขัดเป็นโลหะ แรงเสียดทานระหว่างเข็มขัดกับรูสายทำให้สายไม่คลายเอง — เป็นแรงเสียดทานสถิตที่เอาชนะน้ำหนักนาฬิกาได้",
    strapBottom,
    new THREE.Vector3(0, -3.62, -0.05),
    new THREE.Vector3(0, -4.85, 0.35)
  );

  addPart(
    "case",
    "ตัวเรือน",
    "Case",
    "ตัวเรือนสแตนเลสทำหน้าที่เป็นกรงนิรภัยของเครื่อง โครเมียมในโลหะสร้างชั้นออกไซด์บาง ๆ ป้องกันสนิม และผนังหนาช่วยรับแรงกระแทกไม่ให้เพลาเฟืองคดงอ",
    makeCase(),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0.35)
  );

  addPart(
    "bezel",
    "วงเบเซล",
    "Bezel",
    "เบเซลเป็นวงแหวนล็อกกระจกไว้กับตัวเรือน ลายหยักรอบวงไม่ใช่แค่สวย แต่เพิ่มพื้นที่ผิวให้บิดยึดได้แน่นขึ้นด้วยแรงมือ โดยไม่ต้องใช้เครื่องมือ",
    makeBezel(),
    new THREE.Vector3(0, 0, 0.48),
    new THREE.Vector3(0, 0, 1.55)
  );

  addPart(
    "crystal",
    "กระจกหน้าปัด",
    "Crystal",
    "กระจกนาฬิกาหรูมักเป็นแซฟไฟร์สังเคราะห์ ความแข็งประมาณ 9 ตามมาตราโมห์ส เกือบเท่าเพชร (10) เลยขีดข่วนยากมาก แสงหักเหผ่านด้วยดัชนีหักเหราว 1.76",
    makeCrystal(),
    new THREE.Vector3(0, 0, 0.62),
    new THREE.Vector3(0, 0, 2.85)
  );

  addPart(
    "dial",
    "หน้าปัด",
    "Dial",
    "หน้าปัดคือระบบพิกัดเชิงมุม วงกลม 360 องศาถูกแบ่งเป็น 12 ชั่วโมง เข็มชั่วโมงจึงกวาด 30 องศาต่อชั่วโมง หรือ 0.5 องศาต่อนาที",
    makeDial(),
    new THREE.Vector3(0, 0, 0.34),
    new THREE.Vector3(0, 0, 2.15)
  );

  addPart(
    "hands",
    "ชุดเข็ม",
    "Hands",
    "เข็มวินาทีหมุน 6 องศาต่อวินาที เข็มนาทีช้ากว่า 60 เท่า เข็มชั่วโมงช้ากว่าเข็มนาทีอีก 12 เท่า ตามอัตราทดของชุดเฟือง — เข็มชุดนี้เดินตามเวลาจริงของเครื่อง",
    makeHands(),
    new THREE.Vector3(0, 0, 0.44),
    new THREE.Vector3(0, 0, 2.50)
  );

  addPart(
    "movement",
    "แผ่นเครื่อง",
    "Movement plate",
    "แผ่นเมนเพลทเป็นโครงที่ยึดเพลาเฟืองทั้งหมดให้ขนานกัน ถ้าเพลาเอียงแค่เศษมิลลิเมตร แรงเสียดทานจะเพิ่มจนนาฬิกาเดินช้าหรือหยุด ทับทิมสีแดงคือตลับลูกปืนแร่ที่ลดแรงเสียดทานที่ปลายเพลา",
    makeMovement(),
    new THREE.Vector3(0, 0, -0.18),
    new THREE.Vector3(0, -0.15, -1.35)
  );

  addPart(
    "gears",
    "ชุดเฟือง",
    "Gear train",
    "ชุดเฟืองคือเครื่องแบ่งความเร็ว สปริงปล่อยพลังงานหมุนค่อนข้างเร็ว แต่เฟืองทดให้เหลือ 1 รอบต่อชั่วโมงที่เข็มนาที ความเร็วเชิงมุม ω เปลี่ยนตามอัตราส่วนจำนวนฟัน N₁/N₂",
    makeGears(),
    new THREE.Vector3(0, 0, -0.32),
    new THREE.Vector3(0.25, -0.35, -2.25)
  );

  addPart(
    "balance",
    "ล้อบาลานซ์",
    "Balance wheel",
    "ล้อบาลานซ์แกว่งใกล้ 4 เฮิรตซ์ (28,800 ครั้งต่อชั่วโมง) เป็นออสซิลเลเตอร์ฮาร์มอนิก คาบเวลา T ประมาณ 2π · sqrt(I/κ) โดย I คือโมเมนต์ความเฉื่อยของล้อ และ κ คือค่าคงที่ของแฮร์สปริง",
    makeBalance(),
    new THREE.Vector3(0.62, -0.32, -0.34),
    new THREE.Vector3(2.55, -1.55, -2.45)
  );

  addPart(
    "barrel",
    "ถังลาน",
    "Mainspring barrel",
    "สปริงใหญ่เก็บพลังงานศักย์ยืดหยุ่น U = ½κθ² เมื่อถูกขดด้วยเม็ดมะยม แล้วค่อยปล่อยโมเมนต์บิดผ่านเฟืองให้เครื่องเดินได้ราว 40 ชั่วโมง",
    makeBarrel(),
    new THREE.Vector3(-0.7, 0.38, -0.34),
    new THREE.Vector3(2.60, 1.70, -2.40)
  );

  addPart(
    "crown",
    "เม็ดมะยม",
    "Crown",
    "เวลาเราไขลาน เรากำลังทำงาน W = τθ ต่อสปริง แรงบิดจากนิ้วถูกส่งผ่านแกนตั้งไปหมุนถังลาน ร่องหยักรอบเม็ดมะยมเพิ่มแรงเสียดทานให้บิดได้โดยไม่ลื่น",
    makeCrown(),
    new THREE.Vector3(2.42, 0, 0.06),
    new THREE.Vector3(3.85, 0, 0.25)
  );

  addPart(
    "caseback",
    "ฝาหลัง",
    "Caseback",
    "ฝาหลังแบบนิทรรศการมีกระจกให้ดูเครื่องเดิน สกรูรอบวงต้องกดกระจกให้ทั่วถึง เพื่อไม่ให้ฝุ่นหรือความชื้นเข้าไปเพิ่มแรงเสียดทานในเครื่อง",
    makeCaseback(),
    new THREE.Vector3(0, 0, -0.58),
    new THREE.Vector3(0, 0, -3.65)
  );

  const BALANCE_HZ = 4;

  function tick(nowMs) {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    if (hands.second) hands.second.rotation.z = -s * Math.PI / 30;
    if (hands.minute) hands.minute.rotation.z = -m * Math.PI / 30;
    if (hands.hour) hands.hour.rotation.z = -h * Math.PI / 6;

    const t = nowMs / 1000;
    for (const sp of spinning) {
      sp.mesh.rotation.z = sp.rate * t;
    }

    if (balance.wheel) {
      const ang = 2.15 * Math.sin(2 * Math.PI * BALANCE_HZ * t);
      balance.wheel.rotation.z = ang;
      if (balance.spring) balance.spring.rotation.z = ang * 0.22;
    }
  }

  return { group, parts, tick, hands, balance };
}
