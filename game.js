
"use strict";

const $ = s => document.querySelector(s);
const canvas = $("#game");
const ctx = canvas.getContext("2d", { alpha: false });

const ui = {
  mainMenu: $("#mainMenu"),
  aiModeBtn: $("#aiModeBtn"),
  onlineModeBtn: $("#onlineModeBtn"),
  settingsBtn: $("#settingsBtn"),
  settingsPanel: $("#settingsPanel"),
  settingsClose: $("#settingsClose"),
  onlineState: $("#onlineState"),
  sensitivity: $("#sensitivity"),
  hudScale: $("#hudScale"),
  weaponHud: $("#topWeaponHud"),
  statusHud: $("#statusHud"),
  crosshair: $("#crosshair"),
  touchControls: $("#touchControls"),
  hud: $("#statusHud"),
  killFeed: $("#killFeed"),
  toast: $("#toast"),
  fire: $("#fireBtn"),
  reload: $("#reloadBtn"),
  aim: $("#aimBtn"),
  esp: $("#espBtn"),
  menu: $("#menuBtn")
};

const scoreText = $("#scoreText");
const roundText = $("#roundText");
const healthText = $("#healthText");
const ammoText = $("#ammoText");
const cheatText = $("#cheatText");
const kdText = $("#kdText");

const S = 64;
const FOV = Math.PI / 3;
const TAU = Math.PI * 2;

const MAP = [
  "####################",
  "#..................#",
  "#..##..............#",
  "#..##......###.....#",
  "#..........###.....#",
  "#..................#",
  "#......###.........#",
  "#......###....##...#",
  "#.............##...#",
  "#..###.............#",
  "#..###......###....#",
  "#...........###....#",
  "#..................#",
  "#......##..........#",
  "#......##....###...#",
  "#............###...#",
  "#..................#",
  "####################"
];

const WEAPONS = [
  { name: "AR", damage: 22, rate: 7.2, mag: 30, range: 720 },
  { name: "PISTOL", damage: 38, rate: 3.0, mag: 12, range: 610 },
  { name: "KNIFE", damage: 65, rate: 1.7, mag: 999, range: 78 }
];

const player = {
  x: 2.5 * S, y: 2.5 * S, a: 0.1,
  hp: 100, team: 0, weapon: 0,
  ammo: [30, 12, 999],
  nextShot: 0, kills: 0, deaths: 0
};

const blueSpawns = [[3,3], [4,4]];
const redSpawns = [[16,14], [15,15], [17,14]];

function makeBot(q, team, name) {
  return {
    x: q[0] * S, y: q[1] * S,
    a: 0, hp: 100, team, name,
    nextShot: 0, respawning: false
  };
}

const bots = [
  ...blueSpawns.map((q, i) => makeBot(q, 0, `BLUE-${i + 2}`)),
  ...redSpawns.map((q, i) => makeBot(q, 1, `RED-${i + 1}`))
];

let mode = "menu";
let gameTime = 0;
let lastFrame = performance.now();
let firing = false;
let aimbot = false;
let esp = false;
let scoreBlue = 0;
let scoreRed = 0;
let round = 1;
let sensitivity = 1;
let syncTimer = 0;

const keys = {};
const moveJoy = { x: 0, y: 0 };
const lookJoy = { x: 0, y: 0 };

function resize() {
  canvas.width = Math.max(1, innerWidth * devicePixelRatio);
  canvas.height = Math.max(1, innerHeight * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
addEventListener("resize", resize, { passive: true });
resize();

function toast(text, ms = 1800) {
  ui.toast.textContent = text;
  ui.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.remove("show"), ms);
}

function setGameVisible(active) {
  ui.weaponHud.classList.toggle("hidden", !active);
  ui.statusHud.classList.toggle("hidden", !active);
  ui.crosshair.classList.toggle("hidden", !active);
  ui.touchControls.classList.toggle("hidden", !(active && PLATFORM.touch));
}

function startAIMode() {
  mode = "ai";
  ui.mainMenu.classList.add("hidden");
  setGameVisible(true);
  resetMatch();
  toast("AI 3v3 시작");
}

async function startOnlineMode() {
  if (!CHEAT_ARENA_CONFIG.SERVER_URL) {
    toast("Render 서버 주소가 아직 설정되지 않았음");
    return;
  }

  ui.onlineModeBtn.disabled = true;
  ui.onlineState.textContent = "온라인 서버: 연결 중...";

  try {
    await ArenaNet.connect();
    mode = "online";
    ui.mainMenu.classList.add("hidden");
    setGameVisible(true);
    ui.onlineState.textContent = "온라인 서버: 연결됨";
    toast("서버 연결 성공");
    ArenaNet.send("queue_join", { mode: "3v3" });
  } catch (err) {
    console.error(err);
    ui.onlineState.textContent = "온라인 서버: 연결 실패";
    toast("서버 연결 실패");
  } finally {
    ui.onlineModeBtn.disabled = false;
  }
}

function resetMatch() {
  scoreBlue = 0;
  scoreRed = 0;
  round = 1;
  player.kills = 0;
  player.deaths = 0;
  player.hp = 100;
  player.ammo = [30, 12, 999];
  respawn(player);

  for (const b of bots) {
    b.hp = 100;
    respawn(b);
  }
  ui.killFeed.innerHTML = "";
}

function wall(x, y) {
  const gx = Math.floor(x / S);
  const gy = Math.floor(y / S);
  return gx < 0 || gy < 0 || gy >= MAP.length || gx >= MAP[0].length || MAP[gy][gx] === "#";
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function angleTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

function normAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

function moveEntity(e, dx, dy) {
  if (!wall(e.x + dx, e.y)) e.x += dx;
  if (!wall(e.x, e.y + dy)) e.y += dy;
}

function hasLOS(a, b) {
  const distance = dist(a, b);
  for (let i = 8; i < distance; i += 8) {
    const t = i / distance;
    if (wall(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

function enemies(team) {
  return (team === 0
    ? bots.filter(b => b.team === 1)
    : [player, ...bots.filter(b => b.team === 0)]
  ).filter(e => e.hp > 0);
}

function respawn(e) {
  let q;
  if (e === player) q = [2.5, 2.5];
  else {
    const list = e.team === 1 ? redSpawns : blueSpawns;
    q = list[Math.floor(Math.random() * list.length)];
  }

  e.x = q[0] * S;
  e.y = q[1] * S;
  e.hp = 100;
  if (e === player) player.ammo = [30, 12, 999];
}

function addFeed(killer, victim, team) {
  const row = document.createElement("div");
  row.className = `feed-item ${team === 0 ? "feed-blue" : "feed-red"}`;
  row.textContent = `${killer}  →  ${victim}`;
  ui.killFeed.prepend(row);
  setTimeout(() => row.remove(), 3800);
}

function shoot(entity, weaponIndex) {
  const weapon = WEAPONS[weaponIndex];

  if (gameTime < entity.nextShot || entity.hp <= 0) return;
  if (entity === player && weaponIndex < 2 && player.ammo[weaponIndex] <= 0) {
    toast("탄약 없음");
    return;
  }

  entity.nextShot = gameTime + 1 / weapon.rate;
  if (entity === player && weaponIndex < 2) player.ammo[weaponIndex]--;

  let best = null;
  let bestScore = Infinity;

  for (const target of enemies(entity === player ? 0 : entity.team)) {
    const d = dist(entity, target);
    const da = Math.abs(normAngle(angleTo(entity, target) - entity.a));
    const hitAngle = weaponIndex === 2 ? 0.62 : 0.075;

    if (d <= weapon.range && da < hitAngle && hasLOS(entity, target)) {
      const score = da + d / 10000;
      if (score < bestScore) {
        best = target;
        bestScore = score;
      }
    }
  }

  if (!best) return;

  best.hp -= weapon.damage;

  if (best.hp <= 0) {
    const killerName = entity === player ? "YOU" : entity.name;
    const victimName = best === player ? "YOU" : best.name;
    const team = entity === player ? 0 : entity.team;

    addFeed(killerName, victimName, team);

    if (entity === player) player.kills++;
    if (best === player) player.deaths++;

    if (team === 0) scoreBlue++;
    else scoreRed++;

    setTimeout(() => respawn(best), 900);
  }
}

function selectWeapon(i) {
  player.weapon = Math.max(0, Math.min(2, i));
  document.querySelectorAll(".weapon-slot").forEach((b, n) => {
    b.classList.toggle("active", n === player.weapon);
  });
}

function reload() {
  if (player.weapon < 2) {
    player.ammo[player.weapon] = WEAPONS[player.weapon].mag;
    toast("재장전");
  }
}

function toggleAim() {
  aimbot = !aimbot;
  ui.aim.classList.toggle("on", aimbot);
}

function toggleEsp() {
  esp = !esp;
  ui.esp.classList.toggle("on", esp);
}

function updatePlayer(dt) {
  let forward = 0;
  let strafe = 0;

  if (PLATFORM.touch) {
    forward = -moveJoy.y;
    strafe = moveJoy.x;
    if (!aimbot) player.a += lookJoy.x * dt * 2.8 * sensitivity;
  } else {
    forward = (keys["w"] ? 1 : 0) - (keys["s"] ? 1 : 0);
    strafe = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
  }

  if (aimbot) {
    const target = enemies(0)
      .filter(e => hasLOS(player, e))
      .sort((a, b) => dist(player, a) - dist(player, b))[0];

    if (target) {
      player.a += normAngle(angleTo(player, target) - player.a) * Math.min(1, dt * 10);
    }
  }

  const len = Math.hypot(forward, strafe);
  if (len > 1) {
    forward /= len;
    strafe /= len;
  }

  moveEntity(
    player,
    (Math.cos(player.a) * forward + Math.cos(player.a + Math.PI / 2) * strafe) * 155 * dt,
    (Math.sin(player.a) * forward + Math.sin(player.a + Math.PI / 2) * strafe) * 155 * dt
  );

  if (firing) shoot(player, player.weapon);

  if (mode === "online" && ArenaNet.connected) {
    syncTimer += dt;
    if (syncTimer >= 0.05) {
      syncTimer = 0;
      ArenaNet.send("player_state", {
        x: player.x,
        y: player.y,
        angle: player.a,
        weapon: player.weapon
      });
    }
  }
}

function updateBots(dt) {
  if (mode !== "ai") return;

  for (const b of bots) {
    if (b.hp <= 0) continue;

    const target = enemies(b.team).sort((a, z) => dist(b, a) - dist(b, z))[0];
    if (!target) continue;

    b.a = angleTo(b, target);
    const d = dist(b, target);

    if (d > 160) {
      moveEntity(b, Math.cos(b.a) * 72 * dt, Math.sin(b.a) * 72 * dt);
    }

    if (d < 560 && hasLOS(b, target)) shoot(b, 0);
  }
}

function render() {
  const w = innerWidth;
  const h = innerHeight;

  ctx.fillStyle = "#7898ae";
  ctx.fillRect(0, 0, w, h / 2);

  ctx.fillStyle = "#414445";
  ctx.fillRect(0, h / 2, w, h / 2);

  if (mode === "menu") return;

  for (let col = 0; col < w; col += 2) {
    const rayAngle = player.a - FOV / 2 + (col / w) * FOV;
    let d = 1;

    while (d < 1300 && !wall(player.x + Math.cos(rayAngle) * d, player.y + Math.sin(rayAngle) * d)) {
      d += 4;
    }

    d *= Math.cos(rayAngle - player.a);

    const wallHeight = Math.min(h, h * S / Math.max(1, d));
    const shade = Math.max(40, 190 - d * 0.12) | 0;

    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(col, h / 2 - wallHeight / 2, 2, wallHeight);
  }

  const visibleBots = bots
    .filter(b => b.hp > 0)
    .sort((a, b) => dist(player, b) - dist(player, a));

  for (const e of visibleBots) {
    const d = dist(player, e);
    const da = normAngle(angleTo(player, e) - player.a);

    if (Math.abs(da) > FOV * 0.7) continue;

    const sx = w / 2 + (da / FOV) * w;
    const size = Math.min(h * 0.8, 18000 / d);

    if (hasLOS(player, e)) {
      ctx.fillStyle = e.team ? "#b93434" : "#348fd4";
      ctx.fillRect(sx - size * 0.21, h / 2 - size * 0.48, size * 0.42, size * 0.96);
    }

    if (esp && e.team === 1) {
      ctx.strokeStyle = "#ff3b30";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - size * 0.27, h / 2 - size * 0.55, size * 0.54, size * 1.1);

      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(
        `${e.name} ${Math.max(0, e.hp)}HP ${Math.round(d / S)}m`,
        sx - size * 0.3,
        h / 2 - size * 0.61
      );
    }
  }

  // 임시 총기 실루엣
  ctx.fillStyle = "#202326";
  ctx.fillRect(w * 0.39, h * 0.78, w * 0.22, h * 0.22);
  ctx.fillStyle = "#707577";
  ctx.fillRect(w * 0.49, h * 0.66, w * 0.035, h * 0.17);

  scoreText.textContent = `BLUE ${scoreBlue} : ${scoreRed} RED`;
  roundText.textContent = `ROUND ${round}`;
  healthText.textContent = `HEALTH ${Math.max(0, player.hp)}`;

  const weapon = WEAPONS[player.weapon];
  ammoText.textContent = `${weapon.name} · ${player.weapon === 2 ? "∞" : player.ammo[player.weapon] + " / " + weapon.mag}`;
  cheatText.textContent = `AIM ${aimbot ? "ON" : "OFF"} · ESP ${esp ? "ON" : "OFF"}`;
  kdText.textContent = `K/D ${player.kills}/${player.deaths}`;
}

function bindPad(selector, state) {
  const el = $(selector);
  const knob = el.querySelector(".knob");
  let pointerId = null;

  const update = e => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const max = r.width * 0.32;
    const len = Math.hypot(dx, dy) || 1;

    if (len > max) {
      dx *= max / len;
      dy *= max / len;
    }

    state.x = dx / max;
    state.y = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  el.addEventListener("pointerdown", e => {
    pointerId = e.pointerId;
    el.setPointerCapture(pointerId);
    update(e);
  });

  el.addEventListener("pointermove", e => {
    if (e.pointerId === pointerId) update(e);
  });

  const end = e => {
    if (e.pointerId !== pointerId) return;
    pointerId = null;
    state.x = 0;
    state.y = 0;
    knob.style.transform = "";
  };

  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

bindPad("#movePad", moveJoy);
bindPad("#lookPad", lookJoy);

document.querySelectorAll(".weapon-slot").forEach(b => {
  b.addEventListener("pointerdown", e => {
    e.preventDefault();
    selectWeapon(+b.dataset.weapon);
  });
});

addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;

  if (["1", "2", "3"].includes(e.key)) selectWeapon(+e.key - 1);
  if (e.key.toLowerCase() === "r") reload();

  if (e.key === "F1") {
    e.preventDefault();
    toggleAim();
  }

  if (e.key === "F2") {
    e.preventDefault();
    toggleEsp();
  }

  if (e.key === "Escape" && mode !== "menu") {
    if (document.pointerLockElement) document.exitPointerLock();
  }
});

addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

if (!PLATFORM.touch) {
  canvas.addEventListener("click", () => {
    if (mode !== "menu") canvas.requestPointerLock?.();
  });

  addEventListener("mousemove", e => {
    if (document.pointerLockElement === canvas && !aimbot) {
      player.a += e.movementX * 0.0026 * sensitivity;
    }
  });

  addEventListener("mousedown", e => {
    if (e.button === 0 && mode !== "menu") firing = true;
  });

  addEventListener("mouseup", e => {
    if (e.button === 0) firing = false;
  });
}

ui.fire.addEventListener("pointerdown", e => {
  e.preventDefault();
  firing = true;
});
["pointerup", "pointercancel", "pointerleave"].forEach(name => {
  ui.fire.addEventListener(name, () => firing = false);
});

ui.reload.addEventListener("click", reload);
ui.aim.addEventListener("click", toggleAim);
ui.esp.addEventListener("click", toggleEsp);

ui.menu.addEventListener("click", () => {
  mode = "menu";
  setGameVisible(false);
  ui.mainMenu.classList.remove("hidden");
  ArenaNet.close();
});

ui.aiModeBtn.addEventListener("click", startAIMode);
ui.onlineModeBtn.addEventListener("click", startOnlineMode);

ui.settingsBtn.addEventListener("click", () => {
  ui.mainMenu.classList.add("hidden");
  ui.settingsPanel.classList.remove("hidden");
});

ui.settingsClose.addEventListener("click", () => {
  ui.settingsPanel.classList.add("hidden");
  ui.mainMenu.classList.remove("hidden");
});

ui.sensitivity.addEventListener("input", () => {
  sensitivity = Number(ui.sensitivity.value);
});

ui.hudScale.addEventListener("input", () => {
  document.documentElement.style.setProperty("--hud-scale", ui.hudScale.value);
});

if (CHEAT_ARENA_CONFIG.SERVER_URL) {
  ui.onlineState.textContent = `온라인 서버: ${CHEAT_ARENA_CONFIG.SERVER_URL}`;
} else {
  ui.onlineState.textContent = "온라인 서버: 미설정 (AI전은 가능)";
}

ArenaNet.on("disconnect", () => {
  if (mode === "online") {
    toast("서버 연결 종료");
    mode = "menu";
    setGameVisible(false);
    ui.mainMenu.classList.remove("hidden");
  }
});

// 이후 Render 서버에서 이 이벤트들을 보내면 바로 연결 가능.
ArenaNet.on("match_found", data => {
  toast("3v3 매치 발견");
});

ArenaNet.on("snapshot", data => {
  // 온라인 플레이어 상태 반영 코드는 서버 스키마 확정 후 구현.
});

function loop(t) {
  const dt = Math.min(0.033, (t - lastFrame) / 1000);
  lastFrame = t;
  gameTime += dt;

  if (mode !== "menu") {
    updatePlayer(dt);
    updateBots(dt);
  }

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
