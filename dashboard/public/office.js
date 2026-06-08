// BusinessClaw pixel office — a zoomable, camera-driven game world.
//
// Highlights:
//  - Grid-based pathfinding: employees route through doorways and never cross
//    walls or furniture.
//  - Dynamic staffing: one desk + character per active org employee. Founders
//    keep their rooms; new hires fill the Ops Bullpen, so the office visibly
//    grows as you hire (the floor re-prerenders when headcount changes).
//  - Idle life: off-task employees wander to the gym, sleeping quarters, coffee
//    bar, or water cooler, emote, then return to their desk.

const CELL = 16; // pathfinding grid cell size (world px)

const AGENT_STYLE = {
  claw: { shirt: "#3f6fb0", shirtDark: "#2d5288", hair: "#3a2a1c", skin: "#f0c79a", name: "Claw" },
  ledger: { shirt: "#3f9d6b", shirtDark: "#2d7350", hair: "#241a12", skin: "#e8b98a", name: "Ledger" },
  forge: { shirt: "#c25a44", shirtDark: "#933f30", hair: "#1c1410", skin: "#f0c79a", name: "Forge" },
};
const EXTRA_PALETTE = [
  { shirt: "#8a6fc0", shirtDark: "#6a4f9c" },
  { shirt: "#c99a3f", shirtDark: "#9c7322" },
  { shirt: "#4aa0a8", shirtDark: "#347a80" },
  { shirt: "#c06a9c", shirtDark: "#974f78" },
  { shirt: "#6a8c4a", shirtDark: "#4f6a34" },
  { shirt: "#b0704a", shirtDark: "#8a5236" },
];
function styleFor(id) {
  if (AGENT_STYLE[id]) return AGENT_STYLE[id];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const p = EXTRA_PALETTE[h % EXTRA_PALETTE.length];
  return { ...p, hair: "#2c2018", skin: h % 2 ? "#f0c79a" : "#e0ad7e" };
}

// ---------------------------------------------------------------------------
// Floor scenes
// ---------------------------------------------------------------------------

function opsScene() {
  const hallY = 356;
  const hallH = 92;
  return {
    id: "ops",
    name: "Operations HQ",
    world: { w: 1520, h: 824 },
    base: "#3a3026",
    hallway: { x: 24, y: hallY, w: 1472, h: hallH },
    hallCenterY: hallY + hallH / 2,
    rooms: [
      { x: 24, y: 56, w: 380, h: 300, label: "Boardroom", floor: "#cdb98a", rug: "#9c6f43", accent: "#7a9c64", door: { side: "bottom", at: 214, w: 60 } },
      { x: 424, y: 56, w: 520, h: 300, label: "Ops Bullpen", floor: "#d8c79a", rug: "#b89a64", accent: "#c8a44a", door: { side: "bottom", at: 684, w: 64 } },
      { x: 964, y: 56, w: 260, h: 300, label: "Gym", floor: "#bcc6cd", rug: "#8fa2ad", accent: "#5fae8a", door: { side: "bottom", at: 1094, w: 56 } },
      { x: 1244, y: 56, w: 252, h: 300, label: "Lounge", floor: "#cdbfa0", rug: "#9c7a52", accent: "#b06a52", door: { side: "bottom", at: 1370, w: 56 } },
      { x: 24, y: 448, w: 300, h: 320, label: "Finance", floor: "#b8cdd6", rug: "#7fa0ad", accent: "#5f8fbf", door: { side: "top", at: 174, w: 56 } },
      { x: 344, y: 448, w: 340, h: 320, label: "Forge Workshop", floor: "#d8b6a6", rug: "#a8705a", accent: "#c25a44", door: { side: "top", at: 514, w: 60 } },
      { x: 704, y: 448, w: 300, h: 320, label: "Break Room", floor: "#cdd3bf", rug: "#9aa884", accent: "#7a9c64", door: { side: "top", at: 854, w: 56 } },
      { x: 1024, y: 448, w: 260, h: 320, label: "Sleeping Quarters", floor: "#c4b6cd", rug: "#9a86b0", accent: "#8a6fc0", door: { side: "top", at: 1154, w: 56 } },
      { x: 1304, y: 448, w: 192, h: 320, label: "Server Closet", floor: "#aab0bf", rug: "#888fa0", accent: "#5fae8a", door: { side: "top", at: 1400, w: 52 } },
    ],
    props: [
      // Boardroom
      { t: "longtable", x: 80, y: 150, w: 256, h: 70 },
      { t: "chair", x: 96, y: 120, dir: "d" }, { t: "chair", x: 186, y: 120, dir: "d" }, { t: "chair", x: 276, y: 120, dir: "d" },
      { t: "chair", x: 96, y: 224, dir: "u" }, { t: "chair", x: 186, y: 224, dir: "u" }, { t: "chair", x: 276, y: 224, dir: "u" },
      { t: "whiteboard", x: 100, y: 70, w: 220, h: 30 }, { t: "plant", x: 34, y: 308 },
      // Gym
      { t: "treadmill", x: 1000, y: 110 }, { t: "dumbbell", x: 1130, y: 120, w: 60 },
      { t: "yogamat", x: 1010, y: 250, w: 80 }, { t: "plant", x: 1190, y: 300 },
      // Lounge
      { t: "couch", x: 1280, y: 130, w: 150 }, { t: "coffeeTable", x: 1320, y: 210 },
      { t: "plant", x: 1450, y: 300 }, { t: "lamp", x: 1450, y: 110 }, { t: "poster", x: 1430, y: 80, w: 44, h: 54 },
      // Forge workshop
      { t: "toolbench", x: 380, y: 580, w: 120 }, { t: "printer3d", x: 560, y: 560 },
      { t: "toolrack", x: 600, y: 480, w: 70, h: 60 }, { t: "crate", x: 420, y: 690 }, { t: "crate", x: 458, y: 700 },
      // Finance
      { t: "safe", x: 240, y: 660 }, { t: "fileCabinet", x: 250, y: 480 }, { t: "plant", x: 36, y: 700 },
      // Break room
      { t: "counter", x: 730, y: 488, w: 150 }, { t: "fridge", x: 900, y: 488 },
      { t: "longtable", x: 740, y: 620, w: 150, h: 56 }, { t: "chair", x: 760, y: 595, dir: "d" }, { t: "chair", x: 850, y: 595, dir: "d" },
      // Sleeping quarters
      { t: "bed", x: 1050, y: 540, w: 84 }, { t: "bed", x: 1170, y: 540, w: 84 },
      { t: "nightstand", x: 1140, y: 560 }, { t: "lamp", x: 1052, y: 520 }, { t: "rugDot", x: 1060, y: 640, w: 160, h: 60 },
      // Server closet
      { t: "serverRack", x: 1330, y: 500, h: 150 }, { t: "serverRack", x: 1400, y: 500, h: 150 },
      { t: "workstation", x: 1330, y: 690, dir: "u" },
      // Hallway
      { t: "stairsUp", x: 56, y: 380 }, { t: "stairsDown", x: 1410, y: 380 },
      { t: "watercooler", x: 360, y: 372 }, { t: "plant", x: 980, y: 380 }, { t: "plant", x: 640, y: 380 },
      { t: "rugRunner", x: 24, y: 392, w: 1472 },
    ],
    // Amenities idle employees visit (stand spot + emote + seconds).
    amenities: [
      { name: "gym", x: 1040, y: 200, emote: "Workout!", dur: 8 },
      { name: "bed", x: 1092, y: 600, emote: "Zzz…", dur: 11 },
      { name: "bed2", x: 1212, y: 600, emote: "Zzz…", dur: 11 },
      { name: "coffee", x: 815, y: 540, emote: "Coffee ☕", dur: 5 },
      { name: "water", x: 372, y: 410, emote: "💧", dur: 4 },
    ],
    // Founder desks (deskX/deskY = desk top-left). Extra hires fill `extraDesks`.
    founderDesks: {
      claw: { deskX: 470, deskY: 96, room: 1 },
      ledger: { deskX: 70, deskY: 540, room: 4 },
      forge: { deskX: 388, deskY: 540, room: 5 },
    },
    extraDesks: [
      { deskX: 600, deskY: 110, room: 1 }, { deskX: 730, deskY: 110, room: 1 }, { deskX: 850, deskY: 110, room: 1 },
      { deskX: 470, deskY: 240, room: 1 }, { deskX: 600, deskY: 240, room: 1 }, { deskX: 730, deskY: 240, room: 1 }, { deskX: 850, deskY: 240, room: 1 },
      { deskX: 740, deskY: 560, room: 6 }, { deskX: 1330, deskY: 690, room: 8 },
    ],
  };
}

function researchScene() {
  return {
    id: "research",
    name: "Research Wing",
    world: { w: 1180, h: 760 },
    base: "#2f3a28",
    vhall: { x: 420, y: 48, w: 90, h: 664 },
    rooms: [
      { x: 36, y: 48, w: 372, h: 664, label: "Research Library", floor: "#bcd0ac", rug: "#8fae74", accent: "#6f9c5a", door: { side: "right", at: 360, w: 70 } },
      { x: 522, y: 48, w: 622, h: 320, label: "Meeting Room", floor: "#c9d6bb", rug: "#94ad7e", accent: "#5f8fbf", door: { side: "left", at: 180, w: 70 } },
      { x: 522, y: 392, w: 622, h: 320, label: "Lab", floor: "#c4cdb6", rug: "#9aa884", accent: "#b06a52", door: { side: "left", at: 540, w: 70 } },
    ],
    props: [
      { t: "bookshelf", x: 60, y: 90, w: 150, h: 40 }, { t: "bookshelf", x: 230, y: 90, w: 150, h: 40 },
      { t: "bookshelf", x: 60, y: 170, w: 150, h: 40 }, { t: "bookshelf", x: 230, y: 170, w: 150, h: 40 },
      { t: "bookshelf", x: 60, y: 250, w: 150, h: 40 }, { t: "bookshelf", x: 230, y: 250, w: 150, h: 40 },
      { t: "longtable", x: 90, y: 380, w: 240, h: 60 }, { t: "chair", x: 120, y: 355, dir: "d" }, { t: "chair", x: 250, y: 355, dir: "d" },
      { t: "lamp", x: 70, y: 470 }, { t: "plant", x: 320, y: 620 }, { t: "couch", x: 90, y: 560, w: 130 },
      { t: "longtable", x: 700, y: 150, w: 260, h: 90 },
      { t: "chair", x: 720, y: 120, dir: "d" }, { t: "chair", x: 820, y: 120, dir: "d" }, { t: "chair", x: 920, y: 120, dir: "d" },
      { t: "screen", x: 700, y: 70, w: 260, h: 26 }, { t: "plant", x: 1090, y: 300 },
      { t: "counter", x: 560, y: 430, w: 220 }, { t: "printer3d", x: 820, y: 440 },
      { t: "workstation", x: 980, y: 470, dir: "d" }, { t: "plant", x: 1090, y: 650 },
      { t: "stairsDown", x: 446, y: 70 }, { t: "rugRunnerV", x: 452, y: 48, h: 664 },
    ],
    empty: "Research is automated — staff work on the Ops floor.",
  };
}

function archiveScene() {
  return {
    id: "archive",
    name: "Archive & Runtime",
    world: { w: 1180, h: 760 },
    base: "#23262e",
    vhall: { x: 420, y: 48, w: 90, h: 664 },
    rooms: [
      { x: 36, y: 48, w: 372, h: 664, label: "File Cabinet Vault", floor: "#b6bcc8", rug: "#9098a8", accent: "#7a82a0", door: { side: "right", at: 360, w: 70 } },
      { x: 522, y: 48, w: 622, h: 664, label: "Runtime Room", floor: "#aab0bf", rug: "#888fa0", accent: "#5fae8a", door: { side: "left", at: 360, w: 70 } },
    ],
    props: [
      { t: "fileCabinet", x: 70, y: 110 }, { t: "fileCabinet", x: 140, y: 110 }, { t: "fileCabinet", x: 210, y: 110 },
      { t: "fileCabinet", x: 70, y: 240 }, { t: "fileCabinet", x: 140, y: 240 },
      { t: "crate", x: 280, y: 180 }, { t: "crate", x: 300, y: 320 }, { t: "safe", x: 250, y: 560 }, { t: "plant", x: 60, y: 620 },
      { t: "serverRack", x: 600, y: 120, h: 180 }, { t: "serverRack", x: 670, y: 120, h: 180 }, { t: "serverRack", x: 740, y: 120, h: 180 }, { t: "serverRack", x: 810, y: 120, h: 180 },
      { t: "serverRack", x: 980, y: 120, h: 180 }, { t: "serverRack", x: 1050, y: 120, h: 180 },
      { t: "workstation", x: 700, y: 470, dir: "d" }, { t: "serverRack", x: 980, y: 470, h: 160 }, { t: "serverRack", x: 1050, y: 470, h: 160 },
      { t: "plant", x: 1100, y: 660 }, { t: "stairsUp", x: 446, y: 70 }, { t: "rugRunnerV", x: 452, y: 48, h: 664 },
    ],
    empty: "Archive is unattended — workers are on the Ops floor.",
  };
}

const SCENES = [opsScene(), researchScene(), archiveScene()];

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
}
function ol(ctx, x, y, w, h, fill, line = "#241a12") {
  rect(ctx, x, y, w, h, line);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}
function tint(ctx, x, y, w, h, c, a) {
  ctx.globalAlpha = a;
  rect(ctx, x, y, w, h, c);
  ctx.globalAlpha = 1;
}

function drawRoom(ctx, room) {
  rect(ctx, room.x, room.y, room.w, room.h, room.floor);
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let gx = room.x + 24; gx < room.x + room.w; gx += 24) ctx.fillRect(gx, room.y, 1, room.h);
  for (let gy = room.y + 24; gy < room.y + room.h; gy += 24) ctx.fillRect(room.x, gy, room.w, 1);
  if (room.rug) {
    const rx = room.x + room.w * 0.5, ry = room.y + room.h * 0.55;
    tint(ctx, rx - room.w * 0.32, ry - room.h * 0.22, room.w * 0.64, room.h * 0.44, room.rug, 0.45);
  }
  drawWalls(ctx, room);
}

function drawRoomLabel(ctx, room) {
  const lw = room.label.length * 6 + 14;
  ol(ctx, room.x + 10, room.y + 12, lw, 16, "#f6ecd2");
  rect(ctx, room.x + 10, room.y + 12, lw, 3, room.accent || "#caa44a");
  ctx.fillStyle = "#3a2c1d";
  ctx.font = "10px 'Courier New', monospace";
  ctx.textBaseline = "top";
  ctx.fillText(room.label, room.x + 14, room.y + 16);
}

function drawWalls(ctx, room) {
  const T = 7, cap = "#6a4d31", face = "#8a6442", dark = "#4a3320";
  const d = room.door || {};
  for (const side of ["top", "right", "bottom", "left"]) {
    const gap = d.side === side ? { at: d.at, w: d.w } : null;
    if (side === "top") wallRun(ctx, room.x, room.y, room.w, T, true, gap, cap, face, dark);
    if (side === "bottom") wallRun(ctx, room.x, room.y + room.h - T, room.w, T, true, gap, cap, face, dark);
    if (side === "left") wallRun(ctx, room.x, room.y, T, room.h, false, gap, cap, face, dark);
    if (side === "right") wallRun(ctx, room.x + room.w - T, room.y, T, room.h, false, gap, cap, face, dark);
  }
}

function wallRun(ctx, x, y, w, h, horizontal, gap, cap, face, dark) {
  const segs = [];
  if (gap) {
    const g0 = gap.at - gap.w / 2, g1 = gap.at + gap.w / 2;
    if (horizontal) { segs.push([x, g0 - x]); segs.push([g1, x + w - g1]); }
    else { segs.push([y, g0 - y]); segs.push([g1, y + h - g1]); }
  } else segs.push([horizontal ? x : y, horizontal ? w : h]);
  for (const [start, len] of segs) {
    if (len <= 0) continue;
    if (horizontal) { rect(ctx, start, y, len, h, face); rect(ctx, start, y, len, 2, cap); rect(ctx, start, y + h - 1, len, 1, dark); }
    else { rect(ctx, x, start, w, len, face); rect(ctx, x, start, 2, len, cap); rect(ctx, x + w - 1, start, 1, len, dark); }
  }
  if (gap) {
    const g0 = gap.at - gap.w / 2, g1 = gap.at + gap.w / 2;
    if (horizontal) { rect(ctx, g0 - 2, y - 1, 3, h + 2, dark); rect(ctx, g1 - 1, y - 1, 3, h + 2, dark); rect(ctx, g0, y + 1, g1 - g0, h - 2, "#a98a5c"); }
    else { rect(ctx, x - 1, g0 - 2, w + 2, 3, dark); rect(ctx, x - 1, g1 - 1, w + 2, 3, dark); rect(ctx, x + 1, g0, w - 2, g1 - g0, "#a98a5c"); }
  }
}

function drawChairSprite(ctx, x, y, dir) {
  ol(ctx, x - 8, y, 16, 16, "#5a3f2a");
  rect(ctx, x - 6, y + 2, 12, 10, "#6e4f34");
  if (dir === "u") rect(ctx, x - 8, y, 16, 3, "#4a3320");
  else rect(ctx, x - 8, y + 13, 16, 3, "#4a3320");
}

// A standalone desk (used for every employee, drawn during prerender).
function drawDesk(ctx, x, y) {
  ol(ctx, x, y, 72, 26, "#8a5a34");
  rect(ctx, x + 3, y + 3, 66, 2, "rgba(255,240,210,0.25)");
  rect(ctx, x + 4, y + 26, 5, 6, "#241a12");
  rect(ctx, x + 63, y + 26, 5, 6, "#241a12");
  ol(ctx, x + 12, y - 16, 26, 18, "#2c2c34");
  rect(ctx, x + 15, y - 13, 20, 12, "#7fd4e6");
  rect(ctx, x + 16, y - 12, 8, 3, "#cdeef5");
  rect(ctx, x + 23, y + 2, 4, 3, "#1c1c22");
  rect(ctx, x + 42, y + 6, 22, 8, "#3a3a44");
  for (let k = 0; k < 5; k++) rect(ctx, x + 44 + k * 4, y + 8, 2, 2, "#5a5a66");
}

function drawProp(ctx, p) {
  switch (p.t) {
    case "longtable": {
      ol(ctx, p.x, p.y, p.w, p.h, "#9c6f43");
      rect(ctx, p.x + 3, p.y + 3, p.w - 6, 3, "rgba(255,240,210,0.3)");
      for (let i = p.x + 10; i < p.x + p.w - 6; i += 16) rect(ctx, i, p.y + 8, 1, p.h - 14, "rgba(80,50,25,0.25)");
      rect(ctx, p.x + 4, p.y + p.h, 4, 5, "#241a12"); rect(ctx, p.x + p.w - 8, p.y + p.h, 4, 5, "#241a12");
      break;
    }
    case "workstation": drawDesk(ctx, p.x, p.y); drawChairSprite(ctx, p.x + 36, p.dir === "u" ? p.y - 8 : p.y + 28, p.dir); break;
    case "chair": drawChairSprite(ctx, p.x, p.y, p.dir); break;
    case "whiteboard":
      ol(ctx, p.x, p.y, p.w, p.h, "#f4f1e6");
      rect(ctx, p.x + 5, p.y + 5, p.w - 40, 2, "#7aa2d6"); rect(ctx, p.x + 5, p.y + 11, p.w - 20, 2, "#d6857a"); rect(ctx, p.x + 5, p.y + 17, p.w - 60, 2, "#7ec08a");
      rect(ctx, p.x - 2, p.y + p.h, p.w + 4, 2, "#6a4d31");
      break;
    case "couch":
      ol(ctx, p.x, p.y, p.w, 40, "#6a7a8c"); rect(ctx, p.x + 4, p.y + 6, p.w - 8, 16, "#8597a8");
      rect(ctx, p.x, p.y - 6, 10, 30, "#5a6a7c"); rect(ctx, p.x + p.w - 10, p.y - 6, 10, 30, "#5a6a7c");
      break;
    case "coffeeTable": ol(ctx, p.x, p.y, 56, 26, "#7a5636"); rect(ctx, p.x + 6, p.y + 5, 16, 10, "#caa44a"); break;
    case "safe":
      ol(ctx, p.x, p.y, 40, 40, "#3c4450"); ol(ctx, p.x + 5, p.y + 5, 30, 30, "#525c6a");
      ctx.fillStyle = "#e8c452"; ctx.beginPath(); ctx.arc(p.x + 18, p.y + 20, 5, 0, Math.PI * 2); ctx.fill();
      rect(ctx, p.x + 24, p.y + 18, 8, 3, "#c9a23f");
      break;
    case "fileCabinet":
      ol(ctx, p.x, p.y, 46, 62, "#b98a3e");
      for (let i = 0; i < 3; i++) { ol(ctx, p.x + 4, p.y + 6 + i * 18, 38, 14, "#cda152"); rect(ctx, p.x + 18, p.y + 11 + i * 18, 10, 3, "#7a5a22"); }
      break;
    case "bookshelf": {
      ol(ctx, p.x, p.y, p.w, p.h, "#6b4a2e");
      const sp = ["#b85b4a", "#c9a23f", "#3f9d6b", "#3f6fb0", "#8a6fc0", "#d6857a", "#5fae8a"];
      for (let i = 4; i < p.w - 6; i += 7) rect(ctx, p.x + i, p.y + 4, 5, p.h - 8, sp[(i / 7 | 0) % sp.length]);
      rect(ctx, p.x + 2, p.y + p.h / 2, p.w - 4, 2, "#4a3320");
      break;
    }
    case "screen": ol(ctx, p.x, p.y, p.w, p.h, "#23303a"); rect(ctx, p.x + 4, p.y + 4, p.w - 8, p.h - 8, "#5fb5c9"); rect(ctx, p.x + 8, p.y + 7, p.w / 3, 3, "#bfe6ef"); break;
    case "serverRack": {
      ol(ctx, p.x, p.y, 58, p.h, "#2a2e36");
      for (let i = 6; i < p.h - 10; i += 14) {
        rect(ctx, p.x + 5, p.y + i, 48, 9, "#3a4049");
        rect(ctx, p.x + 47, p.y + i + 2, 3, 3, i % 28 ? "#5fd07a" : "#e8c452");
        rect(ctx, p.x + 41, p.y + i + 2, 3, 3, "#5f9fd0"); rect(ctx, p.x + 8, p.y + i + 3, 18, 2, "#23272e");
      }
      break;
    }
    case "toolbench":
      ol(ctx, p.x, p.y, p.w, 28, "#7a5636"); rect(ctx, p.x + 4, p.y + 4, p.w - 8, 3, "#9c7142");
      rect(ctx, p.x + 10, p.y + 12, 10, 8, "#9aa0a8"); rect(ctx, p.x + 30, p.y + 10, 6, 12, "#caa44a"); rect(ctx, p.x + p.w - 24, p.y + 12, 14, 6, "#bcbcc4");
      break;
    case "printer3d":
      ol(ctx, p.x, p.y, 38, 44, "#3a3f48"); rect(ctx, p.x + 5, p.y + 6, 28, 22, "#1c2026"); rect(ctx, p.x + 14, p.y + 14, 10, 10, "#5fd07a"); rect(ctx, p.x + 5, p.y + 32, 28, 6, "#2a2e36");
      break;
    case "toolrack":
      ol(ctx, p.x, p.y, p.w, p.h, "#6b4a2e"); rect(ctx, p.x + 6, p.y + 5, 4, p.h - 16, "#bcbcc4"); rect(ctx, p.x + 16, p.y + 5, 3, p.h - 12, "#caa44a"); rect(ctx, p.x + 26, p.y + 7, 8, 5, "#9aa0a8"); rect(ctx, p.x + 40, p.y + 5, 4, p.h - 14, "#bcbcc4");
      break;
    case "crate": ol(ctx, p.x, p.y, 30, 24, "#c79a5c"); rect(ctx, p.x + 3, p.y + 10, 24, 2, "#9c7338"); rect(ctx, p.x + 13, p.y + 2, 4, 20, "#9c7338"); break;
    case "counter": ol(ctx, p.x, p.y, p.w, 26, "#9aa0a8"); rect(ctx, p.x + 3, p.y + 3, p.w - 6, 3, "#c4c8ce"); rect(ctx, p.x + p.w - 30, p.y + 8, 16, 10, "#5f9fd0"); break;
    case "fridge": ol(ctx, p.x, p.y, 36, 56, "#dfe4ea"); rect(ctx, p.x + 4, p.y + 26, 28, 2, "#9aa0a8"); rect(ctx, p.x + 28, p.y + 8, 3, 12, "#9aa0a8"); rect(ctx, p.x + 28, p.y + 32, 3, 12, "#9aa0a8"); break;
    case "watercooler": ol(ctx, p.x, p.y, 22, 40, "#cfe8f0"); rect(ctx, p.x + 4, p.y - 12, 14, 16, "#7fd4e6"); rect(ctx, p.x + 6, p.y + 22, 10, 3, "#5f9fd0"); break;
    case "bed": {
      ol(ctx, p.x, p.y, p.w, 54, "#7a5636"); // frame
      rect(ctx, p.x + 3, p.y + 14, p.w - 6, 36, "#cdd6e6"); // mattress/blanket
      rect(ctx, p.x + 3, p.y + 14, p.w - 6, 12, "#e8eef6"); // pillow area
      ol(ctx, p.x + 6, p.y + 6, 24, 14, "#fbfdff"); // pillow
      rect(ctx, p.x + 3, p.y + 40, p.w - 6, 6, "#8a6fc0"); // blanket trim
      break;
    }
    case "nightstand": ol(ctx, p.x, p.y, 22, 22, "#7a5636"); rect(ctx, p.x + 7, p.y + 8, 8, 3, "#caa44a"); break;
    case "treadmill":
      ol(ctx, p.x, p.y, 40, 54, "#3a3f48"); rect(ctx, p.x + 4, p.y + 30, 32, 20, "#23272e"); // belt
      for (let i = 0; i < 4; i++) rect(ctx, p.x + 6, p.y + 33 + i * 5, 28, 1, "#41464f");
      ol(ctx, p.x + 6, p.y, 28, 16, "#2a2e36"); rect(ctx, p.x + 10, p.y + 4, 20, 6, "#5fd07a"); // console
      break;
    case "dumbbell":
      ol(ctx, p.x, p.y, p.w, 22, "#4a4f58"); // rack
      for (let i = 6; i < p.w - 8; i += 16) { rect(ctx, p.x + i, p.y + 6, 4, 8, "#23272e"); rect(ctx, p.x + i + 4, p.y + 8, 6, 4, "#3a3f48"); rect(ctx, p.x + i + 10, p.y + 6, 4, 8, "#23272e"); }
      break;
    case "yogamat": tint(ctx, p.x, p.y, p.w, 26, "#5fae8a", 0.6); ctx.strokeStyle = "rgba(40,60,50,0.4)"; ctx.strokeRect(p.x, p.y, p.w, 26); break;
    case "plant":
      rect(ctx, p.x + 4, p.y + 22, 18, 14, "#a8643c"); rect(ctx, p.x + 5, p.y + 21, 16, 3, "#c47a4e");
      rect(ctx, p.x + 8, p.y + 2, 10, 22, "#3f8a4f"); rect(ctx, p.x + 2, p.y + 8, 8, 14, "#357a45"); rect(ctx, p.x + 16, p.y + 6, 8, 16, "#47985a"); rect(ctx, p.x + 11, p.y - 2, 4, 8, "#52a565");
      break;
    case "lamp":
      rect(ctx, p.x + 7, p.y + 6, 4, 30, "#3a3f48");
      ctx.fillStyle = "#f0d98a"; ctx.beginPath(); ctx.moveTo(p.x, p.y + 8); ctx.lineTo(p.x + 18, p.y + 8); ctx.lineTo(p.x + 13, p.y - 4); ctx.lineTo(p.x + 5, p.y - 4); ctx.closePath(); ctx.fill();
      break;
    case "poster": ol(ctx, p.x, p.y, p.w, p.h, "#e9dfc6"); rect(ctx, p.x + 4, p.y + 4, p.w - 8, p.h * 0.5, "#5f8fbf"); rect(ctx, p.x + 4, p.y + p.h * 0.6, p.w - 8, 3, "#b06a52"); break;
    case "stairsUp": case "stairsDown": {
      const up = p.t === "stairsUp"; ol(ctx, p.x, p.y, 56, 56, "#7a6650");
      for (let i = 0; i < 5; i++) rect(ctx, p.x + 6 + i * 9, p.y + 6, 8, 44, up ? "#9a8a6a" : "#5a4a3a");
      ctx.fillStyle = "#f6ecd2"; ctx.font = "9px 'Courier New', monospace"; ctx.fillText(up ? "▲ 2F" : "▼ B1", p.x + 8, p.y - 12);
      break;
    }
    case "rugRunner": tint(ctx, p.x + 6, p.y, p.w - 12, 28, "#9c6f43", 0.4); break;
    case "rugRunnerV": tint(ctx, p.x, p.y + 6, 28, p.h - 12, "#9c6f43", 0.4); break;
    case "rugDot": tint(ctx, p.x, p.y, p.w || 90, p.h || 50, "#8a6fc0", 0.25); break;
    default: break;
  }
}

function drawCharacter(ctx, a) {
  const x = Math.round(a.x), y = Math.round(a.y);
  const s = a.style;
  const walking = a.state === "walking";
  const f = walking ? Math.floor(a.anim * 7) % 4 : 0;
  const swing = f === 1 ? 2 : f === 3 ? -2 : 0;
  const bob = walking ? (f % 2 ? -1 : 0) : a.idleBob;
  const flip = a.facing === "left" ? -1 : 1;

  ctx.fillStyle = "rgba(30,20,12,0.28)";
  ctx.beginPath(); ctx.ellipse(x, y + 2, 11, 4, 0, 0, Math.PI * 2); ctx.fill();

  const top = y - 30 + bob;
  rect(ctx, x - 6 + swing, top + 22, 5, 7, "#34302a"); rect(ctx, x + 1 - swing, top + 22, 5, 7, "#34302a");
  rect(ctx, x - 7 + swing, top + 28, 6, 3, "#1c1813"); rect(ctx, x + 1 - swing, top + 28, 6, 3, "#1c1813");
  ol(ctx, x - 8, top + 10, 16, 14, s.shirt);
  rect(ctx, x - 7, top + 11, 14, 3, "rgba(255,255,255,0.18)"); rect(ctx, x - 8, top + 21, 16, 3, s.shirtDark);
  rect(ctx, x - 3, top + 10, 6, 3, "#f4ecd6"); rect(ctx, x - 1, top + 10, 2, 5, s.shirtDark);
  rect(ctx, x - 10, top + 11 + (walking ? -swing : 0), 3, 9, s.shirtDark); rect(ctx, x + 7, top + 11 + (walking ? swing : 0), 3, 9, s.shirtDark);
  rect(ctx, x - 10, top + 19 + (walking ? -swing : 0), 3, 3, s.skin); rect(ctx, x + 7, top + 19 + (walking ? swing : 0), 3, 3, s.skin);
  rect(ctx, x - 2, top + 7, 4, 3, s.skin);
  ol(ctx, x - 6, top - 4, 12, 13, s.skin); rect(ctx, x - 6, top + 4, 12, 5, "rgba(0,0,0,0.06)");
  rect(ctx, x - 6, top - 4, 12, 4, s.hair); rect(ctx, x - 6, top - 4, 3, 8, s.hair); rect(ctx, x + 3, top - 4, 3, 8, s.hair);
  if (!a.blink) {
    const ex = a.facing === "left" ? -4 : a.facing === "right" ? 1 : -3;
    rect(ctx, x + ex, top + 1, 2, 3, "#23323a");
    if (a.facing === "down" || a.facing === "up") rect(ctx, x + 2, top + 1, 2, 3, "#23323a");
  } else rect(ctx, x - 3, top + 2, 6, 1, "#23323a");
  if (a.facing === "down" && !a.blink) rect(ctx, x - 2 * flip, top + 6, 3, 1, "rgba(120,70,60,0.5)");
}

// ---------------------------------------------------------------------------
// Pathfinding grid
// ---------------------------------------------------------------------------

function footprint(p) {
  switch (p.t) {
    case "longtable": return [p.x, p.y, p.w, p.h];
    case "safe": return [p.x, p.y, 40, 40];
    case "fileCabinet": return [p.x, p.y, 46, 62];
    case "bookshelf": return [p.x, p.y, p.w, p.h];
    case "serverRack": return [p.x, p.y, 58, p.h];
    case "toolbench": return [p.x, p.y, p.w, 28];
    case "printer3d": return [p.x, p.y, 38, 44];
    case "toolrack": return [p.x, p.y, p.w, p.h];
    case "crate": return [p.x, p.y, 30, 24];
    case "counter": return [p.x, p.y, p.w, 26];
    case "fridge": return [p.x, p.y, 36, 56];
    case "couch": return [p.x, p.y, p.w, 40];
    case "coffeeTable": return [p.x, p.y, 56, 26];
    case "bed": return [p.x, p.y, p.w, 54];
    case "treadmill": return [p.x, p.y, 40, 54];
    case "dumbbell": return [p.x, p.y, p.w, 22];
    case "watercooler": return [p.x, p.y, 22, 40];
    case "whiteboard": return [p.x, p.y, p.w, 6];
    case "screen": return [p.x, p.y, p.w, 8];
    case "stairsUp": case "stairsDown": return [p.x, p.y, 56, 56];
    default: return null;
  }
}

function buildGrid(scene, desks) {
  const cols = Math.ceil(scene.world.w / CELL), rows = Math.ceil(scene.world.h / CELL);
  const blocked = new Uint8Array(cols * rows).fill(1);
  const carve = (x, y, w, h, val) => {
    const c0 = Math.max(0, Math.floor(x / CELL)), c1 = Math.min(cols - 1, Math.floor((x + w) / CELL));
    const r0 = Math.max(0, Math.floor(y / CELL)), r1 = Math.min(rows - 1, Math.floor((y + h) / CELL));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) blocked[r * cols + c] = val;
  };
  const T = 7;
  if (scene.hallway) carve(scene.hallway.x, scene.hallway.y, scene.hallway.w, scene.hallway.h, 0);
  if (scene.vhall) carve(scene.vhall.x, scene.vhall.y, scene.vhall.w, scene.vhall.h, 0);
  for (const room of scene.rooms) {
    carve(room.x + T, room.y + T, room.w - 2 * T, room.h - 2 * T, 0);
    const d = room.door;
    if (d) {
      if (d.side === "bottom") carve(d.at - d.w / 2, room.y + room.h - T - 2, d.w, T + 8, 0);
      if (d.side === "top") carve(d.at - d.w / 2, room.y - 6, d.w, T + 8, 0);
      if (d.side === "right") carve(room.x + room.w - T - 2, d.at - d.w / 2, T + 8, d.w, 0);
      if (d.side === "left") carve(room.x - 6, d.at - d.w / 2, T + 8, d.w, 0);
    }
  }
  for (const p of scene.props) { const fp = footprint(p); if (fp) carve(fp[0], fp[1], fp[2], fp[3], 1); }
  for (const d of desks || []) carve(d.deskX, d.deskY - 16, 72, 44, 1); // desk + monitor
  return { cols, rows, blocked };
}

function cellWalkable(grid, c, r) {
  return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.blocked[r * grid.cols + c] === 0;
}
function nearestWalkable(grid, wx, wy) {
  let c = Math.floor(wx / CELL), r = Math.floor(wy / CELL);
  if (cellWalkable(grid, c, r)) return [c, r];
  for (let rad = 1; rad < 12; rad++)
    for (let dr = -rad; dr <= rad; dr++)
      for (let dc = -rad; dc <= rad; dc++)
        if (cellWalkable(grid, c + dc, r + dr)) return [c + dc, r + dr];
  return [c, r];
}
function losClear(grid, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.ceil(Math.hypot(dx, dy) / (CELL * 0.5));
  for (let i = 1; i < steps; i++) {
    const x = x0 + (dx * i) / steps, y = y0 + (dy * i) / steps;
    if (!cellWalkable(grid, Math.floor(x / CELL), Math.floor(y / CELL))) return false;
  }
  return true;
}
function findPath(grid, sx, sy, gx, gy) {
  const [sc, sr] = nearestWalkable(grid, sx, sy);
  const [gc, gr] = nearestWalkable(grid, gx, gy);
  const start = sr * grid.cols + sc, goal = gr * grid.cols + gc;
  if (start === goal) return [{ x: gx, y: gy }];
  const prev = new Int32Array(grid.cols * grid.rows).fill(-1);
  const seen = new Uint8Array(grid.cols * grid.rows);
  const q = [start]; seen[start] = 1;
  let head = 0, found = false;
  const N = [-1, 1, -grid.cols, grid.cols];
  while (head < q.length) {
    const cur = q[head++];
    if (cur === goal) { found = true; break; }
    const cc = cur % grid.cols, cr = (cur / grid.cols) | 0;
    for (let k = 0; k < 4; k++) {
      const nc = cc + (k === 0 ? -1 : k === 1 ? 1 : 0);
      const nr = cr + (k === 2 ? -1 : k === 3 ? 1 : 0);
      if (!cellWalkable(grid, nc, nr)) continue;
      const ni = nr * grid.cols + nc;
      if (seen[ni]) continue;
      seen[ni] = 1; prev[ni] = cur; q.push(ni);
    }
  }
  if (!found) return [{ x: gx, y: gy }];
  const cells = [];
  for (let cur = goal; cur !== -1; cur = prev[cur]) cells.push(cur);
  cells.reverse();
  const pts = cells.map((i) => ({ x: ((i % grid.cols) + 0.5) * CELL, y: (((i / grid.cols) | 0) + 0.5) * CELL }));
  pts[pts.length - 1] = { x: gx, y: gy };
  // String-pull smoothing via line-of-sight.
  const out = [{ x: sx, y: sy }];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !losClear(grid, out[out.length - 1].x, out[out.length - 1].y, pts[j].x, pts[j].y)) j--;
    out.push(pts[j]); i = j;
  }
  out.shift();
  return out;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const Office = {
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.holder = canvas.parentElement;
    this.floor = 0;
    this.prerendered = [];
    this.cam = { x: 0, y: 0, zoom: 1, minZoom: 0.4, maxZoom: 4 };
    this.agents = {};
    this.order = [];
    this.conversations = [];
    this.ambient = {};
    this.drag = null;
    this.slotSig = "";
    this.grid = null;
    this.lastT = 0;
    this._bindInput();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    // Seed with the three founders until live data arrives.
    this.syncEmployees([{ id: "claw", name: "Claw" }, { id: "ledger", name: "Ledger" }, { id: "forge", name: "Forge" }]);
    this.setFloor(0);
    window.__BUSINESSCLAW_SCENE__ = { agents: this.order.length, hasMic: true, floors: SCENES.length };
    this.lastT = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  },

  resize() {
    const r = this.holder.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(2, Math.floor(r.width * this.dpr));
    this.canvas.height = Math.max(2, Math.floor(r.height * this.dpr));
    this.cssW = r.width; this.cssH = r.height;
    this.ctx.imageSmoothingEnabled = false;
  },

  // Map active employees to desks (founders pinned, hires fill the bullpen).
  assignDesks(employees) {
    const scene = SCENES[0];
    const out = [];
    let extra = 0;
    for (const emp of employees) {
      let d = scene.founderDesks[emp.id];
      if (!d) {
        d = scene.extraDesks[extra] || { deskX: 470 + (extra % 4) * 120, deskY: 110 + Math.floor(extra / 4) * 90, room: 1 };
        extra++;
      }
      out.push({ id: emp.id, name: emp.name || emp.id, deskX: d.deskX, deskY: d.deskY, room: d.room, standX: d.deskX + 36, standY: d.deskY + 50, facing: "down" });
    }
    return out;
  },

  syncEmployees(employees) {
    const desks = this.assignDesks(employees);
    this.desks = desks;
    const ids = desks.map((d) => d.id);
    for (const id of Object.keys(this.agents)) {
      if (!ids.includes(id)) {
        const a = this.agents[id];
        if (a.nameEl) a.nameEl.remove();
        if (a.bubbleEl) a.bubbleEl.remove();
        delete this.agents[id];
      }
    }
    desks.forEach((d, i) => {
      let a = this.agents[d.id];
      if (!a) {
        a = this.agents[d.id] = {
          id: d.id, x: d.standX, y: d.standY, style: styleFor(d.id),
          path: [], facing: d.facing, state: "idle", anim: 0, idleBob: 0,
          blink: false, blinkT: 1 + i * 0.5, role: "home", partner: null,
          pendingSpeech: "", speech: "", thought: "", bubbleEl: null, nameEl: null,
          activity: null, activityT: 0, wanderT: 8 + Math.random() * 14, _destKey: "",
        };
      }
      a.name = d.name; a.home = d; a.style = styleFor(d.id);
    });
    this.order = ids;
    const sig = desks.map((d) => `${d.id}@${d.deskX},${d.deskY}`).join("|");
    if (sig !== this.slotSig) {
      this.slotSig = sig;
      this.prerender(0);
      this.grid = buildGrid(SCENES[0], desks);
    }
    if (window.__BUSINESSCLAW_SCENE__) window.__BUSINESSCLAW_SCENE__.agents = this.order.length;
  },

  prerender(i) {
    const scene = SCENES[i];
    const off = document.createElement("canvas");
    off.width = scene.world.w; off.height = scene.world.h;
    const c = off.getContext("2d");
    c.imageSmoothingEnabled = false;
    rect(c, 0, 0, scene.world.w, scene.world.h, scene.base);
    if (scene.hallway) rect(c, scene.hallway.x, scene.hallway.y, scene.hallway.w, scene.hallway.h, "#c2a878");
    if (scene.vhall) rect(c, scene.vhall.x, scene.vhall.y, scene.vhall.w, scene.vhall.h, "#b8b29a");
    for (const room of scene.rooms) drawRoom(c, room);
    for (const p of scene.props) drawProp(c, p);
    if (i === 0) for (const d of this.desks || []) drawDesk(c, d.deskX, d.deskY);
    for (const room of scene.rooms) drawRoomLabel(c, room);
    if (scene.empty) {
      const w = scene.empty.length * 6 + 18;
      ol(c, (scene.world.w - w) / 2, scene.world.h - 40, w, 22, "#f6ecd2");
      c.fillStyle = "#5a4632"; c.font = "11px 'Courier New', monospace"; c.textBaseline = "top";
      c.fillText(scene.empty, (scene.world.w - w) / 2 + 9, scene.world.h - 34);
    }
    this.prerendered[i] = off;
  },

  setFloor(n) {
    this.floor = Math.max(0, Math.min(SCENES.length - 1, n));
    if (!this.prerendered[this.floor]) this.prerender(this.floor);
    this.fit();
  },

  fit() {
    const s = SCENES[this.floor];
    const z = Math.min(this.cssW / s.world.w, this.cssH / s.world.h) * 0.98;
    this.cam.minZoom = z * 0.85; this.cam.zoom = z;
    this.cam.x = s.world.w / 2; this.cam.y = s.world.h / 2;
    this.clampCam();
  },

  clampCam() {
    const s = SCENES[this.floor];
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(this.cam.maxZoom, this.cam.zoom));
    const hw = this.cssW / 2 / this.cam.zoom, hh = this.cssH / 2 / this.cam.zoom, pad = 140;
    this.cam.x = Math.max(-pad + hw, Math.min(s.world.w + pad - hw, this.cam.x));
    this.cam.y = Math.max(-pad + hh, Math.min(s.world.h + pad - hh, this.cam.y));
    if (s.world.w * this.cam.zoom <= this.cssW) this.cam.x = s.world.w / 2;
    if (s.world.h * this.cam.zoom <= this.cssH) this.cam.y = s.world.h / 2;
  },

  zoomBy(factor, cx, cy) {
    const px = cx == null ? this.cssW / 2 : cx, py = cy == null ? this.cssH / 2 : cy;
    const b = this.screenToWorld(px, py);
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(this.cam.maxZoom, this.cam.zoom * factor));
    const a = this.screenToWorld(px, py);
    this.cam.x += b.x - a.x; this.cam.y += b.y - a.y; this.clampCam();
  },

  screenToWorld(sx, sy) { return { x: (sx - this.cssW / 2) / this.cam.zoom + this.cam.x, y: (sy - this.cssH / 2) / this.cam.zoom + this.cam.y }; },
  worldToScreen(wx, wy) { return { x: (wx - this.cam.x) * this.cam.zoom + this.cssW / 2, y: (wy - this.cam.y) * this.cam.zoom + this.cssH / 2 }; },

  setState(state) {
    this.conversations = (state.queue && state.queue.conversations) || [];
    this.ambient = state.__ambient || {};
    let active = (state.org && state.org.employees ? state.org.employees : []).filter((e) => e.status === "active");
    if (!active.length) active = [{ id: "claw", name: "Claw" }, { id: "ledger", name: "Ledger" }, { id: "forge", name: "Forge" }];
    this.syncEmployees(active);
    // Conversation roles.
    for (const id of this.order) { this.agents[id].role = "home"; this.agents[id].partner = null; }
    const convo = this.conversations.find((c) => this.agents[c.from] && this.agents[c.to]);
    if (convo) {
      const from = this.agents[convo.from], to = this.agents[convo.to];
      from.role = "approach"; from.partner = to.id; from.pendingSpeech = convo.body || "…";
      from.activity = null; to.role = "listen";
    }
  },

  desiredDest(a) {
    if (a.role === "approach" && this.agents[a.partner]) {
      const p = this.agents[a.partner];
      const dx = p.x > a.x ? -30 : 30;
      return { x: p.x + dx, y: p.y, key: `talk:${a.partner}` };
    }
    if (a.activity) return { x: a.activity.x, y: a.activity.y, key: `act:${a.activity.name}` };
    return { x: a.home.standX, y: a.home.standY, key: "home" };
  },

  update(dt) {
    const scene = SCENES[0];
    for (const id of this.order) {
      const a = this.agents[id];

      // Idle wander scheduling (only when truly idle).
      if (a.role === "home" && !a.activity && (!a.path || !a.path.length)) {
        a.wanderT -= dt;
        if (a.wanderT <= 0) {
          a.wanderT = 14 + Math.random() * 18;
          if (Math.random() < 0.7 && scene.amenities.length) {
            const am = scene.amenities[(Math.random() * scene.amenities.length) | 0];
            a.activity = { ...am };
            a.activityT = am.dur;
            a.atActivity = false;
          }
        }
      }

      const dest = this.desiredDest(a);
      if (a._destKey !== dest.key) {
        a._destKey = dest.key;
        a.path = this.grid ? findPath(this.grid, a.x, a.y, dest.x, dest.y) : [{ x: dest.x, y: dest.y }];
      }

      // Follow path.
      if (a.path && a.path.length) {
        const t = a.path[0];
        const dx = t.x - a.x, dy = t.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2) {
          a.path.shift();
          if (!a.path.length) a.x = t.x, (a.y = t.y);
        } else {
          const step = Math.min(d, 92 * dt);
          a.x += (dx / d) * step; a.y += (dy / d) * step;
          a.state = "walking"; a.anim += dt;
          a.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
        }
      }
      const arrived = !a.path || !a.path.length;
      if (arrived && a.state === "walking") a.state = a.role === "approach" || a.activity ? "busy" : "idle";

      // Activity countdown once arrived.
      if (a.activity) {
        if (arrived) {
          a.atActivity = true;
          a.activityT -= dt;
          if (a.activityT <= 0) { a.activity = null; a.atActivity = false; a._destKey = "_done"; } // done → re-route home
        }
      }

      // Listener faces speaker.
      if (a.role === "listen" && this.agents[a.partner]) a.facing = this.agents[a.partner].x < a.x ? "left" : "right";

      a.idleBob = Math.sin(performance.now() / 360 + this.order.indexOf(id)) > 0.6 ? -1 : 0;
      a.blinkT -= dt;
      if (a.blinkT <= 0) { a.blink = true; if (a.blinkT < -0.12) { a.blink = false; a.blinkT = 2.4 + Math.random() * 2; } }

      // Speech / thought.
      if (a.activity && a.atActivity && arrived) { a.speech = a.activity.emote; a.thought = ""; }
      else if (a.activity) { a.speech = ""; a.thought = "…"; }
      else if (a.role === "approach") { a.speech = arrived ? a.pendingSpeech : ""; a.thought = arrived ? "" : "…"; }
      else if (a.role === "listen") { a.speech = ""; a.thought = ""; }
      else { a.speech = this.ambient?.[id]?.speech || ""; a.thought = this.ambient?.[id]?.thought || ""; }
    }
  },

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1a2030"; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.translate(this.cssW / 2, this.cssH / 2); ctx.scale(this.cam.zoom, this.cam.zoom); ctx.translate(-this.cam.x, -this.cam.y);
    const off = this.prerendered[this.floor];
    if (off) ctx.drawImage(off, 0, 0);
    if (this.floor === 0) {
      const sorted = this.order.slice().sort((p, q) => this.agents[p].y - this.agents[q].y);
      for (const id of sorted) drawCharacter(ctx, this.agents[id]);
    }
    this.syncOverlays();
  },

  syncOverlays() {
    const off = (sc) => sc.x < -60 || sc.x > this.cssW + 60 || sc.y < -40 || sc.y > this.cssH + 40;
    for (const id of this.order) {
      const a = this.agents[id];
      const onFloor = this.floor === 0;
      if (onFloor) {
        if (!a.nameEl) { a.nameEl = document.createElement("div"); a.nameEl.className = "name-tag"; this.holder.appendChild(a.nameEl); }
        a.nameEl.textContent = a.name || (a.style && a.style.name) || id;
        const ns = this.worldToScreen(a.x, a.y + 12);
        a.nameEl.style.left = `${ns.x}px`; a.nameEl.style.top = `${ns.y}px`;
        a.nameEl.style.display = off(ns) ? "none" : "block";
      } else if (a.nameEl) { a.nameEl.remove(); a.nameEl = null; }

      const vis = onFloor && (a.speech || a.thought);
      if (vis && !a.bubbleEl) { a.bubbleEl = document.createElement("div"); a.bubbleEl.className = "speech-bubble"; this.holder.appendChild(a.bubbleEl); }
      if (!vis) { if (a.bubbleEl) { a.bubbleEl.remove(); a.bubbleEl = null; } continue; }
      a.bubbleEl.textContent = a.speech || a.thought;
      a.bubbleEl.classList.toggle("thinking", !a.speech && Boolean(a.thought));
      const sc = this.worldToScreen(a.x, a.y - 34);
      a.bubbleEl.style.left = `${sc.x}px`; a.bubbleEl.style.top = `${sc.y}px`;
      a.bubbleEl.style.display = off(sc) ? "none" : "block";
    }
  },

  agentScreenPos(id) { const a = this.agents[id]; return a ? this.worldToScreen(a.x, a.y - 30) : { x: 0, y: 0 }; },

  loop(t) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t; this.update(dt); this.render();
    requestAnimationFrame((nt) => this.loop(nt));
  },

  _bindInput() {
    const cv = this.canvas;

    // Mouse
    cv.addEventListener("wheel", (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    cv.addEventListener("mousedown", (e) => { const r = cv.getBoundingClientRect(); this.drag = { x: e.clientX, y: e.clientY, camX: this.cam.x, camY: this.cam.y, moved: false, sx: e.clientX - r.left, sy: e.clientY - r.top }; });
    window.addEventListener("mousemove", (e) => {
      if (!this.drag || this._touch) return;
      const ddx = e.clientX - this.drag.x, ddy = e.clientY - this.drag.y;
      if (Math.abs(ddx) + Math.abs(ddy) > 3) this.drag.moved = true;
      this.cam.x = this.drag.camX - ddx / this.cam.zoom; this.cam.y = this.drag.camY - ddy / this.cam.zoom; this.clampCam();
      cv.style.cursor = "grabbing";
    });
    window.addEventListener("mouseup", () => { if (!this.drag || this._touch) return; cv.style.cursor = "grab"; if (!this.drag.moved) this._click(this.drag.sx, this.drag.sy); this.drag = null; });
    cv.style.cursor = "grab";

    // Touch: pan + tap-to-click + pinch-zoom
    let pinchDist = 0;
    cv.addEventListener("touchstart", (e) => {
      this._touch = true;
      if (e.touches.length === 1) {
        const t = e.touches[0], r = cv.getBoundingClientRect();
        this.drag = { x: t.clientX, y: t.clientY, camX: this.cam.x, camY: this.cam.y, moved: false, sx: t.clientX - r.left, sy: t.clientY - r.top };
        pinchDist = 0;
      } else if (e.touches.length === 2) {
        pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });
    cv.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchDist > 0) {
          const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const r = cv.getBoundingClientRect();
          this.zoomBy(d / pinchDist, mx - r.left, my - r.top);
        }
        pinchDist = d;
      } else if (e.touches.length === 1 && this.drag) {
        const t = e.touches[0];
        const ddx = t.clientX - this.drag.x, ddy = t.clientY - this.drag.y;
        if (Math.abs(ddx) + Math.abs(ddy) > 6) this.drag.moved = true;
        this.cam.x = this.drag.camX - ddx / this.cam.zoom; this.cam.y = this.drag.camY - ddy / this.cam.zoom; this.clampCam();
      }
    }, { passive: true });
    cv.addEventListener("touchend", () => {
      if (!this.drag) return;
      if (!this.drag.moved) this._click(this.drag.sx, this.drag.sy);
      this.drag = null; this._touch = false; pinchDist = 0;
    }, { passive: true });
  },

  _click(sx, sy) {
    if (this.floor !== 0) { if (this.emptyCb) this.emptyCb(); return; }
    const w = this.screenToWorld(sx, sy);
    let hit = null;
    for (const id of this.order) { const a = this.agents[id]; if (Math.abs(w.x - a.x) < 14 && w.y > a.y - 34 && w.y < a.y + 8) hit = id; }
    if (hit && this.clickCb) this.clickCb(hit, this.agentScreenPos(hit));
    else if (this.emptyCb) this.emptyCb();
  },

  onAgentClick(cb) { this.clickCb = cb; },
  onEmptyClick(cb) { this.emptyCb = cb; },
};

window.Office = Office;
