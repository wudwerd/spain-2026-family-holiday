const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initReveal() {
  const items = [...document.querySelectorAll(".reveal")];
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
  );

  items.forEach((item) => observer.observe(item));
}

function initDateRail() {
  const links = [...document.querySelectorAll(".date-links a")];
  const days = [...document.querySelectorAll("[data-map-day]")];
  if (!links.length || !days.length) return;

  const setActive = (day) => {
    const next = links.find((link) => link.dataset.day === day);
    links.forEach((link) => link.classList.toggle("active", link === next));
    if (next) next.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "nearest", inline: "center" });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.dataset.mapDay);
    },
    { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.12, 0.3] }
  );

  days.forEach((day) => observer.observe(day));
}

function initFieldNotes() {
  document.querySelectorAll(".field-notes").forEach((notes) => {
    notes.addEventListener("toggle", () => {
      if (!notes.open) return;
      const entry = notes.closest(".day-entry");
      entry?.querySelectorAll(".field-notes[open]").forEach((other) => {
        if (other !== notes) other.open = false;
      });
    });
  });
}

function initBeachIndex() {
  const rows = [...document.querySelectorAll(".beach-row")];
  const preview = document.querySelector("#beach-preview");
  const caption = document.querySelector("#beach-caption");
  if (!rows.length || !preview || !caption) return;

  let current = rows[0];
  const select = (row) => {
    if (!row || row === current) return;
    current = row;
    rows.forEach((item) => item.classList.toggle("active", item === row));

    const loader = new Image();
    loader.src = row.dataset.image;
    preview.classList.add("changing");
    loader.onload = () => {
      preview.src = row.dataset.image;
      preview.alt = row.dataset.alt;
      caption.textContent = row.dataset.caption;
      requestAnimationFrame(() => preview.classList.remove("changing"));
    };
  };

  rows.forEach((row) => {
    row.addEventListener("pointerenter", () => select(row));
    row.addEventListener("focus", () => select(row));
    row.addEventListener("click", () => select(row));
  });
}

function initPacking() {
  const storageKey = "catalonia-2026-packing";
  const boxes = [...document.querySelectorAll("[data-pack]")];
  const bar = document.querySelector("#packing-bar");
  const count = document.querySelector("#packing-count");
  if (!boxes.length || !bar || !count) return;

  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    saved = [];
  }

  boxes.forEach((box) => {
    box.checked = saved.includes(box.dataset.pack);
  });

  const update = () => {
    const checked = boxes.filter((box) => box.checked);
    bar.style.width = `${(checked.length / boxes.length) * 100}%`;
    count.textContent = `${checked.length} of ${boxes.length} packed`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked.map((box) => box.dataset.pack)));
    } catch {
      return;
    }
  };

  boxes.forEach((box) => box.addEventListener("change", update));
  update();
}

function initShareAndUtilities() {
  const shareButtons = [document.querySelector("#share-button"), document.querySelector("#footer-share")].filter(Boolean);
  const toast = document.querySelector("#toast");
  let toastTimer;

  const showToast = () => {
    if (!toast) return;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  };

  const share = async () => {
    const data = {
      title: "Our Catalonia 2026 family itinerary",
      text: "Girona, Camping Palafrugell and Falset, 20 August to 2 September 2026",
      url: window.location.origin + window.location.pathname,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        showToast();
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(data.url);
          showToast();
        } catch {
          return;
        }
      }
    }
  };

  shareButtons.forEach((button) => button.addEventListener("click", share));
  document.querySelector("#print-button")?.addEventListener("click", () => window.print());

  const backTop = document.querySelector("#back-top");
  if (backTop) {
    const updateBackTop = () => backTop.classList.toggle("show", window.scrollY > window.innerHeight * 1.2);
    window.addEventListener("scroll", updateBackTop, { passive: true });
    backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" }));
    updateBackTop();
  }
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
  const castell = { name: "Platja de Castell", coords: [41.858, 3.152] };
  const aiguablava = { name: "Aiguablava", coords: [41.9337, 3.2177] };
  const begur = { name: "Begur", coords: [41.9537, 3.2084] };
  const saRiera = { name: "Sa Riera", coords: [41.9701, 3.2107] };
  const falset = { name: "Falset", coords: [41.1458, 0.8193], type: "stay" };
  const siurana = { name: "Siurana", coords: [41.2585, 0.9329] };

  const routes = {
    1: { label: "20 August", title: "Barcelona Airport to Girona", stops: [airport, girona] },
    2: { label: "21 August", title: "Girona on foot", stops: [girona, oldTown, cityWalls] },
    3: { label: "22 August", title: "Girona to Lake Banyoles", stops: [girona, banyoles] },
    4: { label: "23 August", title: "Girona to Camping Palafrugell and Calella", stops: [girona, base, calella] },
    5: { label: "24 August", title: "Calella and Llafranc", stops: [base, calella, llafranc] },
    6: { label: "25 August", title: "Tamariu", stops: [base, tamariu] },
    7: { label: "26 August", title: "Palafrugell slow day", stops: [base, palafrugell] },
    8: { label: "27 August", title: "Cap Roig and Platja de Castell", stops: [base, capRoig, castell] },
    9: { label: "28 August", title: "Aiguablava and Begur", stops: [base, aiguablava, begur] },
    10: { label: "29 August", title: "Sa Riera", stops: [base, saRiera] },
    11: { label: "30 August", title: "Camping Palafrugell to Falset", stops: [base, falset] },
    12: { label: "31 August", title: "Bigotis Del Gat", stops: [falset] },
    13: { label: "1 September", title: "Falset to Siurana", stops: [falset, siurana] },
    14: { label: "2 September", title: "Falset to Barcelona Airport", stops: [falset, airport] },
  };

  const map = L.map("map", { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
  L.control.zoom({ position: "bottomright" }).addTo(map);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);
  const controls = [...document.querySelectorAll("[data-map-select]")];
  const note = document.querySelector("#map-note");
  const colours = ["#c85f43", "#e1b660", "#2b7274", "#8c6c50"];

  const markerIcon = (label, type) =>
    L.divIcon({
      className: "",
      html: `<span class="place-pin ${type === "base" ? "base" : ""}">${label}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });

  const addMarker = (stop, label) =>
    L.marker(stop.coords, { icon: markerIcon(label, stop.type) })
      .bindPopup(`<strong>${stop.name}</strong>`)
      .addTo(layer);

  const render = (selection) => {
    layer.clearLayers();
    controls.forEach((button) => button.classList.toggle("active", button.dataset.mapSelect === selection));
    const bounds = [];

    if (selection === "all") {
      Object.entries(routes).forEach(([day, route], index) => {
        const points = route.stops.map((stop) => stop.coords);
        points.forEach((point) => bounds.push(point));
        if (points.length > 1) {
          L.polyline(points, { color: colours[index % colours.length], weight: 2, opacity: 0.72, dashArray: index > 9 ? "5 7" : null }).addTo(layer);
        }
        route.stops.forEach((stop, stopIndex) => {
          if (stopIndex === 0 && Number(day) > 1 && stop.name !== "Falset") return;
          addMarker(stop, day);
        });
      });
      if (note) note.innerHTML = "<span>Full route</span><strong>Barcelona / Girona / Palafrugell / Falset</strong>";
    } else {
      const route = routes[selection];
      if (!route) return;
      const points = route.stops.map((stop) => stop.coords);
      points.forEach((point) => bounds.push(point));
      if (points.length > 1) L.polyline(points, { color: "#c85f43", weight: 3, opacity: 0.9 }).addTo(layer);
      route.stops.forEach((stop, index) => addMarker(stop, index + 1));
      if (note) note.innerHTML = `<span>${route.label}</span><strong>${route.title}</strong>`;
    }

    if (bounds.length === 1) map.setView(bounds[0], 12);
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [55, 55], maxZoom: selection === "all" ? 9 : 13 });
  };

  controls.forEach((button) => button.addEventListener("click", () => render(button.dataset.mapSelect)));
  render("all");
  setTimeout(() => map.invalidateSize(), 150);
}

function initWaterScene() {
  const canvas = document.querySelector("#coast-canvas");
  const hero = document.querySelector(".hero");
  const toggle = document.querySelector("#motion-toggle");
  if (!canvas || !hero || !window.THREE) return;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x17484c);
  scene.fog = new THREE.FogExp2(0x17484c, 0.035);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 70);
  camera.position.set(0, 4.8, 10.5);
  camera.lookAt(0, -0.2, -6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.outputEncoding = THREE.sRGBEncoding;

  const geometry = new THREE.PlaneGeometry(38, 30, window.innerWidth < 700 ? 80 : 150, window.innerWidth < 700 ? 60 : 110);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0b5960) },
      uLight: { value: new THREE.Color(0x2d8e91) },
      uSun: { value: new THREE.Color(0xf3d08a) },
    },
    vertexShader: `
      uniform float uTime;
      varying float vElevation;
      varying vec2 vUv;
      void main() {
        vec3 p = position;
        float waveA = sin(p.x * 0.52 + uTime * 0.72) * 0.20;
        float waveB = sin(p.z * 0.42 - uTime * 0.48) * 0.15;
        float waveC = sin((p.x + p.z) * 1.18 + uTime * 0.9) * 0.045;
        p.y += waveA + waveB + waveC;
        vElevation = p.y;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uLight;
      uniform vec3 uSun;
      varying float vElevation;
      varying vec2 vUv;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      void main() {
        float level = smoothstep(-0.35, 0.38, vElevation);
        vec3 colour = mix(uDeep, uLight, level);
        float horizon = smoothstep(0.14, 0.82, vUv.y);
        colour = mix(colour, uLight * 0.68, horizon * 0.32);
        vec2 cells = floor(vUv * vec2(180.0, 120.0));
        float star = step(0.987, hash(cells + floor(uTime * 0.7)));
        float glintPath = 1.0 - smoothstep(0.02, 0.20, abs(vUv.x - 0.72));
        float glint = star * glintPath * smoothstep(0.18, 0.92, vUv.y);
        colour = mix(colour, uSun, glint * 0.82);
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });

  const water = new THREE.Mesh(geometry, material);
  water.position.set(3.2, -1.55, -7);
  scene.add(water);

  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xe7b765, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.35, 72), sunMaterial);
  sun.position.set(6.8, 2.7, -11);
  scene.add(sun);

  const mastMaterial = new THREE.MeshBasicMaterial({ color: 0xf8f1df });
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(0.12, 1.55);
  sailShape.lineTo(1.0, 0.2);
  sailShape.lineTo(0, 0);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), mastMaterial);
  sail.position.set(4.7, -0.36, -4.8);
  sail.rotation.y = -0.22;
  scene.add(sail);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.8, 8), mastMaterial);
  mast.position.set(4.7, 0.42, -4.8);
  scene.add(mast);

  let paused = false;
  let pointerX = 0;
  let pointerY = 0;
  const clock = new THREE.Clock();

  const resize = () => {
    const width = hero.clientWidth;
    const height = hero.clientHeight;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.35 : 1.75));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  hero.addEventListener("pointermove", (event) => {
    const rect = hero.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });

  toggle?.addEventListener("click", () => {
    paused = !paused;
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.lastChild.textContent = paused ? " Play water" : " Pause water";
  });

  const draw = () => {
    const elapsed = clock.getElapsedTime();
    if (!paused && !reduceMotion.matches) material.uniforms.uTime.value = elapsed;
    camera.position.x += (pointerX * 0.45 - camera.position.x) * 0.025;
    camera.position.y += (4.8 - pointerY * 0.15 - camera.position.y) * 0.025;
    camera.lookAt(0, -0.25, -6);
    sun.quaternion.copy(camera.quaternion);
    sail.position.y = -0.36 + Math.sin(elapsed * 0.72) * 0.045;
    mast.position.y = 0.42 + Math.sin(elapsed * 0.72) * 0.045;
    renderer.render(scene, camera);
    requestAnimationFrame(draw);
  };

  window.addEventListener("resize", resize, { passive: true });
  resize();
  draw();
}

initReveal();
initDateRail();
initFieldNotes();
initBeachIndex();
initPacking();
initShareAndUtilities();
initMap();
initWaterScene();
