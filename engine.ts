import { LEVELS, type Level } from "./levels";

export const TILE = 36;
export const GRAVITY = 2100;
export const MOVE_SPEED = 250;
export const JUMP_SPEED = 900;

export type Enemy = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  flying: boolean;
  baseY: number;
  phase: number;
  alive: boolean;
  squashTimer: number;
};

export type Coin = { x: number; y: number; taken: boolean; phase: number };

export type World = {
  level: Level;
  grid: string[];
  cols: number;
  rows: number;
  player: {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    vy: number;
    onGround: boolean;
    face: 1 | -1;
    anim: number;
  };
  spawn: { x: number; y: number };
  enemies: Enemy[];
  coins: Coin[];
  goal: { x: number; y: number } | null;
  camera: number;
  status: "playing" | "dead" | "cleared";
  timer: number;
};

const SOLID = new Set(["#", "="]);

export function isSolidChar(c: string) {
  return SOLID.has(c);
}

export function buildWorld(levelIndex: number): World {
  const level = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIndex))] as Level;
  const width = Math.max(...level.rows.map((r) => r.length));
  const grid = level.rows.map((r) => r.padEnd(width, " "));
  const cols = width;
  const rows = grid.length;

  let spawn = { x: 2 * TILE, y: (rows - 4) * TILE };
  const enemies: Enemy[] = [];
  const coins: Coin[] = [];
  let goal: { x: number; y: number } | null = null;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = grid[r]![c]!;
      const x = c * TILE;
      const y = r * TILE;
      if (ch === "P") spawn = { x, y };
      else if (ch === "E")
        enemies.push({
          x: x + 3,
          y: y + 6,
          w: TILE - 6,
          h: TILE - 6,
          vx: 70,
          vy: 0,
          flying: false,
          baseY: y,
          phase: Math.random() * Math.PI * 2,
          alive: true,
          squashTimer: 0,
        });
      else if (ch === "B")
        enemies.push({
          x: x + 3,
          y: y + 4,
          w: TILE - 8,
          h: TILE - 12,
          vx: 95,
          vy: 0,
          flying: true,
          baseY: y + 4,
          phase: Math.random() * Math.PI * 2,
          alive: true,
          squashTimer: 0,
        });
      else if (ch === "o") coins.push({ x, y, taken: false, phase: Math.random() * 6 });
      else if (ch === "T") goal = { x, y };
    }
  }

  // Sem marcador 'P': procura o primeiro chão livre à esquerda do mapa
  if (!level.rows.some((r) => r.includes("P"))) {
    outer: for (let c = 1; c < Math.min(cols, 12); c++) {
      for (let r = 1; r < rows; r++) {
        const here = grid[r]![c]!;
        const above = grid[r - 1]![c]!;
        if (SOLID.has(here) && !SOLID.has(above) && r - 2 >= 0 && !SOLID.has(grid[r - 2]![c]!)) {
          spawn = { x: c * TILE + 4, y: (r - 1) * TILE + 2 };
          break outer;
        }
      }
    }
  }

  return {
    level,
    grid,
    cols,
    rows,
    player: {
      x: spawn.x,
      y: spawn.y,
      w: 24,
      h: 34,
      vx: 0,
      vy: 0,
      onGround: false,
      face: 1,
      anim: 0,
    },
    spawn,
    enemies,
    coins,
    goal,
    camera: 0,
    status: "playing",
    timer: 0,
  };
}

export function tileAt(w: World, col: number, row: number): string {
  if (row < 0 || row >= w.rows) return " ";
  if (col < 0 || col >= w.cols) return "#"; // paredes invisíveis nas bordas
  return w.grid[row]![col] ?? " ";
}

function solidAtPoint(w: World, x: number, y: number) {
  return isSolidChar(tileAt(w, Math.floor(x / TILE), Math.floor(y / TILE)));
}

type Box = { x: number; y: number; w: number; h: number };

function collideAxis(w: World, box: Box, dx: number, dy: number) {
  let hitX = false;
  let hitY = false;

  box.x += dx;
  const cornersX: [number, number][] = [
    [box.x, box.y + 1],
    [box.x + box.w, box.y + 1],
    [box.x, box.y + box.h / 2],
    [box.x + box.w, box.y + box.h / 2],
    [box.x, box.y + box.h - 1],
    [box.x + box.w, box.y + box.h - 1],
  ];
  for (const [px, py] of cornersX) {
    if (solidAtPoint(w, px, py)) {
      hitX = true;
      if (dx > 0) box.x = Math.floor(px / TILE) * TILE - box.w - 0.01;
      else if (dx < 0) box.x = (Math.floor(px / TILE) + 1) * TILE + 0.01;
      break;
    }
  }

  box.y += dy;
  const cornersY: [number, number][] = [
    [box.x + 1, box.y],
    [box.x + box.w - 1, box.y],
    [box.x + box.w / 2, box.y],
    [box.x + 1, box.y + box.h],
    [box.x + box.w - 1, box.y + box.h],
    [box.x + box.w / 2, box.y + box.h],
  ];
  for (const [px, py] of cornersY) {
    if (solidAtPoint(w, px, py)) {
      hitY = true;
      if (dy > 0) box.y = Math.floor(py / TILE) * TILE - box.h - 0.01;
      else if (dy < 0) box.y = (Math.floor(py / TILE) + 1) * TILE + 0.01;
      break;
    }
  }

  return { hitX, hitY };
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hazardTouch(w: World, box: Box) {
  const c0 = Math.floor(box.x / TILE);
  const c1 = Math.floor((box.x + box.w) / TILE);
  const r0 = Math.floor(box.y / TILE);
  const r1 = Math.floor((box.y + box.h) / TILE);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const ch = tileAt(w, c, r);
      if (ch === "^" || ch === "~") return true;
    }
  }
  return false;
}

export type Input = { left: boolean; right: boolean; jump: boolean };

export type StepResult = { died: boolean; cleared: boolean; coinsGot: number };

export function step(w: World, input: Input, dtRaw: number): StepResult {
  const dt = Math.min(dtRaw, 1 / 30);
  const result: StepResult = { died: false, cleared: false, coinsGot: 0 };
  w.timer += dt;
  if (w.status !== "playing") return result;

  const p = w.player;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.vx = dir * MOVE_SPEED;
  if (dir !== 0) p.face = dir as 1 | -1;
  p.anim += Math.abs(p.vx) * dt * 0.05;

  if (input.jump && p.onGround) {
    p.vy = -JUMP_SPEED;
    p.onGround = false;
  }
  if (!input.jump && p.vy < -220) p.vy = -220; // pulo curto ao soltar

  p.vy = Math.min(p.vy + GRAVITY * dt, 1200);

  const box: Box = { x: p.x, y: p.y, w: p.w, h: p.h };
  const hit = collideAxis(w, box, p.vx * dt, p.vy * dt);
  p.x = box.x;
  p.y = box.y;
  if (hit.hitY) {
    if (p.vy > 0) p.onGround = true;
    p.vy = 0;
  } else {
    p.onGround = false;
  }
  if (hit.hitX) p.vx = 0;
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > w.cols * TILE) p.x = w.cols * TILE - p.w;

  // moedas
  for (const coin of w.coins) {
    if (coin.taken) continue;
    if (
      overlaps(
        { x: p.x, y: p.y, w: p.w, h: p.h },
        { x: coin.x + 8, y: coin.y + 8, w: TILE - 16, h: TILE - 16 },
      )
    ) {
      coin.taken = true;
      result.coinsGot++;
    }
  }

  // inimigos
  for (const e of w.enemies) {
    if (!e.alive) {
      e.squashTimer = Math.max(0, e.squashTimer - dt);
      continue;
    }
    if (e.flying) {
      e.phase += dt * 2.2;
      e.x += e.vx * dt;
      const ahead = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      if (solidAtPoint(w, ahead, e.y + e.h / 2) || e.x < 0 || e.x + e.w > w.cols * TILE) {
        e.vx *= -1;
        e.x += e.vx * dt * 2;
      }
      e.y = e.baseY + Math.sin(e.phase) * 26;
    } else {
      const eb: Box = { x: e.x, y: e.y, w: e.w, h: e.h };
      e.vy = Math.min(e.vy + GRAVITY * dt, 1200);
      const eh = collideAxis(w, eb, e.vx * dt, e.vy * dt);
      e.x = eb.x;
      e.y = eb.y;
      if (eh.hitY) e.vy = 0;
      // vira ao bater na parede ou ao chegar na beirada
      const footX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
      const groundAhead = solidAtPoint(w, footX, e.y + e.h + 4);
      if (eh.hitX || !groundAhead) {
        e.vx *= -1;
        e.x += e.vx * dt * 2;
      }
    }

    const pb: Box = { x: p.x, y: p.y, w: p.w, h: p.h };
    const ebox: Box = { x: e.x, y: e.y, w: e.w, h: e.h };
    if (overlaps(pb, ebox)) {
      const stomping = p.vy > 60 && p.y + p.h - e.y < 22;
      if (stomping && !e.flying) {
        e.alive = false;
        e.squashTimer = 0.4;
        p.vy = -JUMP_SPEED * 0.6;
      } else {
        result.died = true;
      }
    }
  }

  // espinhos, lava e queda no vazio
  if (hazardTouch(w, { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 6 })) result.died = true;
  if (p.y > w.rows * TILE + 200) result.died = true;

  // tesouro / saída
  if (
    w.goal &&
    overlaps(
      { x: p.x, y: p.y, w: p.w, h: p.h },
      { x: w.goal.x, y: w.goal.y - 4, w: TILE, h: TILE + 8 },
    )
  ) {
    result.cleared = true;
  }

  if (result.died) w.status = "dead";
  if (result.cleared) w.status = "cleared";
  return result;
}

export const LEVEL_COUNT = LEVELS.length;
