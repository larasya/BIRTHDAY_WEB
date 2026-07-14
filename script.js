/* ==========================================================================
   SECRET BIRTHDAY QUEST — script.js
   Vanilla JS only. No frameworks.
   ========================================================================== */

(() => {
"use strict";

/* -------------------------------------------------------------------------
   0. TINY HELPERS
   ------------------------------------------------------------------------- */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const rand = (a, b) => Math.random() * (b - a) + a;
const randInt = (a, b) => Math.floor(rand(a, b + 1));

/* -------------------------------------------------------------------------
   1. HAND-DRAWN PIXEL SPRITES
   Each sprite is an array of row-strings. One character = one pixel.
   "." = transparent. Any other character maps through `palette`.
   svgFromRows() turns that map into a crisp inline SVG.
   ------------------------------------------------------------------------- */
function svgFromRows(rows, palette, pxSize = 4) {
  const cols = Math.max(...rows.map(r => r.length));
  const h = rows.length, w = cols;
  let rects = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const color = palette[ch] || "#fff";
      rects += `<rect x="${x * pxSize}" y="${y * pxSize}" width="${pxSize}" height="${pxSize}" fill="${color}"/>`;
    }
  });
  return `<svg viewBox="0 0 ${w * pxSize} ${h * pxSize}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

function mount(el, rows, palette, pxSize = 4) {
  if (!el) return;
  el.classList.add("pixel-sprite");
  el.innerHTML = svgFromRows(rows, palette, pxSize);
}

function circleRows(radius, ch = "M") {
  const rows = [];
  const d = radius * 2;
  for (let y = 0; y < d; y++) {
    let row = "";
    for (let x = 0; x < d; x++) {
      const dx = x - radius + 0.5, dy = y - radius + 0.5;
      row += (dx * dx + dy * dy <= radius * radius) ? ch : ".";
    }
    rows.push(row);
  }
  return rows;
}

const SPRITES = {
  heart: [
    "..RR....RR..",
    ".RRRR..RRRR.",
    "RRRRRRRRRRRR",
    "RRRRRRRRRRRR",
    "RRRRRRRRRRRR",
    ".RRRRRRRRRR.",
    "..RRRRRRRR..",
    "...RRRRRR...",
    "....RRRR....",
    ".....RR.....",
  ],
  star: [
    "...S...",
    "...S...",
    "..SSS..",
    "SSSSSSS",
    "..SSS..",
    "...S...",
    "...S...",
  ],
  sparkle: [
    "..S..",
    ".SSS.",
    "SSSSS",
    ".SSS.",
    "..S..",
  ],
  rose: [
    ".RR.RR.",
    "RRRRRRR",
    "RRRRRRR",
    ".RRRRR.",
    "..RRR..",
    "..GG...",
    "..GG...",
    ".GGGG..",
    "..GG...",
  ],
  tree: [
    "....T....",
    "...TTT...",
    "..TTTTT..",
    "...TTT...",
    "..TTTTT..",
    ".TTTTTTT.",
    "..TTTTT..",
    "...TTT...",
    "..TTTTT..",
    ".TTTTTTT.",
    "....K....",
    "....K....",
  ],
  candle: [
    "..F..",
    ".FFF.",
    "..F..",
    ".WWW.",
    ".WWW.",
    ".WWW.",
    ".WWW.",
    "WWWWW",
  ],
  lantern: [
    "..LL..",
    ".LLLL.",
    "LFFFFL",
    "LFFFFL",
    "LFFFFL",
    ".LLLL.",
    "..LL..",
    "..LL..",
  ],
  chestClosed: [
    "WWWWWWWWWWWW",
    "WAAAAAAAAAAW",
    "WWWWWWWWWWWW",
    "WWWWGGWWWWWW",
    "WWWWWWWWWWWW",
    "WWWWWWWWWWWW",
    "AAAAAAAAAAAA",
  ],
  chestOpen: [
    ".AAAAAAAAAA.",
    "A....F.....A",
    "WWWWWWWWWWWW",
    "WWWWWWWWWWWW",
    "WWWWGGWWWWWW",
    "WWWWWWWWWWWW",
    "AAAAAAAAAAAA",
  ],
  player: [
    "..P......P..",
    ".PHHH..HHHP.",
    ".HHHHHHHHHH.",
    ".HHKKKKKKHH.",
    ".HKKEKKEKKH.",
    ".HKBKKKKBKH.",
    "..KKKKKKKK..",
    "...KKKKKK...",
    "...DDDDDD...",
    "..DDDDDDDD..",
    ".DDDDDDDDDD.",
    ".DDDD..DDDD.",
    ".DDD....DDD.",
    "..KK....KK..",
  ],
  moon: circleRows(9, "M"),
  cloud: [
    "..CCCC......",
    ".CCCCCCCC...",
    "CCCCCCCCCCC.",
    "CCCCCCCCCCCC",
  ],
};

// Shared colour palette for every sprite above (kept inside the brief's tokens)
const PALETTE = {
  R: "var(--glow)",
  A: "var(--primary)",
  S: "var(--glow)",
  T: "var(--accent)",
  K: "#2a0f0a",
  F: "var(--glow)",
  W: "#3a2116",
  G: "#3a1210",
  L: "var(--primary)",
  M: "var(--text)",
  C: "#1c1c1c",
};

// Dedicated palette for the pixel player character (kept separate so its
// keys don't collide with other sprites' palettes above)
// H=hair  P=hair ribbon  K=skin  E=eyes  B=blush  D=dress
const PLAYER_PALETTE = { H: "var(--primary)", P: "var(--glow)", K: "#e8c9a8", E: "#050505", B: "#ff8fa3", D: "var(--accent)" };

/* -------------------------------------------------------------------------
   2. ANIMATED PIXEL NIGHT SKY (canvas, low internal resolution, scaled up
      by the browser so every star / cloud / particle reads as a crisp
      pixel — no smooth vector shapes anywhere on this layer).
   ------------------------------------------------------------------------- */
const sky = $("#sky-canvas");
const skyCtx = sky.getContext("2d");
const SKY_W = 160, SKY_H = 90;
sky.width = SKY_W;
sky.height = SKY_H;

function resizeSky() {
  sky.style.width = window.innerWidth + "px";
  sky.style.height = window.innerHeight + "px";
}
resizeSky();
window.addEventListener("resize", resizeSky);

const stars = Array.from({ length: 70 }, () => ({
  x: randInt(0, SKY_W), y: randInt(0, SKY_H * 0.7), phase: rand(0, Math.PI * 2), speed: rand(0.02, 0.06),
}));
const clouds = Array.from({ length: 4 }, (_, i) => ({
  x: randInt(0, SKY_W), y: randInt(6, 26), speed: rand(2, 5), w: randInt(14, 26), seed: i,
}));
const particles = Array.from({ length: 26 }, () => ({
  x: randInt(0, SKY_W), y: randInt(0, SKY_H), speed: rand(2, 6),
}));
let shootingStar = null;
function maybeSpawnShootingStar() {
  if (!shootingStar && Math.random() < 0.004) {
    shootingStar = { x: randInt(20, SKY_W - 20), y: randInt(4, 20), vx: rand(1.6, 2.4), vy: rand(0.7, 1.1), life: 1 };
  }
}

let lastT = 0;
function drawSky(t) {
  const dt = Math.min((t - lastT) / 16.67, 3) || 1;
  lastT = t;

  skyCtx.clearRect(0, 0, SKY_W, SKY_H);

  // deep red ambient glow near the horizon
  const grad = skyCtx.createRadialGradient(SKY_W * 0.5, SKY_H * 1.1, 4, SKY_W * 0.5, SKY_H * 1.1, SKY_H * 1.1);
  grad.addColorStop(0, "rgba(139,0,0,0.22)");
  grad.addColorStop(1, "rgba(5,5,5,0)");
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, SKY_W, SKY_H);

  // moon
  skyCtx.save();
  skyCtx.shadowColor = "#FF3B4A";
  skyCtx.shadowBlur = 8;
  skyCtx.fillStyle = "#f2ece0";
  skyCtx.beginPath();
  skyCtx.arc(SKY_W - 26, 16, 8, 0, Math.PI * 2);
  skyCtx.fill();
  skyCtx.restore();

  // stars
  stars.forEach(s => {
    s.phase += s.speed * dt;
    const b = (Math.sin(s.phase) + 1) / 2;
    skyCtx.fillStyle = `rgba(245,245,245,${0.25 + b * 0.65})`;
    skyCtx.fillRect(s.x, s.y, 1, 1);
  });

  // clouds — blocky pixel silhouettes drifting
  clouds.forEach(c => {
    c.x += c.speed * dt * 0.05;
    if (c.x > SKY_W + c.w) c.x = -c.w;
    skyCtx.fillStyle = "rgba(30,20,20,0.55)";
    const blocks = [[0,2,c.w*0.6,3],[c.w*0.15,0,c.w*0.5,3],[c.w*0.4,1,c.w*0.5,3]];
    blocks.forEach(([bx,by,bw,bh]) => skyCtx.fillRect(c.x + bx, c.y + by, bw, bh));
  });

  // drifting red dust particles
  particles.forEach(p => {
    p.y -= p.speed * dt * 0.05;
    if (p.y < 0) { p.y = SKY_H; p.x = randInt(0, SKY_W); }
    skyCtx.fillStyle = "rgba(255,59,74,0.5)";
    skyCtx.fillRect(p.x, p.y, 1, 1);
  });

  // shooting star
  maybeSpawnShootingStar();
  if (shootingStar) {
    const s = shootingStar;
    skyCtx.strokeStyle = `rgba(255,255,255,${s.life})`;
    skyCtx.lineWidth = 1;
    skyCtx.beginPath();
    skyCtx.moveTo(s.x, s.y);
    skyCtx.lineTo(s.x - s.vx * 4, s.y - s.vy * 4);
    skyCtx.stroke();
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= 0.02 * dt;
    if (s.life <= 0 || s.x > SKY_W || s.y > SKY_H) shootingStar = null;
  }

  requestAnimationFrame(drawSky);
}
requestAnimationFrame(drawSky);

/* -------------------------------------------------------------------------
   3. SCREEN MANAGEMENT
   ------------------------------------------------------------------------- */
function showScreen(id) {
  $$(".screen").forEach(s => s.classList.remove("active"));
  $(`#${id}`).classList.add("active");
}

/* -------------------------------------------------------------------------
   4. LOADING SCREEN
   ------------------------------------------------------------------------- */
const loadingFill = $("#loading-bar-fill");
const loadingPct = $("#loading-pct");
const btnStart = $("#btn-start");
let pct = 0;
const loadTimer = setInterval(() => {
  pct += randInt(4, 12);
  if (pct >= 100) {
    pct = 100;
    clearInterval(loadTimer);
    btnStart.classList.remove("hidden");
    loadingPct.textContent = "READY";
  } else {
    loadingPct.textContent = `LOADING… ${pct}%`;
  }
  loadingFill.style.width = pct + "%";
}, 160);

btnStart.addEventListener("click", () => showScreen("screen-password"));

/* -------------------------------------------------------------------------
   5. PASSWORD / PIN SCREEN
   ------------------------------------------------------------------------- */
// EDIT HERE: the correct PIN — set this to Nizar's birth year (YYYY), matches the hint on screen
const CORRECT_PIN = "0101";

const pinDots = $$(".pin-dot");
const pinMsg = $("#pin-msg");
const pinPanel = $("#screen-password .pixel-frame");
let pinValue = "";
let hintShown = 0;

function renderPinDots() {
  pinDots.forEach((d, i) => d.classList.toggle("filled", i < pinValue.length));
}

function submitPin() {
  if (pinValue === CORRECT_PIN) {
    pinMsg.textContent = "ACCESS GRANTED";
    pinMsg.style.color = "var(--glow)";
    pinPanel.classList.add("unlocking");
    setTimeout(() => {
      showScreen("screen-hero");
      $("#music-player").classList.remove("hidden");
      initHeroPetals();
    }, 650);
  } else {
    pinMsg.textContent = "INCORRECT PIN — TRY AGAIN";
    pinPanel.classList.add("shake", "flash-red");
    setTimeout(() => pinPanel.classList.remove("shake", "flash-red"), 350);
    setTimeout(() => { pinValue = ""; renderPinDots(); }, 300);
  }
}

$$(".key").forEach(btn => {
  btn.addEventListener("click", () => {
    const k = btn.dataset.key;
    if (k === "hint") {
      hintShown++;
      $("#pin-hint").classList.toggle("hidden");
      return;
    }
    if (k === "del") {
      pinValue = pinValue.slice(0, -1);
      renderPinDots();
      return;
    }
    if (pinValue.length >= 4) return;
    pinValue += k;
    renderPinDots();
    if (pinValue.length === 4) setTimeout(submitPin, 200);
  });
});

// physical keyboard support
window.addEventListener("keydown", (e) => {
  if (!$("#screen-password").classList.contains("active")) return;
  if (/^[0-9]$/.test(e.key) && pinValue.length < 4) { pinValue += e.key; renderPinDots(); if (pinValue.length === 4) setTimeout(submitPin, 200); }
  if (e.key === "Backspace") { pinValue = pinValue.slice(0, -1); renderPinDots(); }
});

/* -------------------------------------------------------------------------
   6. HERO SCREEN
   ------------------------------------------------------------------------- */
function initHeroPetals() {
  const wrap = $("#hero-petals");
  mount($("#hero-player"), SPRITES.player, PLAYER_PALETTE, 4);
  if (wrap.dataset.built) return;
  wrap.dataset.built = "1";
  for (let i = 0; i < 22; i++) {
    const p = document.createElement("div");
    p.className = "petal";
    p.style.left = rand(0, 100) + "%";
    p.style.animationDuration = rand(6, 14) + "s";
    p.style.animationDelay = rand(0, 10) + "s";
    wrap.appendChild(p);
  }
}

// build a small pixel castle skyline out of hand-drawn "building" rows
function buildCastle() {
  const el = $(".hero-castle");
  const towers = [
    { h: 10, w: 8, x: "6%" }, { h: 16, w: 10, x: "20%" }, { h: 22, w: 12, x: "38%" },
    { h: 15, w: 9, x: "58%" }, { h: 18, w: 10, x: "74%" }, { h: 11, w: 8, x: "90%" },
  ];
  towers.forEach(t => {
    const rows = [];
    rows.push("." + "T".repeat(Math.max(1, t.w - 4)) + ".");
    for (let r = 0; r < t.h; r++) {
      let row = "T".repeat(t.w);
      if (r % 4 === 2) {
        const mid = Math.floor(t.w / 2);
        row = row.substring(0, mid - 1) + "ww" + row.substring(mid + 1);
      }
      rows.push(row);
    }
    const div = document.createElement("div");
    div.className = "pixel-sprite";
    div.style.position = "absolute";
    div.style.bottom = "0";
    div.style.left = t.x;
    div.style.width = (t.w * 6) + "px";
    div.style.height = ((t.h + 1) * 6) + "px";
    div.innerHTML = svgFromRows(rows, { T: "#0d0d0d", w: "var(--glow)" }, 6);
    el.appendChild(div);
  });
}
buildCastle();

$("#btn-journey").addEventListener("click", () => {
  showScreen("game");
  $("#hud").classList.remove("hidden");
  $("#music-player").classList.remove("hidden");
  goToLevel(1);
  tryPlayMusic();
});

/* -------------------------------------------------------------------------
   7. LEVEL / HUD ENGINE
   ------------------------------------------------------------------------- */
const TOTAL_LEVELS = 6;
let currentLevel = 1;

const levelDotsWrap = $("#level-dots");
for (let i = 1; i <= TOTAL_LEVELS; i++) {
  const d = document.createElement("span");
  d.className = "level-dot";
  d.dataset.level = i;
  levelDotsWrap.appendChild(d);
}

function updateHUD() {
  $("#hud-level-num").textContent = String(currentLevel).padStart(2, "0");
  const hpBar = $("#hp-bar");
  hpBar.innerHTML = "";
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const b = document.createElement("div");
    b.className = "hp-block" + (i <= currentLevel ? "" : " empty");
    hpBar.appendChild(b);
  }
  $$(".level-dot").forEach(d => {
    const lv = Number(d.dataset.level);
    d.classList.toggle("active", lv === currentLevel);
    d.classList.toggle("done", lv < currentLevel);
  });
  $("#btn-prev").disabled = currentLevel === 1;
  $("#btn-next").textContent = currentLevel === TOTAL_LEVELS ? "FINISH ▸" : "NEXT ▸";
}

function goToLevel(n) {
  currentLevel = Math.max(1, Math.min(TOTAL_LEVELS, n));
  $$(".level").forEach(l => l.classList.toggle("active", Number(l.dataset.level) === currentLevel));
  updateHUD();
  runLevelEnterEffects(currentLevel);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("#btn-next").addEventListener("click", () => {
  if (currentLevel === TOTAL_LEVELS) {
    goToFinal();
  } else {
    goToLevel(currentLevel + 1);
  }
});
$("#btn-prev").addEventListener("click", () => goToLevel(currentLevel - 1));

/* -------------------------------------------------------------------------
   8. TYPING ANIMATION for dialogue / letters
   ------------------------------------------------------------------------- */
function typeInto(el, speed = 22) {
  if (!el || el.dataset.typed) return;
  const full = el.dataset.typing || el.textContent;
  el.textContent = "";
  el.classList.add("type-cursor");
  el.dataset.typed = "1";
  let i = 0;
  const step = () => {
    el.textContent = full.slice(0, i);
    i++;
    if (i <= full.length) {
      setTimeout(step, speed);
    } else {
      el.classList.remove("type-cursor");
    }
  };
  step();
}

function runLevelEnterEffects(n) {
  if (n === 1 || n === 2) {
    const el = $(`.level[data-level="${n}"] .dialogue-text`);
    typeInto(el);
  }
  if (n === 3) buildTraitCard();
  if (n === 6) resetBoss();
}

$$(".pixel-heart-small").forEach(el => mount(el, SPRITES.player, PLAYER_PALETTE, 5));

/* -------------------------------------------------------------------------
   9. LEVEL 03 — TRAIT CARDS (kenapa kamu spesial)
   ------------------------------------------------------------------------- */
// EDIT HERE: enam kartu "kenapa kamu spesial"
const TRAITS = [
  { icon: "heart",   title: "KEBAIKANMU",   desc: "Sifat yang gapernah ilang walau lagi susah sekalipun." },
  { icon: "candle",  title: "KESABARANMU",  desc: "Buff yang bikin aku tenang walau lagi jadi final boss keras kepala." },
  { icon: "star",    title: "SENYUMMU",     desc: "Item langka. Sekali liat, capeknya ilang semua." },
  { icon: "lantern", title: "DUKUNGANMU",   desc: "Checkpoint tempat aku selalu respawn tiap kali capek sama hidup." },
  { icon: "rose",    title: "HATIMU",       desc: "Level paling indah yang pernah dibuat." },
  { icon: "sparkle", title: "TAWAMU",       desc: "Sound effect favoritku, ngalahin soundtrack manapun." },
];
let traitIndex = 0;
function buildTraitCard() {
  const t = TRAITS[traitIndex % TRAITS.length];
  $("#trait-index").textContent = `${String((traitIndex % TRAITS.length) + 1).padStart(2, "0")} / ${TRAITS.length}`;
  $("#trait-title").textContent = t.title;
  $("#trait-desc").textContent = t.desc;
  mount($("#trait-icon"), SPRITES[t.icon], PALETTE, 4);
  const card = $("#trait-card");
  card.style.animation = "none"; void card.offsetWidth; card.style.animation = "";
}
$("#btn-next-card").addEventListener("click", () => { traitIndex++; buildTraitCard(); });

/* -------------------------------------------------------------------------
   10. LEVEL 04 — CHEST / SECRET LETTER
   ------------------------------------------------------------------------- */
mount($("#chest-sprite"), SPRITES.chestClosed, PALETTE, 8);
$("#chest-btn").addEventListener("click", () => {
  const sprite = $("#chest-sprite");
  sprite.classList.remove("chest-closed");
  sprite.classList.add("chest-open");
  mount(sprite, SPRITES.chestOpen, PALETTE, 8);
  $("#letter-paper").classList.remove("hidden");
  typeInto($(".letter-paper .letter-text"), 16);
  $("#chest-btn").querySelector(".mono-label").textContent = "OPENED";
  $("#chest-btn").disabled = true;
});

/* -------------------------------------------------------------------------
   11. LEVEL 06 — FINAL BOSS (giant pixel heart)
   ------------------------------------------------------------------------- */
mount($("#boss-heart"), SPRITES.heart, { R: "var(--glow)" }, 12);
const BOSS_HITS_NEEDED = 12;
let bossHits = 0;
function resetBoss() {
  bossHits = 0;
  $("#boss-hp-fill").style.width = "100%";
  $("#boss-counter").textContent = `TAP THE HEART · 0 / ${BOSS_HITS_NEEDED}`;
}
$("#boss-heart").addEventListener("click", function () {
  if (bossHits >= BOSS_HITS_NEEDED) return;
  bossHits++;
  this.classList.remove("hit"); void this.offsetWidth; this.classList.add("hit");
  const pctLeft = Math.max(0, 100 - (bossHits / BOSS_HITS_NEEDED) * 100);
  $("#boss-hp-fill").style.width = pctLeft + "%";
  $("#boss-counter").textContent = `TAP THE HEART · ${bossHits} / ${BOSS_HITS_NEEDED}`;
  if (bossHits >= BOSS_HITS_NEEDED) {
    setTimeout(goToFinal, 500);
  }
});

/* -------------------------------------------------------------------------
   12. FINAL SCENE — mission complete + confetti/fireworks + easter egg
   ------------------------------------------------------------------------- */
function goToFinal() {
  showScreen("screen-final");
  $("#hud").classList.add("hidden");
  launchCelebration();
}

$("#btn-replay").addEventListener("click", () => {
  goToLevel(1);
  showScreen("game");
  $("#hud").classList.remove("hidden");
  bossHits = 0;
  resetBoss();
  easterEggClicks = 0;
});

// Easter egg: tap the glowing heart above the replay button 10 times
let easterEggClicks = 0;
function initEasterEgg() {
  let btn = $("#final-heart-btn");
  if (!btn) {
    btn = $(".final-heart-glow");
    btn.id = "final-heart-btn";
    btn.style.cursor = "pointer";
    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
  }
  btn.addEventListener("click", () => {
    easterEggClicks++;
    btn.style.transform = "scale(1.2)";
    setTimeout(() => (btn.style.transform = ""), 120);
    if (easterEggClicks >= 10) {
      easterEggClicks = 0;
      $("#screen-secret").classList.remove("hidden");
      typeInto($("#screen-secret .letter-text"), 18);
    }
  });
}
initEasterEgg();

$("#btn-close-secret").addEventListener("click", () => $("#screen-secret").classList.add("hidden"));

// Pixelated confetti + firework particle system
const fxCanvas = $("#fx-canvas");
const fxCtx = fxCanvas.getContext("2d");
let fxParticles = [];
function resizeFx() {
  fxCanvas.width = fxCanvas.clientWidth;
  fxCanvas.height = fxCanvas.clientHeight;
}
window.addEventListener("resize", resizeFx);

function launchCelebration() {
  resizeFx();
  fxParticles = [];
  const colors = ["#FF3B4A", "#B11226", "#8B0000", "#F5F5F5"];
  // confetti
  for (let i = 0; i < 90; i++) {
    fxParticles.push({
      type: "confetti",
      x: rand(0, fxCanvas.width), y: rand(-fxCanvas.height, 0),
      vx: rand(-0.6, 0.6), vy: rand(1.2, 2.6),
      size: randInt(3, 6), color: colors[randInt(0, colors.length - 1)],
      life: 400,
    });
  }
  // a few firework bursts staggered over time
  for (let i = 0; i < 4; i++) {
    setTimeout(() => spawnFirework(), i * 700);
  }
  if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
}
function spawnFirework() {
  const cx = rand(fxCanvas.width * 0.2, fxCanvas.width * 0.8);
  const cy = rand(fxCanvas.height * 0.15, fxCanvas.height * 0.45);
  const colors = ["#FF3B4A", "#B11226", "#F5F5F5"];
  const count = 26;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = rand(1.2, 2.8);
    fxParticles.push({
      type: "spark",
      x: cx, y: cy,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 3, color: colors[randInt(0, colors.length - 1)],
      life: 60,
    });
  }
}
let fxRunning = false;
function fxLoop() {
  if (!$("#screen-final").classList.contains("active")) { fxRunning = false; return; }
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  fxParticles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.type === "confetti") { p.vy += 0.01; p.life--; }
    if (p.type === "spark") { p.vy += 0.03; p.life--; }
    fxCtx.fillStyle = p.color;
    fxCtx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
  });
  fxParticles = fxParticles.filter(p => p.life > 0 && p.y < fxCanvas.height + 20);
  if (Math.random() < 0.01 && fxParticles.length < 220) spawnFirework();
  requestAnimationFrame(fxLoop);
}

/* -------------------------------------------------------------------------
   13. MUSIC PLAYER
   ------------------------------------------------------------------------- */
const audio = $("#bg-audio");
const musicToggle = $("#music-toggle");
const musicPlayer = $("#music-player");
const musicVolume = $("#music-volume");
audio.volume = Number(musicVolume.value) / 100;

function tryPlayMusic() {
  audio.play().then(() => {
    musicPlayer.classList.remove("paused");
    musicToggle.textContent = "❚❚";
  }).catch(() => {
    // Autoplay blocked or no source provided yet — that's fine, stays paused
    musicPlayer.classList.add("paused");
    musicToggle.textContent = "▶";
  });
}

musicToggle.addEventListener("click", () => {
  if (audio.paused) {
    tryPlayMusic();
  } else {
    audio.pause();
    musicPlayer.classList.add("paused");
    musicToggle.textContent = "▶";
  }
});
musicVolume.addEventListener("input", () => { audio.volume = Number(musicVolume.value) / 100; });
musicPlayer.classList.add("paused");

/* -------------------------------------------------------------------------
   14. INIT
   ------------------------------------------------------------------------- */
updateHUD();

})();