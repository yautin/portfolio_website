import Phaser from "phaser";
import { HUD_H, MARGIN } from "./constants";

// Pointer/keyboard wiring and the pan-zoom camera work: tap vs long-press vs
// drag disambiguation, two-finger pinch, wheel zoom, and keeping the transformed
// board inside the play area. Mixed into GameScene.prototype — `this` is the
// scene.

export const inputMethods = {
  wireInput() {
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(2); // track a second finger for pinch

    this.input.on("pointerdown", (p) => {
      if (this.ended) return;
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1?.isDown && p2?.isDown) { this.beginPinch(); return; } // second finger → pinch
      const cell = this.cellAt(p.worldX, p.worldY);
      this._down = cell ? { ...cell, right: p.rightButtonDown(), moved: false } : null;
      this._downX = p.worldX; this._downY = p.worldY;
      this._panLastX = p.worldX; this._panLastY = p.worldY;
      this._panning = false;
      this._longFired = false;
      if (cell && !p.rightButtonDown() && !this.scanArmed) {
        this._lpTimer = this.time.delayedCall(360, () => {
          if (this._down && !this._down.moved && !this._panning) { this._longFired = true; this.toggleFlag(this._down.r, this._down.c); }
        });
      }
    });

    this.input.on("pointermove", (p) => {
      if (this._pinching) { this.updatePinch(); return; }
      // one-finger drag-pan — only when zoomed in (board fully visible at 1×)
      if (this._down && p.isDown && this.board.scaleX > 1.001) {
        if (!this._panning && Math.hypot(p.worldX - this._downX, p.worldY - this._downY) > 8) {
          this._panning = true; this._down.moved = true;
          if (this._lpTimer) { this._lpTimer.remove(false); this._lpTimer = null; }
          this.hoverGfx.clear();
        }
        if (this._panning) {
          this.board.x += p.worldX - this._panLastX;
          this.board.y += p.worldY - this._panLastY;
          this._panLastX = p.worldX; this._panLastY = p.worldY;
          this.clampBoard();
          return;
        }
      }
      const cell = this.cellAt(p.worldX, p.worldY);
      this.drawHover(cell);
      if (this._down && (!cell || cell.r !== this._down.r || cell.c !== this._down.c)) this._down.moved = true;
    });

    this.input.on("pointerup", (p) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (this._pinching && !(p1?.isDown && p2?.isDown)) { // dropped below two fingers
        this._pinching = false; this._pinch = null;
        const rem = p1?.isDown ? p1 : p2?.isDown ? p2 : null; // hand off to remaining finger
        if (rem) { this._panLastX = rem.worldX; this._panLastY = rem.worldY; }
      }
      if (this._lpTimer) { this._lpTimer.remove(false); this._lpTimer = null; }
      const d = this._down; this._down = null;
      const wasPan = this._panning;
      const anyDown = !!(p1?.isDown || p2?.isDown);
      if (!anyDown) this._panning = false;
      if (this.ended) { this._longFired = false; return; }
      if (this._longFired) { this._longFired = false; return; }
      if (wasPan || anyDown || !d) return; // a pan / still mid-gesture / off-board
      const cell = this.cellAt(p.worldX, p.worldY);
      if (!cell || cell.r !== d.r || cell.c !== d.c) return;
      if (this.scanArmed) { this.doScan(cell.r, cell.c); return; }
      if (d.right || p.rightButtonReleased()) { this.toggleFlag(cell.r, cell.c); return; }
      this.leftClick(cell.r, cell.c);
    });

    // desktop: wheel zooms about the cursor
    this.input.on("wheel", (p, _o, _dx, dy) => {
      this.setZoom(this.board.scaleX * (dy > 0 ? 0.9 : 1.1), p.worldX, p.worldY);
    });
  },

  // ---- pan / zoom -----------------------------------------------------
  setZoom(z, fx, fy) {
    z = Phaser.Math.Clamp(z, 1, 4);
    const oldZ = this.board.scaleX;
    const lx = (fx - this.board.x) / oldZ, ly = (fy - this.board.y) / oldZ;
    this.board.setScale(z);
    this.board.x = fx - lx * z;
    this.board.y = fy - ly * z;
    this.clampBoard();
  },

  pinchInfo() {
    const p1 = this.input.pointer1, p2 = this.input.pointer2;
    if (!p1?.isDown || !p2?.isDown) return null;
    return {
      dist: Phaser.Math.Distance.Between(p1.worldX, p1.worldY, p2.worldX, p2.worldY),
      mx: (p1.worldX + p2.worldX) / 2,
      my: (p1.worldY + p2.worldY) / 2,
    };
  },

  beginPinch() {
    const info = this.pinchInfo();
    if (!info) return;
    this._pinch = { d0: info.dist, z0: this.board.scaleX, mx0: info.mx, my0: info.my, bx0: this.board.x, by0: this.board.y };
    this._pinching = true;
    this._down = null; this._panning = false;
    if (this._lpTimer) { this._lpTimer.remove(false); this._lpTimer = null; }
    this.hoverGfx.clear();
  },

  updatePinch() {
    const info = this.pinchInfo();
    if (!info || !this._pinch) return;
    const pn = this._pinch;
    const z = Phaser.Math.Clamp(pn.z0 * (info.dist / pn.d0), 1, 4);
    // the local point under the initial midpoint, re-pinned to the current
    // midpoint => focal zoom + two-finger pan together.
    const lx = (pn.mx0 - pn.bx0) / pn.z0, ly = (pn.my0 - pn.by0) / pn.z0;
    this.board.setScale(z);
    this.board.x = info.mx - lx * z;
    this.board.y = info.my - ly * z;
    this.clampBoard();
  },

  // Keep the scaled board covering the play area (centred when it fits, bounded
  // so it can't be dragged into empty space).
  clampBoard() {
    const z = this.board.scaleX;
    const availL = MARGIN, availR = this.W - MARGIN, availT = HUD_H, availB = this.H - MARGIN;
    const availW = availR - availL, availH = availB - availT;
    const bw = this.cols * this.cs * z, bh = this.rows * this.cs * z;
    const wl = this.board.x + this.boardX * z, wt = this.board.y + this.boardY * z;
    if (bw <= availW) this.board.x = availL + (availW - bw) / 2 - this.boardX * z;
    else this.board.x += (wl > availL ? availL - wl : 0) + (wl + bw < availR ? availR - (wl + bw) : 0);
    if (bh <= availH) this.board.y = availT + (availH - bh) / 2 - this.boardY * z;
    else this.board.y += (wt > availT ? availT - wt : 0) + (wt + bh < availB ? availB - (wt + bh) : 0);
  },
};
