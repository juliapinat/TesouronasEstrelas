import { TILE, type World } from "./engine";

export function draw(ctx: CanvasRenderingContext2D, w: World, vw: number, vh: number) {
  const [skyTop, skyBottom] = w.level.sky;
  const g = ctx.createLinearGradient(0, 0, 0, vh);
  g.addColorStop(0, skyTop);
  g.addColorStop(1, skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  // câmera
  const maxCam = Math.max(0, w.cols * TILE - vw);
  const target = w.player.x + w.player.w / 2 - vw / 2;
  w.camera = Math.max(0, Math.min(maxCam, target));
  const cam = Math.round(w.camera);

  // montanhas de fundo (parallax)
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  for (let i = 0; i < 12; i++) {
    const bx = i * 260 - (cam * 0.3) % 260;
    ctx.beginPath();
    ctx.moveTo(bx - 130, vh);
    ctx.lineTo(bx, vh - 190);
    ctx.lineTo(bx + 130, vh);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(-cam, 0);

  const c0 = Math.floor(cam / TILE) - 1;
  const c1 = Math.ceil((cam + vw) / TILE) + 1;

  for (let r = 0; r < w.rows; r++) {
    for (let c = Math.max(0, c0); c < Math.min(w.cols, c1); c++) {
      const ch = w.grid[r]![c]!;
      const x = c * TILE;
      const y = r * TILE;
      if (ch === "#") {
        ctx.fillStyle = "#6b4226";
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = "#4e2f1b";
        ctx.fillRect(x, y + TILE - 6, TILE, 6);
        const above = r > 0 ? w.grid[r - 1]![c]! : " ";
        if (above !== "#" && above !== "=") {
          ctx.fillStyle = "#3fa64a";
          ctx.fillRect(x, y, TILE, 8);
        }
      } else if (ch === "=") {
        ctx.fillStyle = "#c98a3c";
        ctx.fillRect(x, y, TILE, TILE * 0.55);
        ctx.fillStyle = "#8d5a22";
        ctx.fillRect(x, y + TILE * 0.55 - 5, TILE, 5);
      } else if (ch === "^") {
        ctx.fillStyle = "#d8dee9";
        for (let k = 0; k < 3; k++) {
          const sx = x + k * (TILE / 3);
          ctx.beginPath();
          ctx.moveTo(sx, y + TILE);
          ctx.lineTo(sx + TILE / 6, y + TILE * 0.25);
          ctx.lineTo(sx + TILE / 3, y + TILE);
          ctx.closePath();
          ctx.fill();
        }
      } else if (ch === "~") {
        const wob = Math.sin(w.timer * 4 + c) * 3;
        ctx.fillStyle = "#e0522d";
        ctx.fillRect(x, y + 6 + wob, TILE, TILE - 6 - wob);
        ctx.fillStyle = "#ffb03a";
        ctx.fillRect(x, y + 6 + wob, TILE, 5);
      }
    }
  }

  // moedas (gemas)
  for (const coin of w.coins) {
    if (coin.taken) continue;
    const cx = coin.x + TILE / 2;
    const cy = coin.y + TILE / 2 + Math.sin(w.timer * 3 + coin.phase) * 4;
    ctx.fillStyle = "#ffd447";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.lineTo(cx + 9, cy);
    ctx.lineTo(cx, cy + 11);
    ctx.lineTo(cx - 9, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff3b0";
    ctx.fillRect(cx - 3, cy - 5, 3, 8);
  }

  // tesouro
  if (w.goal) {
    const gx = w.goal.x;
    const gy = w.goal.y + Math.sin(w.timer * 2) * 3;
    ctx.fillStyle = "#7a4a1d";
    ctx.fillRect(gx + 2, gy + 12, TILE - 4, TILE - 14);
    ctx.fillStyle = "#a9691f";
    ctx.fillRect(gx + 2, gy + 6, TILE - 4, 10);
    ctx.fillStyle = "#ffd447";
    ctx.fillRect(gx + TILE / 2 - 4, gy + 16, 8, 8);
    ctx.fillStyle = "rgba(255,212,71,0.35)";
    ctx.beginPath();
    ctx.arc(gx + TILE / 2, gy + TILE / 2, 26 + Math.sin(w.timer * 3) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // inimigos
  for (const e of w.enemies) {
    if (!e.alive) {
      if (e.squashTimer > 0) {
        ctx.fillStyle = "rgba(120,70,140,0.6)";
        ctx.fillRect(e.x, e.y + e.h - 8, e.w, 8);
      }
      continue;
    }
    if (e.flying) {
      const flap = Math.sin(w.timer * 14) * 8;
      ctx.fillStyle = "#3c2a5a";
      ctx.beginPath();
      ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.h / 2);
      ctx.lineTo(e.x - 16, e.y + e.h / 2 + flap);
      ctx.lineTo(e.x, e.y + e.h / 2 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x + e.w, e.y + e.h / 2);
      ctx.lineTo(e.x + e.w + 16, e.y + e.h / 2 + flap);
      ctx.lineTo(e.x + e.w, e.y + e.h / 2 + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffe066";
      ctx.fillRect(e.x + 7, e.y + 8, 4, 4);
      ctx.fillRect(e.x + e.w - 11, e.y + 8, 4, 4);
    } else {
      ctx.fillStyle = "#8e44ad";
      ctx.beginPath();
      ctx.arc(e.x + e.w / 2, e.y + e.h / 2 - 2, e.w / 2, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(e.x, e.y + e.h / 2 - 2, e.w, e.h / 2);
      ctx.fillStyle = "#f5e6c8";
      ctx.fillRect(e.x + 4, e.y + e.h - 8, e.w - 8, 8);
      ctx.fillStyle = "#1b1b1b";
      ctx.fillRect(e.x + 7, e.y + e.h / 2 - 1, 4, 5);
      ctx.fillRect(e.x + e.w - 11, e.y + e.h / 2 - 1, 4, 5);
    }
  }

  // personagem: Nina, a exploradora
  const p = w.player;
  const bob = p.onGround ? Math.sin(p.anim) * 2 : 0;
  const px = Math.round(p.x);
  const py = Math.round(p.y + bob);
  ctx.save();
  ctx.translate(px + p.w / 2, py);
  ctx.scale(p.face, 1);
  ctx.translate(-p.w / 2, 0);
  // pernas
  ctx.fillStyle = "#274472";
  const legSwing = p.onGround ? Math.sin(p.anim * 2) * 4 : 3;
  ctx.fillRect(3, p.h - 10, 8, 10 + legSwing * 0.2);
  ctx.fillRect(p.w - 11, p.h - 10, 8, 10 - legSwing * 0.2);
  // corpo
  ctx.fillStyle = "#e8533f";
  ctx.fillRect(1, 12, p.w - 2, p.h - 20);
  // mochila
  ctx.fillStyle = "#7a5230";
  ctx.fillRect(-3, 14, 5, 12);
  // cabeça
  ctx.fillStyle = "#f3c79a";
  ctx.fillRect(3, 1, p.w - 6, 12);
  // chapéu
  ctx.fillStyle = "#6b4226";
  ctx.fillRect(0, 0, p.w, 4);
  ctx.fillRect(4, -4, p.w - 8, 5);
  // olho
  ctx.fillStyle = "#1b1b1b";
  ctx.fillRect(p.w - 10, 6, 3, 3);
  ctx.restore();

  ctx.restore();
}
