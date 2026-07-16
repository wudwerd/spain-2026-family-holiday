/* Spain '26: interaction, route map and custom WebGL coastline */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) window.lucide.createIcons();
  initDayNavigation();
  initPracticalNotes();
  initPackingList();
  initSharing();
  initPrinting();
  initBackToTop();
  initMap();
  initCoastScene();
});

function initDayNavigation() {
  const cards = [...document.querySelectorAll(".day-card")];
  const links = [...document.querySelectorAll(".day-links a")];

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const day = visible.target.id.replace("day-", "");
      links.forEach((link) => link.classList.toggle("active", link.dataset.day === day));
      if (window.innerWidth <= 820) {
        const activeLink = links.find((link) => link.dataset.day === day);
        const dayStrip = document.querySelector(".day-links");
        if (activeLink && dayStrip) {
          dayStrip.scrollTo({
            left: activeLink.offsetLeft - dayStrip.clientWidth / 2 + activeLink.clientWidth / 2,
            behavior: "smooth",
          });
        }
      }
    },
    { rootMargin: "-22% 0px -60% 0px", threshold: [0.05, 0.25, 0.5] },
  );

  cards.forEach((card) => observer.observe(card));
}

function initPracticalNotes() {
  document.querySelectorAll(".practical").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (!details.open || window.innerWidth >= 821) return;
      document.querySelectorAll(".practical[open]").forEach((other) => {
        if (other !== details) other.open = false;
      });
    });
  });
}

function initPackingList() {
  const boxes = [...document.querySelectorAll("[data-pack]")];
  const count = document.querySelector("#progress-count");
  const ring = document.querySelector("#progress-ring");
  const storageKey = "palafrugell-26-packing";
  let saved = [];

  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    saved = [];
  }

  boxes.forEach((box) => {
    box.checked = saved.includes(box.dataset.pack);
    box.addEventListener("change", update);
  });

  function update() {
    const checked = boxes.filter((box) => box.checked);
    count.textContent = `${checked.length}/${boxes.length}`;
    const circumference = 326.73;
    ring.style.strokeDashoffset = String(circumference * (1 - checked.length / boxes.length));
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked.map((box) => box.dataset.pack)));
    } catch {
      // The checklist still works when storage is unavailable.
    }
  }

  update();
}

function initSharing() {
  const button = document.querySelector("#share-button");
  const toast = document.querySelector("#toast");
  let timer;

  button?.addEventListener("click", async () => {
    const shareData = {
      title: "Spain ’26: Girona, Costa Brava & Priorat",
      text: "Our 13-night family route: Girona, Camping Palafrugell and Falset, 20 August to 2 September 2026.",
      url: window.location.href,
    };

    if (navigator.share && window.location.protocol.startsWith("http")) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }

    clearTimeout(timer);
    toast?.classList.add("show");
    timer = setTimeout(() => toast?.classList.remove("show"), 2200);
  });
}

function initPrinting() {
  const button = document.querySelector("#print-button");
  let openState = [];

  button?.addEventListener("click", () => {
    const notes = [...document.querySelectorAll(".practical")];
    openState = notes.map((item) => item.open);
    notes.forEach((item) => { item.open = true; });
    window.print();
  });

  window.addEventListener("afterprint", () => {
    document.querySelectorAll(".practical").forEach((item, index) => {
      item.open = openState[index] || false;
    });
  });
}

function initBackToTop() {
  const button = document.querySelector("#back-top");
  const update = () => button?.classList.toggle("visible", window.scrollY > 900);
  window.addEventListener("scroll", update, { passive: true });
  button?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  update();
}

function initMap() {
  if (!window.L || !document.querySelector("#map")) return;

  const airport = { name: "Barcelona Airport", coords: [41.2974, 2.0833], type: "airport" };
  const girona = { name: "Girona", coords: [41.9794, 2.8214], type: "stay" };
  const oldTown = { name: "Girona old town", coords: [41.9871, 2.8268] };
  const cityWalls = { name: "Girona city walls", coords: [41.9863, 2.8297] };
  const banyoles = { name: "Lake Banyoles", coords: [42.1184, 2.7603] };
  const base = { name: "Camping Palafrugell", coords: [41.895246, 3.182194], type: "base" };
  const calella = { name: "Calella de Palafrugell", coords: [41.8888, 3.1851] };
  const llafranc = { name: "Llafranc", coords: [41.8932, 3.1954] };
  const tamariu = { name: "Tamariu", coords: [41.918, 3.2076] };
  const palafrugell = { name: "Palafrugell", coords: [41.9172, 3.163] };
  const capRoig = { name: "Cap Roig Gardens", coords: [41.8768, 3.177] };
  const elGolfet = { name: "El Golfet", coords: [41.879, 3.1758] };
  const aiguablava = { name: "Aiguablava", coords: [41.9337, 3.2177] };
  const begur = { name: "Begur", coords: [41.9537, 3.2084] };
  const lighthouse = { name: "Sant Sebastià lighthouse", coords: [41.8968, 3.2027] };
  const falset = { name: "Falset", coords: [41.1458, 0.8193], type: "stay" };
  const siurana = { name: "Siurana", coords: [41.2585, 0.9329] };
  const dayRoutes = {
    1: {
      title: "Arrival in Girona",
      subtitle: "Thursday 20 August",
      description: "Barcelona Airport → Girona · about 1 hr 20 to 30 min",
      stops: [airport, girona],
    },
    2: {
      title: "Girona on foot",
      subtitle: "Friday 21 August",
      description: "Onyar → old town → city walls",
      stops: [girona, oldTown, cityWalls],
    },
    3: {
      title: "Lake Banyoles",
      subtitle: "Saturday 22 August",
      description: "Girona → designated lakeside swim · 25 to 30 min",
      stops: [girona, banyoles],
    },
    4: {
      title: "Move to the coast",
      subtitle: "Sunday 23 August",
      description: "Girona → Camping Palafrugell → Calella",
      stops: [girona, base, calella],
    },
    5: {
      title: "Calella to Llafranc",
      subtitle: "Monday 24 August",
      description: "Canadell → family coastal walk → Llafranc",
      stops: [base, calella, llafranc],
    },
    6: {
      title: "Tamariu cove",
      subtitle: "Tuesday 25 August",
      description: "Camping Palafrugell → Tamariu · 15 to 20 min",
      stops: [base, tamariu],
    },
    7: {
      title: "A local slow day",
      subtitle: "Wednesday 26 August",
      description: "Campsite downtime → Palafrugell · 10 min",
      stops: [base, palafrugell],
    },
    8: {
      title: "Cap Roig & El Golfet",
      subtitle: "Thursday 27 August",
      description: "Camping Palafrugell → gardens → cove",
      stops: [base, capRoig, elGolfet],
    },
    9: {
      title: "Begur & Aiguablava",
      subtitle: "Friday 28 August",
      description: "Camping Palafrugell → Aiguablava → Begur",
      stops: [base, aiguablava, begur],
    },
    10: {
      title: "Sant Sebastià lookout",
      subtitle: "Saturday 29 August",
      description: "Campsite → lighthouse → Llafranc",
      stops: [base, lighthouse, llafranc],
    },
    11: {
      title: "The coast to Falset",
      subtitle: "Sunday 30 August",
      description: "Camping Palafrugell → Falset · about 2 hr 45 min to 3 hr",
      stops: [base, falset],
    },
    12: {
      title: "Bigotis Del Gat",
      subtitle: "Monday 31 August",
      description: "A family day at Bigotis Del Gat, based in Falset",
      stops: [falset],
    },
    13: {
      title: "Siurana",
      subtitle: "Tuesday 1 September",
      description: "Falset → Siurana · about 35 to 40 min",
      stops: [falset, siurana],
    },
    14: {
      title: "Flight home",
      subtitle: "Wednesday 2 September",
      description: "Falset → BCN → Heathrow · flight 19:30",
      stops: [falset, airport],
    },
  };

  const map = L.map("map", {
    zoomControl: false,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView([41.62, 2.05], 8);

  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const routeLayer = L.layerGroup().addTo(map);
  const accentColors = [
    "#ef725d", "#c87b4f", "#307ba0",
    "#2b8e92", "#307ba0", "#728b5f", "#b85f6f", "#cd8f26", "#2b8e92", "#d85f3e",
    "#b37a43", "#728b5f", "#307ba0", "#d85f3e",
  ];
  const tabs = [...document.querySelectorAll("[data-map-select]")];
  const note = document.querySelector("#map-note");

  function icon(label, isBase = false) {
    return L.divIcon({
      className: "",
      html: `<div class="place-pin${isBase ? " base" : ""}"><span>${label}</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 31],
      popupAnchor: [0, -30],
    });
  }

  function addMarker(stop, label) {
    const isBase = stop.type === "base";
    L.marker(stop.coords, { icon: icon(isBase ? "⌂" : label, isBase) })
      .bindPopup(`<strong>${stop.name}</strong><span>${isBase ? "Our home base for seven nights" : "One stop on our route"}</span>`)
      .addTo(routeLayer);
  }

  function render(selection) {
    routeLayer.clearLayers();
    const bounds = [];
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mapSelect === selection));

    if (selection === "all") {
      const seen = new Set();
      Object.entries(dayRoutes).forEach(([day, route], routeIndex) => {
        const points = route.stops.map((stop) => stop.coords);
        points.forEach((point) => bounds.push(point));
        if (points.length > 1) {
          L.polyline(points, {
            color: accentColors[routeIndex],
            weight: 3,
            opacity: 0.54,
            dashArray: routeIndex % 2 ? "7 7" : undefined,
          }).addTo(routeLayer);
        }
        route.stops.forEach((stop) => {
          const key = stop.coords.join(",");
          if (seen.has(key)) return;
          seen.add(key);
          addMarker(stop, day);
        });
      });
      note.innerHTML = '<span class="map-note-number">∞</span><div><small>Full-trip view</small><strong>13 nights, three bases</strong><p>Select a day to focus the route.</p></div>';
    } else {
      const route = dayRoutes[selection];
      const points = route.stops.map((stop) => stop.coords);
      points.forEach((point) => bounds.push(point));
      if (points.length > 1) {
        L.polyline(points, { color: accentColors[Number(selection) - 1], weight: 4, opacity: 0.88, dashArray: "9 7" }).addTo(routeLayer);
      }
      route.stops.forEach((stop, index) => addMarker(stop, index === 0 ? "⌂" : String(index)));
      note.innerHTML = `<span class="map-note-number">${selection.padStart(2, "0")}</span><div><small>${route.subtitle}</small><strong>${route.title}</strong><p>${route.description}</p></div>`;
    }

    if (bounds.length) {
      if (bounds.length === 1) map.setView(bounds[0], 12);
      else map.fitBounds(bounds, { padding: [55, 55], maxZoom: selection === "all" ? 12 : 14 });
    }
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => render(tab.dataset.mapSelect)));
  render("all");
  setTimeout(() => map.invalidateSize(), 150);
}

function initCoastScene() {
  const canvas = document.querySelector("#coast-canvas");
  const toggle = document.querySelector("#motion-toggle");
  if (!canvas || !window.THREE) {
    if (toggle) toggle.hidden = true;
    return;
  }

  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a5258, 0.042);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  camera.position.set(2.8, 5.7, 11.8);
  camera.lookAt(2.5, -0.5, -3.5);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene.add(new THREE.HemisphereLight(0xbce7de, 0x9f4d33, 2.4));
  const sunlight = new THREE.DirectionalLight(0xffe7ad, 3.1);
  sunlight.position.set(-3, 10, 7);
  scene.add(sunlight);

  const waterUniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(0x07515c) },
    uShallow: { value: new THREE.Color(0x26a0a0) },
  };

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 26, 100, 80),
    new THREE.ShaderMaterial({
      uniforms: waterUniforms,
      transparent: true,
      vertexShader: `
        uniform float uTime;
        varying float vWave;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float a = sin(p.x * 0.72 + uTime * 0.8) * 0.17;
          float b = sin(p.y * 0.85 - uTime * 0.62) * 0.12;
          float c = sin((p.x + p.y) * 1.35 + uTime * 0.45) * 0.055;
          p.z += a + b + c;
          vWave = p.z;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        varying float vWave;
        varying vec2 vUv;
        void main() {
          float glow = smoothstep(-0.16, 0.28, vWave);
          vec3 color = mix(uDeep, uShallow, glow + vUv.y * 0.18);
          float glint = pow(max(0.0, sin(vUv.x * 285.0 + uTime * 2.0) * sin(vUv.y * 175.0 - uTime)), 42.0);
          color += glint * vec3(1.0, 0.92, 0.65) * 0.8;
          gl_FragColor = vec4(color, 0.92);
        }
      `,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(2.2, -1.72, -3.7);
  scene.add(water);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 5),
    new THREE.MeshStandardMaterial({ color: 0xe7bb73, roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.rotation.z = -0.15;
  sand.position.set(9.3, -1.57, -4.3);
  scene.add(sand);

  const coast = new THREE.Group();
  scene.add(coast);

  const rockMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xa94f38, roughness: 0.95, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0xcf7351, roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: 0x91513b, roughness: 0.9, flatShading: true }),
  ];

  const seeded = mulberry32(2026);
  for (let i = 0; i < 42; i += 1) {
    const size = 0.45 + seeded() * 1.35;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), rockMaterials[i % rockMaterials.length]);
    const edge = i < 30 ? 1 : -1;
    rock.position.set(
      edge > 0 ? 7.5 + seeded() * 7.5 : -9.5 + seeded() * 3,
      -1.35 + seeded() * 1.45,
      -10 + seeded() * 15,
    );
    rock.scale.set(1.25 + seeded(), 0.8 + seeded() * 1.4, 0.9 + seeded() * 0.9);
    rock.rotation.set(seeded() * 2, seeded() * 3, seeded() * 2);
    coast.add(rock);
  }

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5e3928, roughness: 1 });
  const pineMaterial = new THREE.MeshStandardMaterial({ color: 0x1d5d45, roughness: 0.95, flatShading: true });
  for (let i = 0; i < 18; i += 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.08, 0.85, 6), trunkMaterial);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.38 + seeded() * 0.18, 0.82, 7), pineMaterial);
    crown.position.y = 0.66;
    tree.add(trunk, crown);
    tree.position.set(7.2 + seeded() * 7.3, -0.35 + seeded() * 0.75, -8.5 + seeded() * 11.5);
    tree.rotation.z = (seeded() - 0.5) * 0.15;
    tree.scale.setScalar(0.8 + seeded() * 0.9);
    coast.add(tree);
  }

  const lighthouse = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf8e9cf, roughness: 0.72 });
  const red = new THREE.MeshStandardMaterial({ color: 0xd3553e, roughness: 0.75 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.7, 12), white);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 12), red);
  cap.position.y = 0.95;
  const lamp = new THREE.PointLight(0xffd875, 4, 6);
  lamp.position.y = 1.16;
  lighthouse.add(tower, cap, lamp);
  lighthouse.position.set(10.6, 0.25, -7.7);
  lighthouse.scale.setScalar(0.88);
  scene.add(lighthouse);

  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 8), new THREE.MeshStandardMaterial({ color: 0xf4dfb5, roughness: 0.65 }));
  hull.scale.set(1.7, 0.33, 0.5);
  hull.position.y = -0.06;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 8), trunkMaterial);
  mast.position.y = 0.68;
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, 1.35, 0, 0.95, 0, 0]), 3));
  sailGeometry.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeometry, new THREE.MeshStandardMaterial({ color: 0xef725d, side: THREE.DoubleSide, roughness: 0.7 }));
  sail.position.set(0.04, 0.12, 0);
  boat.add(hull, mast, sail);
  boat.position.set(3.6, -1.2, -2.2);
  boat.rotation.y = -0.42;
  scene.add(boat);

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xf3c457 }),
  );
  sun.position.set(8.5, 6.3, -15);
  scene.add(sun);

  const sparkleGeometry = new THREE.BufferGeometry();
  const sparklePositions = [];
  for (let i = 0; i < 230; i += 1) {
    sparklePositions.push(-7 + seeded() * 21, -1.4 + seeded() * 0.32, -9 + seeded() * 15);
  }
  sparkleGeometry.setAttribute("position", new THREE.Float32BufferAttribute(sparklePositions, 3));
  const sparkles = new THREE.Points(
    sparkleGeometry,
    new THREE.PointsMaterial({ color: 0xffe5a6, size: 0.04, transparent: true, opacity: 0.58, sizeAttenuation: true }),
  );
  scene.add(sparkles);

  let pointerX = 0;
  let pointerY = 0;
  let paused = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastTime = performance.now();
  let elapsed = 0;

  if (toggle) {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.lastChild.textContent = paused ? "Play the tide" : "Pause the tide";
    toggle.addEventListener("click", () => {
      paused = !paused;
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.lastChild.textContent = paused ? "Play the tide" : "Pause the tide";
      lastTime = performance.now();
    });
  }

  window.addEventListener("pointermove", (event) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    if (!paused) elapsed += delta;
    waterUniforms.uTime.value = elapsed;
    boat.position.y = -1.22 + Math.sin(elapsed * 1.35) * 0.075;
    boat.rotation.z = Math.sin(elapsed * 0.8) * 0.035;
    sparkles.material.opacity = 0.48 + Math.sin(elapsed * 1.3) * 0.14;
    camera.position.x += ((2.8 + pointerX * 0.23) - camera.position.x) * 0.025;
    camera.position.y += ((5.7 - pointerY * 0.13) - camera.position.y) * 0.025;
    camera.lookAt(2.5, -0.5, -3.5);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  requestAnimationFrame(render);
}

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
