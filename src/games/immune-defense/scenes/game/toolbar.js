import { sfx } from "../../audio";
import { GRID, DEFENDERS, DEFENDER_ORDER, RES, TUTORIAL_KEY } from "../../td/defs";
import { redrawRoundRect } from "../../ui";

// Bottom toolbar: the defender card row, its per-frame repaint, the "can't
// afford" shake, and the first-run tutorial pointer. Mixed into
// GameScene.prototype — `this` is the scene.

const FONT = "'Mona Sans', system-ui, sans-serif";

export const toolbarMethods = {
  buildToolbar() {
    const { W, H } = this;
    const n = DEFENDER_ORDER.length;
    const cardW = 116, cardH = 52, gap = 8;
    const total = n * cardW + (n - 1) * gap;
    const startX = (W - total) / 2;
    const cy = H - GRID.toolbar / 2;

    this.add.rectangle(0, this.playBottom, W, GRID.toolbar, 0x0d0f14, 0.9).setOrigin(0, 0).setDepth(15);
    this.add.rectangle(0, this.playBottom, W, 1, 0xffffff, 0.06).setOrigin(0, 0).setDepth(15);

    this.tip = this.add.text(0, 0, "", { resolution: RES, fontFamily: FONT, fontSize: "12px", color: "#e8ebf2", backgroundColor: "#1b2130", padding: { x: 7, y: 4 } })
      .setOrigin(0.5, 1).setDepth(30).setVisible(false);

    this.cards = DEFENDER_ORDER.map((key, i) => {
      const def = DEFENDERS[key];
      const locked = !this.units.includes(key);
      const cx = startX + i * (cardW + gap) + cardW / 2;
      const lx = -cardW / 2;

      const bgG = this.add.graphics();
      const icon = this.add.image(lx + 24, 0, def.texture).setDisplaySize(32, 32);
      const nameT = this.add.text(lx + 43, -10, def.shortName, { resolution: RES, fontFamily: FONT, fontSize: "11px", fontStyle: "700", color: "#e8ebf2" }).setOrigin(0, 0.5);
      const dot = this.add.image(lx + 46, 10, "dot").setTint(0x4cc9f0).setDisplaySize(7, 7);
      const costT = this.add.text(lx + 54, 10, `${def.cost}`, { resolution: RES, fontFamily: FONT, fontSize: "12px", fontStyle: "700", color: "#8b97ad" }).setOrigin(0, 0.5);
      this.add.text(cardW / 2 - 9, -cardH / 2 + 9, `${i + 1}`, { resolution: RES, fontFamily: FONT, fontSize: "10px", color: "#5c6b82" }).setOrigin(0.5);
      const cdbar = this.add.rectangle(lx + 6, cardH / 2 - 5, cardW - 12, 3, 0x4cc9f0).setOrigin(0, 0.5).setScale(0, 1).setVisible(false);

      const children = [bgG, icon, nameT, dot, costT, cdbar];

      if (locked) {
        nameT.setVisible(false); dot.setVisible(false); costT.setVisible(false);
        icon.setAlpha(0.35).setTint(0x6b7688);
        const lock = this.add.graphics();
        lock.fillStyle(0x8b97ad, 1).fillRoundedRect(lx + 40, -2, 12, 9, 2);
        lock.lineStyle(2, 0x8b97ad, 1);
        lock.beginPath(); lock.arc(lx + 46, -2, 4, Math.PI, 0); lock.strokePath();
        const lvT = this.add.text(lx + 60, 0, `Lv ${i + 1}`, { resolution: RES, fontFamily: FONT, fontSize: "11px", fontStyle: "700", color: "#5c6b82" }).setOrigin(0, 0.5);
        children.push(lock, lvT);
      } else {
        const hit = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => this.selectCard(key));
        hit.on("pointerover", () => this.tip.setText(def.name).setPosition(cx, cy - cardH / 2 - 8).setVisible(true));
        hit.on("pointerout", () => this.tip.setVisible(false));
        children.push(hit);
      }

      const container = this.add.container(cx, cy, children).setDepth(16);
      return { key, def, container, bgG, icon, costT, cdbar, locked, cardW, cardH, baseX: cx, baseY: cy, cdEnd: 0 };
    });

    this.cards.forEach((c) => this.paintCard(c));
  },

  paintCard(card) {
    const { bgG, cardW, cardH } = card;
    if (card.locked) {
      redrawRoundRect(bgG, cardW, cardH, 9, { fill: 0x141922, fillAlpha: 0.6, stroke: 0x232a36, strokeW: 1.5 });
      card.container.setAlpha(0.55);
      return;
    }
    const now = this.time.now;
    const remaining = Math.max(0, card.cdEnd - now);
    const ready = remaining === 0;
    const affordable = this.atp >= card.def.cost;
    const usable = ready && affordable;
    const selected = this.selected === card.key;

    redrawRoundRect(bgG, cardW, cardH, 9, {
      fill: selected ? 0x22344a : 0x1b2130, stroke: selected ? 0x4cc9f0 : 0x2b3345, strokeW: selected ? 2 : 1.5, highlight: true,
    });
    card.container.setAlpha(usable ? 1 : 0.62);
    card.container.y = card.baseY - (selected ? 4 : 0);
    card.icon.setAlpha(usable ? 1 : 0.6);
    card.costT.setColor(affordable ? "#8b97ad" : "#f25f5c");
    if (remaining > 0) card.cdbar.setVisible(true).setScale(1 - remaining / card.def.cooldown, 1);
    else card.cdbar.setVisible(false);
  },

  updateCards() {
    for (const card of this.cards) if (!card.locked) this.paintCard(card);
  },

  nope(card) {
    sfx.nope();
    // anchor the shake to the card's home x — overlapping shakes must never
    // capture an already-displaced position or the card drifts permanently
    this.tweens.killTweensOf(card.container);
    card.container.x = card.baseX;
    this.tweens.add({
      targets: card.container,
      x: card.baseX + 4,
      duration: 45,
      yoyo: true,
      repeat: 3,
      onComplete: () => { card.container.x = card.baseX; },
      onStop: () => { card.container.x = card.baseX; },
    });
  },

  showTutorial() {
    const firstX = this.cards[0].container.x;
    this.tutorArrow = this.add.text(firstX, this.playBottom - 4, "▼", { resolution: RES, fontFamily: FONT, fontSize: "22px", fontStyle: "800", color: "#4cc9f0" })
      .setOrigin(0.5, 1).setDepth(21);
    this.tweens.add({ targets: this.tutorArrow, y: this.tutorArrow.y - 8, yoyo: true, repeat: -1, duration: 500, ease: "Sine.inOut" });
    this.tutorText = this.add.text(this.W / 2, this.playBottom - 34, "Tap a defender, then tap a lane cell to place it", {
      resolution: RES, fontFamily: FONT, fontSize: "13px", fontStyle: "700", color: "#e8ebf2", backgroundColor: "#1b2130cc", padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setDepth(21);
  },

  endTutorial() {
    this.tutorial = false;
    localStorage.setItem(TUTORIAL_KEY, "1");
    [this.tutorArrow, this.tutorText].forEach((o) => o && this.tweens.add({ targets: o, alpha: 0, duration: 300, onComplete: () => o.destroy() }));
    this.tutorArrow = this.tutorText = null;
  },
};
