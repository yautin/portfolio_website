import Phaser from "phaser";
import { sfx } from "../../audio";
import {
  PATHOGENS,
  TOTAL_LEVELS,
  RES,
  buildWave,
  bossForLevel,
  newUnitForLevel,
  setProgress,
  recordResult,
  starsForHearts,
  diff,
} from "../../td/defs";
import { Pathogen, Projectile } from "../../td/entities";

// Waves, spawning, combat resolution, and the per-frame defender/pathogen
// simulation. Mixed into GameScene.prototype — `this` is the scene.

const CONTACT = 34; // px: how close a pathogen must get to a defender to engage

export const combatMethods = {
  skipWait() { if (this.mode === "planning" || this.mode === "gap") this.startNextWave(); },

  startNextWave() {
    this.waveIndex += 1;
    this.mode = "wave";
    const events = buildWave(this.level, this.waveIndex - 1, this.lanes);
    this.waveTotal = events.length;
    this.waveSpawned = 0;
    let last = 0;
    events.forEach((e) => {
      last = Math.max(last, e.delay);
      this.time.delayedCall(e.delay, () => {
        if (this.mode !== "wave") return;
        this.spawnPathogen(e.type, e.lane);
        this.waveSpawned += 1;
      });
    });

    const isFinal = this.waveIndex >= this.totalWaves;
    if (isFinal && this.isBoss) {
      this.waveTotal += 1;
      this.time.delayedCall(last + 1600, () => { if (this.mode === "wave") { this.spawnBoss(); this.waveSpawned += 1; } });
      sfx.boss();
      this.showBanner("⚠ BOSS INCOMING", "#f25f5c");
    } else {
      sfx.waveStart();
      this.showBanner(isFinal ? "FINAL WAVE" : `WAVE ${this.waveIndex} / ${this.totalWaves}`, isFinal ? "#f25f5c" : "#e8ebf2");
    }
  },

  spawnPathogen(type, lane) {
    const def = PATHOGENS[type];
    const y = this.laneY(lane) - (def.fly ? 16 : 0);
    const p = new Pathogen(this, this.W + 30, y, def, lane);
    p.maxHp = Math.round(def.hp * diff().hpMul); p.hp = p.maxHp;
    p.baseSpeed = def.speed * diff().speedMul * (this.modifier?.speedMul || 1);
    p.refreshVelocity();
    if (def.fly) this.tweens.add({ targets: p, scaleX: 1.08 / RES, scaleY: 1.08 / RES, yoyo: true, repeat: -1, duration: 700, ease: "Sine.inOut" });
    this.pathogens.add(p);
  },

  spawnBoss() {
    const cfg = bossForLevel(this.level);
    const def = PATHOGENS[cfg.base];
    const lane = Math.floor(this.lanes / 2);
    const p = new Pathogen(this, this.W + 46, this.laneY(lane), def, lane);
    p.boss = true;
    p.maxHp = Math.round(def.hp * cfg.hpMul * diff().hpMul); p.hp = p.maxHp;
    p.baseSpeed = def.speed * diff().speedMul * 0.85; p.refreshVelocity();
    p.setScale(cfg.scale / RES).setDepth(5);
    this.pathogens.add(p);
    this.boss = p;
    this.bossName.setText(cfg.name);
    this.cameras.main.shake(260, 0.008);
  },

  levelComplete() {
    if (this.mode === "over") return;
    this.mode = "over";
    setProgress(this.level + 1);
    const stars = starsForHearts(this.hearts, this.maxHearts);
    const score = this.kills * 10 + this.hearts * 100 + this.level * 50;
    recordResult(this.level, stars, score);
    // Web3 easter egg: announce the beaten level so the /fun hub can offer a
    // token reward. No-op unless the reward feature is configured + signed in.
    window.dispatchEvent(new CustomEvent("game:levelcomplete", { detail: { gameId: "immune-defense", level: this.level } }));
    sfx.levelclear();
    const outcome = this.level >= TOTAL_LEVELS ? "victory" : "clear";
    const nextUnit = newUnitForLevel(this.level + 1);
    const unlocked = nextUnit ? nextUnit.key : null;
    this.time.delayedCall(750, () => this.scene.start("Interlude", { outcome, level: this.level, unlocked, stars, score }));
  },

  gameOver() {
    if (this.mode === "over") return;
    this.mode = "over";
    sfx.defeat();
    this.pathogens.getChildren().forEach((p) => p.setVelocityX(0));
    this.cameras.main.shake(320, 0.014);
    this.time.delayedCall(650, () => this.scene.start("Interlude", { outcome: "defeat", level: this.level }));
  },

  onHit(projectile, pathogen) {
    if (!projectile.active || !pathogen.active) return;
    const slowF = projectile.slowFactor, slowD = projectile.slowDuration, dmg = projectile.damage;
    projectile.destroy();
    this.burst(pathogen.x, pathogen.y, 0xbff0ff, 3, 10);
    sfx.hit();
    if (slowF < 1) pathogen.applySlow(slowF, slowD);
    if (pathogen.applyDamage(dmg)) { this.killPathogen(pathogen); return; }
    this.flash(pathogen);
    this.punch(pathogen);
  },

  flash(p) {
    p.setTintFill(0xffffff);
    this.time.delayedCall(45, () => { if (!p.active) return; p.isSlowed() ? p.setTint(0x9fd8ff) : p.clearTint(); });
  },

  punch(p) {
    if (p.punching || p.def.fly) return; // flyers already have an idle pulse
    p.punching = true;
    const s = p.scaleX;
    this.tweens.add({ targets: p, scaleX: s * 1.12, scaleY: s * 1.12, yoyo: true, duration: 55, onComplete: () => { if (p.active) p.setScale(s); p.punching = false; } });
  },

  killPathogen(p) {
    this.kills += 1;
    if (p.boss) { this.boss = null; this.cameras.main.shake(300, 0.012); this.explosionFx(p.x, p.y, 90, p.def.color); sfx.boss(); }
    this.burst(p.x, p.y, p.def.color, p.boss ? 26 : 12, p.boss ? 52 : 26);
    this.coinFly(p.x, p.y);
    this.floatText(p.x, p.y - 10, `+${p.def.bounty}`, "#4cc9f0", 700);
    this.atp += p.def.bounty;
    sfx.lyse();
    p.destroy();
  },

  breach(p) {
    if (p.boss) this.boss = null;
    this.hearts -= 1;
    sfx.breach();
    this.cameras.main.shake(180, 0.008);
    this.membrane.setFillStyle(0xf25f5c);
    this.tweens.add({ targets: this.membrane, alpha: 0.3, duration: 90, yoyo: true, onComplete: () => this.applyIntegrity() });
    this.burst(this.gridLeft, p.y, 0xf25f5c, 12, 28);
    p.destroy();
    if (this.hearts <= 0) this.gameOver();
  },

  fireShooter(d) {
    let target = null;
    this.pathogens.getChildren().forEach((p) => {
      if (!p.active || p.lane !== d.row || p.x <= d.x) return;
      if (!target || p.x < target.x) target = p;
    });
    if (!target) return false;
    const shots = d.def.shots || 1;
    for (let s = 0; s < shots; s++) {
      this.time.delayedCall(s * 120, () => {
        if (!d.active) return;
        this.projectiles.add(new Projectile(this, d.x + 14, d.y - 2, d.def));
      });
    }
    this.burst(d.x + 16, d.y - 2, d.def.color, 2, 8);
    sfx.shoot();
    return true;
  },

  aoeDamage(x, y, radius, dmg) {
    this.pathogens.getChildren().slice().forEach((p) => {
      if (!p.active) return;
      if (Phaser.Math.Distance.Between(x, y, p.x, p.y) <= radius) {
        if (p.applyDamage(dmg, true)) this.killPathogen(p);
        else this.flash(p);
      }
    });
  },

  detonate(d, radius, dmg, color, shake) {
    d.spent = true;
    sfx.explode();
    if (shake) this.cameras.main.shake(160, 0.006);
    this.explosionFx(d.x, d.y, radius, color);
    this.aoeDamage(d.x, d.y, radius, dmg);
    this.destroyDefender(d, false);
  },

  destroyDefender(d, withBurst = true) {
    const idx = this.cellIndex(d.col, d.row);
    if (this.cells[idx] === d) this.cells[idx] = null;
    if (d.upgradeMark) { d.upgradeMark.destroy(); d.upgradeMark = null; }
    if (this.upgradeFor === d) this.hideUpgradePrompt();
    if (withBurst) this.burst(d.x, d.y, d.def.color, 10, 22);
    d.destroy();
  },

  updateDefenders(delta) {
    for (const d of this.defenders) {
      if (!d.active || d.spent) continue;
      const role = d.def.role;
      if (role === "economy") {
        d.timer += delta;
        if (d.timer >= d.def.generateEvery) {
          d.timer -= d.def.generateEvery;
          this.atp += d.def.generate;
          this.floatText(d.x, d.y - 12, `+${d.def.generate}`, "#f4a259", 900);
          this.burst(d.x, d.y, 0xf4a259, 5, 14);
          sfx.atp();
        }
      } else if (role === "shoot") {
        d.timer += delta;
        if (d.timer >= d.def.fireRate) { if (this.fireShooter(d)) d.timer = 0; else d.timer = d.def.fireRate; }
      } else if (role === "bomb") {
        d.timer += delta;
        if (d.timer >= d.def.fuse) this.detonate(d, d.def.radius, d.def.damage, 0xff6b4a, true);
      } else if (role === "mine") {
        d.setAlpha(d.armed ? 0.7 + 0.3 * Math.abs(Math.sin(this.time.now / 200)) : 0.85);
      } else if (role === "chomp") {
        d.setAlpha(this.time.now < d.chewUntil ? 0.6 : 1);
      }
    }
  },

  updatePathogens(dt) {
    const pathos = this.pathogens.getChildren().slice();
    for (const p of pathos) {
      if (!p.active || p.vaulting) continue;
      p.tickMotion();

      // airborne pathogens ignore ground defenders entirely
      if (p.def.fly) {
        if (p.x <= this.gridLeft) this.breach(p);
        continue;
      }

      let front = null;
      for (const d of this.defenders) {
        if (!d.active || d.spent || d.row !== p.lane) continue;
        if (p.x > d.x && p.x - d.x < CONTACT && (!front || d.x > front.x)) front = d;
      }

      if (front) {
        if (p.def.vault && !p.vaulted) { this.vaultOver(p, front); continue; }
        p.setBlocked(true);
        this.resolveContact(p, front, dt);
        if (!p.active) continue;
      } else {
        p.setBlocked(false);
      }

      if (p.x <= this.gridLeft) this.breach(p);
    }
  },

  vaultOver(p, d) {
    p.vaulted = true; p.vaulting = true;
    if (p.body) p.body.enable = false;
    const targetX = d.x - this.colW * 0.85;
    const y0 = p.y;
    this.burst(p.x, p.y - 6, p.def.color, 5, 12);
    this.tweens.add({
      targets: p, x: targetX, duration: 430, ease: "Sine.inOut",
      onComplete: () => { if (!p.active) return; if (p.body) { p.body.enable = true; p.body.reset(p.x, p.y); } p.vaulting = false; p.setBlocked(false); },
    });
    this.tweens.add({ targets: p, y: y0 - 30, yoyo: true, duration: 215, ease: "Quad.out" });
  },

  resolveContact(p, d, dt) {
    const role = d.def.role;
    if (role === "mine") {
      if (d.armed) { this.detonate(d, d.def.splash, d.def.damage, 0xffe08a, false); return; }
      d.hp -= p.def.melee * dt;
    } else if (role === "chomp") {
      if (this.time.now >= d.chewUntil) {
        this.burst(d.x, d.y, 0xffffff, 8, 18);
        sfx.chomp();
        d.chewUntil = this.time.now + d.def.chewTime;
        if (p.applyDamage(d.def.biteDamage, true)) { this.killPathogen(p); return; }
      } else {
        d.hp -= p.def.melee * dt;
      }
    } else {
      d.hp -= p.def.melee * dt;
    }
    if (d.hp <= 0 && !d.spent) this.destroyDefender(d);
  },

  cullProjectiles() {
    this.projectiles.getChildren().slice().forEach((pr) => { if (pr.active && pr.x > this.W + 20) pr.destroy(); });
  },
};
