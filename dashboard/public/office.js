// BusinessClaw pixel office — a zoomable, camera-driven game world.
//
// Each floor is a detailed building interior with varied-size rooms connected by
// a central hallway with real doorways. The static scene is prerendered once to
// an offscreen canvas (in world pixels) and blitted each frame under a camera
// transform (pan + zoom, nearest-neighbour so it stays crisp). Employees are
// animated pixel characters that path *through doorways* to walk over and talk;
// the speech bubble is held until the speaker actually arrives.

// Agent identity styling.
const AGENT_STYLE = {
  claw: { shirt: "#3f6fb0", shirtDark: "#2d5288", hair: "#3a2a1c", skin: "#f0c79a", name: "Claw" },
  ledger: { shirt: "#3f9d6b", shirtDark: "#2d7350", hair: "#241a12", skin: "#e8b98a", name: "Ledger" },
  forge: { shirt: "#c25a44", shirtDark: "#933f30", hair: "#1c1410", skin: "#f0c79a", name: "Forge" },
};

// ---------------------------------------------------------------------------
// Scene definitions. Coordinates are world pixels.
// Each room: { x, y, w, h, label, floor, rug, accent, door:{side,at,w} }
// ---------------------------------------------------------------------------

function opsScene() {
  const hallY = 348;
  const hallH = 84;
  return {
    id: "ops",
    name: "Operations HQ",
    world: { w: 1240, h: 768 },
    base: "#3a3026",
    hallway: { x: 28, y: hallY, w: 1184, h: hallH, color: "#c2a878" },
    hallY: hallY + hallH / 2,
    rooms: [
      { x: 28, y: 56, w: 440, h: 292, label: "Boardroom", floor: "#cdb98a", rug: "#9c6f43", accent: "#7a9c64", door: { side: "bottom", at: 248, w: 60 } },
      { x: 492, y: 56, w: 360, h: 292, label: "Ops Bullpen", floor: "#d8c79a", rug: "#b89a64", accent: "#c8a44a", door: { side: "bottom", at: 672, w: 60 } },
      { x: 876, y: 56, w: 336, h: 292, label: "Lounge", floor: "#cdbfa0", rug: "#9c7a52", accent: "#b06a52", door: { side: "bottom", at: 1044, w: 60 } },
      { x: 28, y: 432, w: 336, h: 280, label: "Finance", floor: "#b8cdd6", rug: "#7fa0ad", accent: "#5f8fbf", door: { side: "top", at: 196, w: 60 } },
      { x: 388, y: 432, w: 392, h: 280, label: "Forge Workshop", floor: "#d8b6a6", rug: "#a8705a", accent: "#c25a44", door: { side: "top", at: 584, w: 64 } },
      { x: 804, y: 432, w: 408, h: 280, label: "Break Room", floor: "#cdd3bf", rug: "#9aa884", accent: "#7a9c64", door: { side: "top", at: 1008, w: 60 } },
    ],
    props: [
      // Boardroom
      { t: "longtable", x: 96, y: 150, w: 300, h: 70 },
      { t: "chair", x: 110, y: 120, dir: "d" }, { t: "chair", x: 200, y: 120, dir: "d" }, { t: "chair", x: 290, y: 120, dir: "d" },
      { t: "chair", x: 110, y: 224, dir: "u" }, { t: "chair", x: 200, y: 224, dir: "u" }, { t: "chair", x: 290, y: 224, dir: "u" },
      { t: "whiteboard", x: 120, y: 70, w: 250, h: 30 },
      { t: "plant", x: 40, y: 300 }, { t: "poster", x: 400, y: 90, w: 40, h: 54 },
      // Ops bullpen — workstations
      { t: "workstation", x: 560, y: 150, dir: "d" },
      { t: "workstation", x: 720, y: 150, dir: "d" },
      { t: "workstation", x: 640, y: 250, dir: "u" },
      { t: "plant", x: 812, y: 70 }, { t: "window", x: 712, y: 64, w: 80 },
      // Lounge
      { t: "couch", x: 920, y: 130, w: 150 }, { t: "coffeeTable", x: 960, y: 210 },
      { t: "plant", x: 1160, y: 290 }, { t: "rugDot", x: 940, y: 180 }, { t: "lamp", x: 1140, y: 110 },
      { t: "poster", x: 1120, y: 80, w: 44, h: 56 },
      // Finance
      { t: "workstation", x: 90, y: 540, dir: "d" },
      { t: "safe", x: 250, y: 600 }, { t: "fileCabinet", x: 300, y: 470 },
      { t: "plant", x: 40, y: 660 },
      // Forge workshop
      { t: "toolbench", x: 430, y: 560, w: 120 },
      { t: "printer3d", x: 600, y: 540 },
      { t: "toolrack", x: 690, y: 470, w: 70, h: 60 },
      { t: "crate", x: 660, y: 630 }, { t: "crate", x: 700, y: 640 },
      // Break room
      { t: "counter", x: 850, y: 470, w: 160 },
      { t: "fridge", x: 1030, y: 470 }, { t: "watercooler", x: 1130, y: 540 },
      { t: "longtable", x: 880, y: 590, w: 150, h: 56 },
      { t: "chair", x: 900, y: 565, dir: "d" }, { t: "chair", x: 990, y: 565, dir: "d" },
      { t: "plant", x: 1170, y: 660 },
      // Hallway features
      { t: "stairsUp", x: 60, y: 360 }, { t: "stairsDown", x: 1140, y: 360 },
      { t: "plant", x: 600, y: 360 }, { t: "watercooler", x: 320, y: 360 },
      { t: "rugRunner", x: 28, y: 384, w: 1184 },
    ],
    homes: {
      claw: { x: 640, y: 210, room: 1, facing: "down" },
      ledger: { x: 120, y: 590, room: 3, facing: "down" },
      forge: { x: 500, y: 600, room: 4, facing: "down" },
    },
  };
}

function researchScene() {
  const hallX = 420;
  return {
    id: "research",
    name: "Research Wing",
    world: { w: 1180, h: 760 },
    base: "#2f3a28",
    vhall: { x: hallX, y: 48, w: 90, h: 664, color: "#aeb89a" },
    rooms: [
      { x: 36, y: 48, w: 372, h: 664, label: "Research Library", floor: "#bcd0ac", rug: "#8fae74", accent: "#6f9c5a", door: { side: "right", at: 360, w: 70 } },
      { x: 522, y: 48, w: 622, h: 320, label: "Meeting Room", floor: "#c9d6bb", rug: "#94ad7e", accent: "#5f8fbf", door: { side: "left", at: 180, w: 70 } },
      { x: 522, y: 392, w: 622, h: 320, label: "Lab", floor: "#c4cdb6", rug: "#9aa884", accent: "#b06a52", door: { side: "left", at: 540, w: 70 } },
    ],
    props: [
      // Library — rows of tall shelves
      { t: "bookshelf", x: 60, y: 90, w: 150, h: 40 }, { t: "bookshelf", x: 230, y: 90, w: 150, h: 40 },
      { t: "bookshelf", x: 60, y: 170, w: 150, h: 40 }, { t: "bookshelf", x: 230, y: 170, w: 150, h: 40 },
      { t: "bookshelf", x: 60, y: 250, w: 150, h: 40 }, { t: "bookshelf", x: 230, y: 250, w: 150, h: 40 },
      { t: "longtable", x: 90, y: 380, w: 240, h: 60 }, { t: "chair", x: 120, y: 355, dir: "d" }, { t: "chair", x: 250, y: 355, dir: "d" },
      { t: "lamp", x: 70, y: 470 }, { t: "plant", x: 320, y: 620 }, { t: "couch", x: 90, y: 560, w: 130 },
      // Meeting room
      { t: "longtable", x: 700, y: 150, w: 260, h: 90 },
      { t: "chair", x: 720, y: 120, dir: "d" }, { t: "chair", x: 820, y: 120, dir: "d" }, { t: "chair", x: 920, y: 120, dir: "d" },
      { t: "chair", x: 720, y: 244, dir: "u" }, { t: "chair", x: 820, y: 244, dir: "u" }, { t: "chair", x: 920, y: 244, dir: "u" },
      { t: "screen", x: 700, y: 70, w: 260, h: 26 }, { t: "plant", x: 1090, y: 300 },
      // Lab
      { t: "counter", x: 560, y: 430, w: 220 }, { t: "printer3d", x: 820, y: 440 },
      { t: "workstation", x: 980, y: 470, dir: "d" }, { t: "toolrack", x: 600, y: 620, w: 80, h: 60 },
      { t: "plant", x: 1090, y: 650 },
      // Hallway
      { t: "stairsDown", x: 446, y: 70 }, { t: "plant", x: 452, y: 620 },
      { t: "rugRunnerV", x: 452, y: 48, h: 664 },
    ],
    homes: {},
    empty: "Research staff report to the Ops floor.",
  };
}

function archiveScene() {
  const hallX = 420;
  return {
    id: "archive",
    name: "Archive & Runtime",
    world: { w: 1180, h: 760 },
    base: "#23262e",
    vhall: { x: hallX, y: 48, w: 90, h: 664, color: "#8a90a0" },
    rooms: [
      { x: 36, y: 48, w: 372, h: 664, label: "File Cabinet Vault", floor: "#b6bcc8", rug: "#9098a8", accent: "#7a82a0", door: { side: "right", at: 360, w: 70 } },
      { x: 522, y: 48, w: 622, h: 664, label: "Runtime Room", floor: "#aab0bf", rug: "#888fa0", accent: "#5fae8a", door: { side: "left", at: 360, w: 70 } },
    ],
    props: [
      // Vault — cabinets and crates
      { t: "fileCabinet", x: 70, y: 110 }, { t: "fileCabinet", x: 140, y: 110 }, { t: "fileCabinet", x: 210, y: 110 },
      { t: "fileCabinet", x: 70, y: 240 }, { t: "fileCabinet", x: 140, y: 240 },
      { t: "crate", x: 280, y: 180 }, { t: "crate", x: 300, y: 320 }, { t: "crate", x: 90, y: 400 },
      { t: "safe", x: 250, y: 560 }, { t: "plant", x: 60, y: 620 },
      // Runtime room — server rows
      { t: "serverRack", x: 600, y: 120, h: 180 }, { t: "serverRack", x: 670, y: 120, h: 180 },
      { t: "serverRack", x: 740, y: 120, h: 180 }, { t: "serverRack", x: 810, y: 120, h: 180 },
      { t: "serverRack", x: 980, y: 120, h: 180 }, { t: "serverRack", x: 1050, y: 120, h: 180 },
      { t: "workstation", x: 700, y: 470, dir: "d" },
      { t: "serverRack", x: 980, y: 470, h: 160 }, { t: "serverRack", x: 1050, y: 470, h: 160 },
      { t: "plant", x: 1100, y: 660 },
      // Hallway
      { t: "stairsUp", x: 446, y: 70 }, { t: "rugRunnerV", x: 452, y: 48, h: 664 },
    ],
    homes: {},
    empty: "Archive is unattended — workers are on the Ops floor.",
  };
}

const SCENES = [opsScene(), researchScene(), archiveScene()];

// ---------------------------------------------------------------------------
// Drawing primitives (world-space, drawn onto an offscreen prerender ctx)
// ---------------------------------------------------------------------------

function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0));
}
function ol(ctx, x, y, w, h, fill, line = "#241a12") {
  rect(ctx, x, y, w, h, line);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}
function shade(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function drawFloorTiles(ctx, scene) {
  rect(ctx, 0, 0, scene.world.w, scene.world.h, scene.base);
}

function tint(ctx, x, y, w, h, c, a) {
  ctx.globalAlpha = a;
  rect(ctx, x, y, w, h, c);
  ctx.globalAlpha = 1;
}

function drawRoom(ctx, room) {
  // Floor
  rect(ctx, room.x, room.y, room.w, room.h, room.floor);
  // Tile grout grid
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let gx = room.x + 24; gx < room.x + room.w; gx += 24) ctx.fillRect(gx, room.y, 1, room.h);
  for (let gy = room.y + 24; gy < room.y + room.h; gy += 24) ctx.fillRect(room.x, gy, room.w, 1);
  // Area rug
  if (room.rug) {
    const rx = room.x + room.w * 0.5,
      ry = room.y + room.h * 0.55;
    tint(ctx, rx - room.w * 0.32, ry - room.h * 0.22, room.w * 0.64, room.h * 0.44, room.rug, 0.5);
    ctx.strokeStyle = "rgba(40,30,20,0.25)";
    ctx.strokeRect((rx - room.w * 0.32) | 0, (ry - room.h * 0.22) | 0, (room.w * 0.64) | 0, (room.h * 0.44) | 0);
  }
  drawWalls(ctx, room);
}

// Drawn after all props so a label is never hidden behind furniture/windows.
function drawRoomLabel(ctx, room) {
  const lw = room.label.length * 6 + 14;
  ol(ctx, room.x + 10, room.y + 12, lw, 16, "#f6ecd2");
  rect(ctx, room.x + 10, room.y + 12, lw, 3, room.accent || "#caa44a");
  ctx.fillStyle = "#3a2c1d";
  ctx.font = "10px 'Courier New', monospace";
  ctx.textBaseline = "top";
  ctx.fillText(room.label, room.x + 14, room.y + 16);
}

// Draw room walls with a doorway gap on the given side.
function drawWalls(ctx, room) {
  const T = 7; // wall thickness
  const cap = "#6a4d31";
  const face = "#8a6442";
  const dark = "#4a3320";
  const d = room.door || {};
  const sides = ["top", "right", "bottom", "left"];
  for (const side of sides) {
    const gap = d.side === side ? { at: d.at, w: d.w } : null;
    if (side === "top") wallRun(ctx, room.x, room.y, room.w, T, true, gap, room.x, cap, face, dark);
    if (side === "bottom") wallRun(ctx, room.x, room.y + room.h - T, room.w, T, true, gap, room.x, cap, face, dark);
    if (side === "left") wallRun(ctx, room.x, room.y, T, room.h, false, gap, room.y, cap, face, dark);
    if (side === "right") wallRun(ctx, room.x + room.w - T, room.y, T, room.h, false, gap, room.y, cap, face, dark);
  }
}

function wallRun(ctx, x, y, w, h, horizontal, gap, origin, cap, face, dark) {
  const segs = [];
  if (gap) {
    const g0 = gap.at - gap.w / 2;
    const g1 = gap.at + gap.w / 2;
    if (horizontal) {
      segs.push([x, g0 - x]);
      segs.push([g1, x + w - g1]);
    } else {
      segs.push([y, g0 - y]);
      segs.push([g1, y + h - g1]);
    }
  } else {
    segs.push([horizontal ? x : y, horizontal ? w : h]);
  }
  for (const [start, len] of segs) {
    if (len <= 0) continue;
    if (horizontal) {
      rect(ctx, start, y, len, h, face);
      rect(ctx, start, y, len, 2, cap);
      rect(ctx, start, y + h - 1, len, 1, dark);
    } else {
      rect(ctx, x, start, w, len, face);
      rect(ctx, x, start, 2, len, cap);
      rect(ctx, x + w - 1, start, 1, len, dark);
    }
  }
  // Doorway frame posts + threshold
  if (gap) {
    const g0 = gap.at - gap.w / 2;
    const g1 = gap.at + gap.w / 2;
    if (horizontal) {
      rect(ctx, g0 - 2, y - 1, 3, h + 2, dark);
      rect(ctx, g1 - 1, y - 1, 3, h + 2, dark);
      rect(ctx, g0, y + 1, g1 - g0, h - 2, "#a98a5c"); // threshold mat
    } else {
      rect(ctx, x - 1, g0 - 2, w + 2, 3, dark);
      rect(ctx, x - 1, g1 - 1, w + 2, 3, dark);
      rect(ctx, x + 1, g0, w - 2, g1 - g0, "#a98a5c");
    }
  }
}

function drawProp(ctx, p) {
  switch (p.t) {
    case "longtable": {
      ol(ctx, p.x, p.y, p.w, p.h, "#9c6f43");
      rect(ctx, p.x + 3, p.y + 3, p.w - 6, 3, "rgba(255,240,210,0.3)");
      for (let i = p.x + 10; i < p.x + p.w - 6; i += 16) rect(ctx, i, p.y + 8, 1, p.h - 14, "rgba(80,50,25,0.25)");
      rect(ctx, p.x + 4, p.y + p.h, 4, 5, "#241a12");
      rect(ctx, p.x + p.w - 8, p.y + p.h, 4, 5, "#241a12");
      break;
    }
    case "workstation": {
      // desk + monitor + keyboard + chair
      const dy = p.dir === "u" ? p.y - 8 : p.y + 26;
      ol(ctx, p.x, p.y, 72, 26, "#8a5a34");
      rect(ctx, p.x + 3, p.y + 3, 66, 2, "rgba(255,240,210,0.25)");
      rect(ctx, p.x + 4, p.y + 26, 5, 6, "#241a12");
      rect(ctx, p.x + 63, p.y + 26, 5, 6, "#241a12");
      ol(ctx, p.x + 12, p.y - 16, 26, 18, "#2c2c34"); // monitor
      rect(ctx, p.x + 15, p.y - 13, 20, 12, "#7fd4e6");
      rect(ctx, p.x + 16, p.y - 12, 8, 3, "#cdeef5");
      rect(ctx, p.x + 23, p.y + 2, 4, 3, "#1c1c22");
      rect(ctx, p.x + 42, p.y + 6, 22, 8, "#3a3a44"); // keyboard
      for (let k = 0; k < 5; k++) rect(ctx, p.x + 44 + k * 4, p.y + 8, 2, 2, "#5a5a66");
      drawChairSprite(ctx, p.x + 28, dy, p.dir);
      break;
    }
    case "chair":
      drawChairSprite(ctx, p.x, p.y, p.dir);
      break;
    case "whiteboard": {
      ol(ctx, p.x, p.y, p.w, p.h, "#f4f1e6");
      rect(ctx, p.x + 5, p.y + 5, p.w - 40, 2, "#7aa2d6");
      rect(ctx, p.x + 5, p.y + 11, p.w - 20, 2, "#d6857a");
      rect(ctx, p.x + 5, p.y + 17, p.w - 60, 2, "#7ec08a");
      rect(ctx, p.x - 2, p.y + p.h, p.w + 4, 2, "#6a4d31");
      break;
    }
    case "couch": {
      ol(ctx, p.x, p.y, p.w, 40, "#6a7a8c");
      rect(ctx, p.x + 4, p.y + 6, p.w - 8, 16, "#8597a8");
      rect(ctx, p.x, p.y - 6, 10, 30, "#5a6a7c");
      rect(ctx, p.x + p.w - 10, p.y - 6, 10, 30, "#5a6a7c");
      break;
    }
    case "coffeeTable":
      ol(ctx, p.x, p.y, 56, 26, "#7a5636");
      rect(ctx, p.x + 6, p.y + 5, 16, 10, "#caa44a");
      break;
    case "safe": {
      ol(ctx, p.x, p.y, 40, 40, "#3c4450");
      ol(ctx, p.x + 5, p.y + 5, 30, 30, "#525c6a");
      ctx.fillStyle = "#e8c452";
      ctx.beginPath();
      ctx.arc(p.x + 18, p.y + 20, 5, 0, Math.PI * 2);
      ctx.fill();
      rect(ctx, p.x + 24, p.y + 18, 8, 3, "#c9a23f");
      break;
    }
    case "fileCabinet": {
      ol(ctx, p.x, p.y, 46, 62, "#b98a3e");
      for (let i = 0; i < 3; i++) {
        ol(ctx, p.x + 4, p.y + 6 + i * 18, 38, 14, "#cda152");
        rect(ctx, p.x + 18, p.y + 11 + i * 18, 10, 3, "#7a5a22");
      }
      break;
    }
    case "bookshelf": {
      ol(ctx, p.x, p.y, p.w, p.h, "#6b4a2e");
      const spines = ["#b85b4a", "#c9a23f", "#3f9d6b", "#3f6fb0", "#8a6fc0", "#d6857a", "#5fae8a"];
      for (let i = 4; i < p.w - 6; i += 7) rect(ctx, p.x + i, p.y + 4, 5, p.h - 8, spines[(i / 7 | 0) % spines.length]);
      rect(ctx, p.x + 2, p.y + p.h / 2, p.w - 4, 2, "#4a3320");
      break;
    }
    case "screen":
      ol(ctx, p.x, p.y, p.w, p.h, "#23303a");
      rect(ctx, p.x + 4, p.y + 4, p.w - 8, p.h - 8, "#5fb5c9");
      rect(ctx, p.x + 8, p.y + 7, p.w / 3, 3, "#bfe6ef");
      break;
    case "serverRack": {
      ol(ctx, p.x, p.y, 58, p.h, "#2a2e36");
      for (let i = 6; i < p.h - 10; i += 14) {
        rect(ctx, p.x + 5, p.y + i, 48, 9, "#3a4049");
        rect(ctx, p.x + 47, p.y + i + 2, 3, 3, i % 28 ? "#5fd07a" : "#e8c452");
        rect(ctx, p.x + 41, p.y + i + 2, 3, 3, "#5f9fd0");
        rect(ctx, p.x + 8, p.y + i + 3, 18, 2, "#23272e");
      }
      break;
    }
    case "toolbench": {
      ol(ctx, p.x, p.y, p.w, 28, "#7a5636");
      rect(ctx, p.x + 4, p.y + 4, p.w - 8, 3, "#9c7142");
      rect(ctx, p.x + 10, p.y + 12, 10, 8, "#9aa0a8");
      rect(ctx, p.x + 30, p.y + 10, 6, 12, "#caa44a");
      rect(ctx, p.x + p.w - 24, p.y + 12, 14, 6, "#bcbcc4");
      break;
    }
    case "printer3d": {
      ol(ctx, p.x, p.y, 38, 44, "#3a3f48");
      rect(ctx, p.x + 5, p.y + 6, 28, 22, "#1c2026");
      rect(ctx, p.x + 14, p.y + 14, 10, 10, "#5fd07a");
      rect(ctx, p.x + 5, p.y + 32, 28, 6, "#2a2e36");
      break;
    }
    case "toolrack": {
      ol(ctx, p.x, p.y, p.w, p.h, "#6b4a2e");
      rect(ctx, p.x + 6, p.y + 5, 4, p.h - 16, "#bcbcc4");
      rect(ctx, p.x + 16, p.y + 5, 3, p.h - 12, "#caa44a");
      rect(ctx, p.x + 26, p.y + 7, 8, 5, "#9aa0a8");
      rect(ctx, p.x + 40, p.y + 5, 4, p.h - 14, "#bcbcc4");
      break;
    }
    case "crate": {
      ol(ctx, p.x, p.y, 30, 24, "#c79a5c");
      rect(ctx, p.x + 3, p.y + 10, 24, 2, "#9c7338");
      rect(ctx, p.x + 13, p.y + 2, 4, 20, "#9c7338");
      break;
    }
    case "counter": {
      ol(ctx, p.x, p.y, p.w, 26, "#9aa0a8");
      rect(ctx, p.x + 3, p.y + 3, p.w - 6, 3, "#c4c8ce");
      rect(ctx, p.x + p.w - 30, p.y + 8, 16, 10, "#5f9fd0"); // sink
      break;
    }
    case "fridge":
      ol(ctx, p.x, p.y, 36, 56, "#dfe4ea");
      rect(ctx, p.x + 4, p.y + 26, 28, 2, "#9aa0a8");
      rect(ctx, p.x + 28, p.y + 8, 3, 12, "#9aa0a8");
      rect(ctx, p.x + 28, p.y + 32, 3, 12, "#9aa0a8");
      break;
    case "watercooler":
      ol(ctx, p.x, p.y, 22, 40, "#cfe8f0");
      rect(ctx, p.x + 4, p.y - 12, 14, 16, "#7fd4e6");
      rect(ctx, p.x + 6, p.y + 22, 10, 3, "#5f9fd0");
      break;
    case "plant": {
      rect(ctx, p.x + 4, p.y + 22, 18, 14, "#a8643c");
      rect(ctx, p.x + 5, p.y + 21, 16, 3, "#c47a4e");
      rect(ctx, p.x + 8, p.y + 2, 10, 22, "#3f8a4f");
      rect(ctx, p.x + 2, p.y + 8, 8, 14, "#357a45");
      rect(ctx, p.x + 16, p.y + 6, 8, 16, "#47985a");
      rect(ctx, p.x + 11, p.y - 2, 4, 8, "#52a565");
      break;
    }
    case "lamp":
      rect(ctx, p.x + 7, p.y + 6, 4, 30, "#3a3f48");
      ctx.fillStyle = "#f0d98a";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + 8);
      ctx.lineTo(p.x + 18, p.y + 8);
      ctx.lineTo(p.x + 13, p.y - 4);
      ctx.lineTo(p.x + 5, p.y - 4);
      ctx.closePath();
      ctx.fill();
      break;
    case "poster":
      ol(ctx, p.x, p.y, p.w, p.h, "#e9dfc6");
      rect(ctx, p.x + 4, p.y + 4, p.w - 8, p.h * 0.5, "#5f8fbf");
      rect(ctx, p.x + 4, p.y + p.h * 0.6, p.w - 8, 3, "#b06a52");
      break;
    case "window":
      ol(ctx, p.x, p.y, p.w, 24, "#bfe6ef");
      rect(ctx, p.x + p.w / 2 - 1, p.y, 2, 24, "#6a4d31");
      rect(ctx, p.x, p.y + 11, p.w, 2, "#6a4d31");
      break;
    case "stairsUp":
    case "stairsDown": {
      const up = p.t === "stairsUp";
      ol(ctx, p.x, p.y, 56, 56, "#7a6650");
      for (let i = 0; i < 5; i++) rect(ctx, p.x + 6 + i * 9, p.y + 6, 8, 44, up ? "#9a8a6a" : "#5a4a3a");
      ctx.fillStyle = "#f6ecd2";
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(up ? "▲ 2F" : "▼ B1", p.x + 8, p.y - 12);
      break;
    }
    case "rugRunner":
      tint(ctx, p.x + 6, p.y, p.w - 12, 28, "#9c6f43", 0.4);
      break;
    case "rugRunnerV":
      tint(ctx, p.x, p.y + 6, 28, p.h - 12, "#9c6f43", 0.4);
      break;
    case "rugDot":
      tint(ctx, p.x, p.y, 90, 50, "#caa44a", 0.3);
      break;
    default:
      break;
  }
}

function drawChairSprite(ctx, x, y, dir) {
  ol(ctx, x - 8, y, 16, 16, "#5a3f2a");
  rect(ctx, x - 6, y + 2, 12, 10, "#6e4f34");
  if (dir === "u") rect(ctx, x - 8, y, 16, 3, "#4a3320");
  else rect(ctx, x - 8, y + 13, 16, 3, "#4a3320");
}

// ---------------------------------------------------------------------------
// Character (drawn live each frame, in world space)
// ---------------------------------------------------------------------------

function drawCharacter(ctx, a) {
  const x = Math.round(a.x);
  const y = Math.round(a.y);
  const s = AGENT_STYLE[a.id] || AGENT_STYLE.claw;
  const walking = a.state === "walking";
  const f = walking ? Math.floor(a.anim * 7) % 4 : 0;
  const swing = f === 1 ? 2 : f === 3 ? -2 : 0;
  const bob = walking ? (f % 2 ? -1 : 0) : a.idleBob;
  const flip = a.facing === "left" ? -1 : 1;

  // shadow
  ctx.fillStyle = "rgba(30,20,12,0.28)";
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const top = y - 30 + bob;
  // legs + shoes
  rect(ctx, x - 6 + swing, top + 22, 5, 7, "#34302a");
  rect(ctx, x + 1 - swing, top + 22, 5, 7, "#34302a");
  rect(ctx, x - 7 + swing, top + 28, 6, 3, "#1c1813");
  rect(ctx, x + 1 - swing, top + 28, 6, 3, "#1c1813");
  // torso
  ol(ctx, x - 8, top + 10, 16, 14, s.shirt);
  rect(ctx, x - 7, top + 11, 14, 3, "rgba(255,255,255,0.18)");
  rect(ctx, x - 8, top + 21, 16, 3, s.shirtDark);
  // collar
  rect(ctx, x - 3, top + 10, 6, 3, "#f4ecd6");
  rect(ctx, x - 1, top + 10, 2, 5, s.shirtDark);
  // arms
  rect(ctx, x - 10, top + 11 + (walking ? -swing : 0), 3, 9, s.shirtDark);
  rect(ctx, x + 7, top + 11 + (walking ? swing : 0), 3, 9, s.shirtDark);
  rect(ctx, x - 10, top + 19 + (walking ? -swing : 0), 3, 3, s.skin); // hands
  rect(ctx, x + 7, top + 19 + (walking ? swing : 0), 3, 3, s.skin);
  // head
  rect(ctx, x - 2, top + 7, 4, 3, s.skin); // neck
  ol(ctx, x - 6, top - 4, 12, 13, s.skin);
  rect(ctx, x - 6, top + 4, 12, 5, "rgba(0,0,0,0.06)");
  // hair
  rect(ctx, x - 6, top - 4, 12, 4, s.hair);
  rect(ctx, x - 6, top - 4, 3, 8, s.hair);
  rect(ctx, x + 3, top - 4, 3, 8, s.hair);
  // face
  if (!a.blink) {
    const ex = a.facing === "left" ? -4 : a.facing === "right" ? 1 : -3;
    rect(ctx, x + ex, top + 1, 2, 3, "#23323a");
    if (a.facing === "down" || a.facing === "up") rect(ctx, x + 2, top + 1, 2, 3, "#23323a");
  } else {
    rect(ctx, x - 3, top + 2, 6, 1, "#23323a");
  }
  if (a.facing === "down" && !a.blink) rect(ctx, x - 2 * flip, top + 6, 3, 1, "rgba(120,70,60,0.5)"); // smile
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

const Office = {
  canvas: null,
  ctx: null,
  dpr: 1,
  holder: null,
  floor: 0,
  prerendered: [],
  cam: { x: 0, y: 0, zoom: 1, minZoom: 0.5, maxZoom: 4 },
  agents: {},
  order: ["claw", "ledger", "forge"],
  conversations: [],
  ambient: {},
  drag: null,
  lastT: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.holder = canvas.parentElement;
    const scene = SCENES[0];
    for (const id of this.order) {
      const h = scene.homes[id];
      this.agents[id] = {
        id, x: h.x, y: h.y, room: h.room, home: h,
        path: [], facing: "down", state: "idle", anim: 0, idleBob: 0,
        blink: false, blinkT: 1 + this.order.indexOf(id) * 0.6,
        role: "home", partner: null, pendingSpeech: "", speech: "", thought: "", bubbleEl: null, nameEl: null,
      };
    }
    this._bindInput();
    this.resize();
    window.addEventListener("resize", () => this.resize());
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
    this.cssW = r.width;
    this.cssH = r.height;
    this.ctx.imageSmoothingEnabled = false;
  },

  prerender(i) {
    const scene = SCENES[i];
    const off = document.createElement("canvas");
    off.width = scene.world.w;
    off.height = scene.world.h;
    const c = off.getContext("2d");
    c.imageSmoothingEnabled = false;
    drawFloorTiles(c, scene);
    // hallway floor
    if (scene.hallway) rect(c, scene.hallway.x, scene.hallway.y, scene.hallway.w, scene.hallway.h, "#c2a878");
    if (scene.vhall) rect(c, scene.vhall.x, scene.vhall.y, scene.vhall.w, scene.vhall.h, "#b8b29a");
    for (const room of scene.rooms) drawRoom(c, room);
    for (const p of scene.props) drawProp(c, p);
    for (const room of scene.rooms) drawRoomLabel(c, room);
    if (scene.empty) {
      const w = scene.empty.length * 6 + 18;
      ol(c, (scene.world.w - w) / 2, scene.world.h - 40, w, 22, "#f6ecd2");
      c.fillStyle = "#5a4632";
      c.font = "11px 'Courier New', monospace";
      c.textBaseline = "top";
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
    const scene = SCENES[this.floor];
    const z = Math.min(this.cssW / scene.world.w, this.cssH / scene.world.h) * 0.98;
    this.cam.minZoom = z * 0.85;
    this.cam.zoom = z;
    this.cam.x = scene.world.w / 2;
    this.cam.y = scene.world.h / 2;
    this.clampCam();
  },

  clampCam() {
    const s = SCENES[this.floor];
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(this.cam.maxZoom, this.cam.zoom));
    const halfW = this.cssW / 2 / this.cam.zoom;
    const halfH = this.cssH / 2 / this.cam.zoom;
    const pad = 120;
    this.cam.x = Math.max(-pad + halfW, Math.min(s.world.w + pad - halfW, this.cam.x));
    this.cam.y = Math.max(-pad + halfH, Math.min(s.world.h + pad - halfH, this.cam.y));
    if (s.world.w * this.cam.zoom <= this.cssW) this.cam.x = s.world.w / 2;
    if (s.world.h * this.cam.zoom <= this.cssH) this.cam.y = s.world.h / 2;
  },

  zoomBy(factor, cx, cy) {
    const px = cx == null ? this.cssW / 2 : cx;
    const py = cy == null ? this.cssH / 2 : cy;
    const before = this.screenToWorld(px, py);
    this.cam.zoom = Math.max(this.cam.minZoom, Math.min(this.cam.maxZoom, this.cam.zoom * factor));
    const after = this.screenToWorld(px, py);
    this.cam.x += before.x - after.x;
    this.cam.y += before.y - after.y;
    this.clampCam();
  },

  screenToWorld(sx, sy) {
    return { x: (sx - this.cssW / 2) / this.cam.zoom + this.cam.x, y: (sy - this.cssH / 2) / this.cam.zoom + this.cam.y };
  },
  worldToScreen(wx, wy) {
    return { x: (wx - this.cam.x) * this.cam.zoom + this.cssW / 2, y: (wy - this.cam.y) * this.cam.zoom + this.cssH / 2 };
  },

  setState(state) {
    this.conversations = (state.queue && state.queue.conversations) || [];
    this.ambient = state.__ambient || {};
    this.assign();
  },

  // Route from one room to another through the hallway/doorways.
  route(fromRoomIdx, toRoomIdx, dest) {
    const scene = SCENES[0];
    if (fromRoomIdx === toRoomIdx || fromRoomIdx == null || toRoomIdx == null) return [dest];
    const dp = (idx) => this.doorPoints(scene.rooms[idx]);
    const a = dp(fromRoomIdx);
    const b = dp(toRoomIdx);
    return [a.inner, a.hall, b.hall, b.inner, dest];
  },

  doorPoints(room) {
    const d = room.door;
    const hy = SCENES[0].hallY;
    const innerY = d.side === "bottom" ? room.y + room.h - 16 : room.y + 16;
    return { inner: { x: d.at, y: innerY }, hall: { x: d.at, y: hy } };
  },

  assign() {
    for (const id of this.order) {
      const a = this.agents[id];
      a.role = "home";
      a.partner = null;
    }
    const convo = this.conversations.find((c) => this.agents[c.from] && this.agents[c.to]);
    let changed = false;
    if (convo) {
      const from = this.agents[convo.from];
      const to = this.agents[convo.to];
      from.role = "approach";
      from.partner = to.id;
      from.pendingSpeech = convo.body || "…";
      to.role = "listen";
    }
    // (Re)compute paths from current intent.
    for (const id of this.order) {
      const a = this.agents[id];
      let dest, destRoom;
      if (a.role === "approach" && this.agents[a.partner]) {
        const p = this.agents[a.partner];
        destRoom = p.room;
        dest = { x: p.home.x + (p.home.x > 600 ? -34 : 34), y: p.home.y };
      } else {
        destRoom = a.home.room;
        dest = { x: a.home.x, y: a.home.y };
      }
      const key = `${destRoom}:${Math.round(dest.x)}:${Math.round(dest.y)}`;
      if (a._destKey !== key) {
        a._destKey = key;
        a.path = this.route(a.room, destRoom, dest);
        a._destRoom = destRoom;
      }
    }
  },

  update(dt) {
    for (const id of this.order) {
      const a = this.agents[id];
      if (a.path && a.path.length) {
        const tgt = a.path[0];
        const dx = tgt.x - a.x,
          dy = tgt.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) {
          a.path.shift();
          if (!a.path.length) {
            a.room = a._destRoom != null ? a._destRoom : a.room;
            a.state = a.role === "approach" ? "talking" : "idle";
          }
        } else {
          const step = Math.min(dist, 96 * dt);
          a.x += (dx / dist) * step;
          a.y += (dy / dist) * step;
          a.state = "walking";
          a.anim += dt;
          a.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
        }
      } else {
        a.state = a.role === "approach" || a.role === "listen" ? "talking" : "idle";
        if (a.role === "listen" && this.agents[a.partner]) {
          a.facing = this.agents[a.partner].x < a.x ? "left" : "right";
        }
      }
      a.idleBob = Math.sin(performance.now() / 360 + this.order.indexOf(id)) > 0.6 ? -1 : 0;
      a.blinkT -= dt;
      if (a.blinkT <= 0) {
        a.blink = true;
        if (a.blinkT < -0.12) {
          a.blink = false;
          a.blinkT = 2.4 + this.order.indexOf(id) * 0.8;
        }
      }
      // Speech held until arrival.
      const arrived = !a.path.length;
      if (a.role === "approach") {
        a.speech = arrived ? a.pendingSpeech : "";
        a.thought = arrived ? "" : "…";
      } else if (a.role === "listen") {
        a.speech = "";
        a.thought = "";
      } else {
        a.speech = this.ambient?.[id]?.speech || "";
        a.thought = this.ambient?.[id]?.thought || "";
      }
    }
  },

  render() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "#1a2030";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.translate(this.cssW / 2, this.cssH / 2);
    ctx.scale(this.cam.zoom, this.cam.zoom);
    ctx.translate(-this.cam.x, -this.cam.y);

    const off = this.prerendered[this.floor];
    if (off) ctx.drawImage(off, 0, 0);

    if (this.floor === 0) {
      const sorted = this.order.slice().sort((p, q) => this.agents[p].y - this.agents[q].y);
      for (const id of sorted) drawCharacter(ctx, this.agents[id]);
    }
    this.syncOverlays();
  },

  syncOverlays() {
    for (const id of this.order) {
      const a = this.agents[id];
      const onFloor = this.floor === 0;
      const offscreen = (sc) => sc.x < -60 || sc.x > this.cssW + 60 || sc.y < -40 || sc.y > this.cssH + 40;

      // Persistent name tag below the character's feet (never covered by a bubble).
      if (onFloor) {
        if (!a.nameEl) {
          a.nameEl = document.createElement("div");
          a.nameEl.className = "name-tag";
          a.nameEl.textContent = (AGENT_STYLE[id] || {}).name || id;
          this.holder.appendChild(a.nameEl);
        }
        const ns = this.worldToScreen(a.x, a.y + 12);
        a.nameEl.style.left = `${ns.x}px`;
        a.nameEl.style.top = `${ns.y}px`;
        a.nameEl.style.display = offscreen(ns) ? "none" : "block";
      } else if (a.nameEl) {
        a.nameEl.remove();
        a.nameEl = null;
      }

      // Speech / thought bubble above the head, shown only while talking.
      const visible = onFloor && (a.speech || a.thought);
      if (visible && !a.bubbleEl) {
        a.bubbleEl = document.createElement("div");
        a.bubbleEl.className = "speech-bubble";
        this.holder.appendChild(a.bubbleEl);
      }
      if (!visible) {
        if (a.bubbleEl) { a.bubbleEl.remove(); a.bubbleEl = null; }
        continue;
      }
      a.bubbleEl.textContent = a.speech || a.thought;
      a.bubbleEl.classList.toggle("thinking", !a.speech && Boolean(a.thought));
      const sc = this.worldToScreen(a.x, a.y - 34);
      a.bubbleEl.style.left = `${sc.x}px`;
      a.bubbleEl.style.top = `${sc.y}px`;
      a.bubbleEl.style.display = offscreen(sc) ? "none" : "block";
    }
  },

  // Screen position (holder px) just above an agent's head, for the pop-out card.
  agentScreenPos(id) {
    const a = this.agents[id];
    if (!a) return { x: 0, y: 0 };
    return this.worldToScreen(a.x, a.y - 30);
  },

  loop(t) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    this.update(dt);
    this.render();
    requestAnimationFrame((nt) => this.loop(nt));
  },

  _bindInput() {
    const cv = this.canvas;
    cv.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect();
      this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    cv.addEventListener("mousedown", (e) => {
      const r = cv.getBoundingClientRect();
      this.drag = { x: e.clientX, y: e.clientY, camX: this.cam.x, camY: this.cam.y, moved: false, sx: e.clientX - r.left, sy: e.clientY - r.top };
    });
    window.addEventListener("mousemove", (e) => {
      if (!this.drag) return;
      const ddx = e.clientX - this.drag.x;
      const ddy = e.clientY - this.drag.y;
      if (Math.abs(ddx) + Math.abs(ddy) > 3) this.drag.moved = true;
      this.cam.x = this.drag.camX - ddx / this.cam.zoom;
      this.cam.y = this.drag.camY - ddy / this.cam.zoom;
      this.clampCam();
      cv.style.cursor = "grabbing";
    });
    window.addEventListener("mouseup", (e) => {
      if (!this.drag) return;
      cv.style.cursor = "grab";
      if (!this.drag.moved) this._click(this.drag.sx, this.drag.sy);
      this.drag = null;
    });
    cv.style.cursor = "grab";
  },

  _click(sx, sy) {
    if (this.floor !== 0) {
      if (this.emptyCb) this.emptyCb();
      return;
    }
    const w = this.screenToWorld(sx, sy);
    let hit = null;
    for (const id of this.order) {
      const a = this.agents[id];
      if (Math.abs(w.x - a.x) < 14 && w.y > a.y - 34 && w.y < a.y + 8) hit = id;
    }
    if (hit && this.clickCb) this.clickCb(hit, this.agentScreenPos(hit));
    else if (this.emptyCb) this.emptyCb();
  },

  onAgentClick(cb) { this.clickCb = cb; },
  onEmptyClick(cb) { this.emptyCb = cb; },
};

window.Office = Office;
