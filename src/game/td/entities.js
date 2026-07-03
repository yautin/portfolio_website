import Phaser from "phaser";

// Light entity classes. The scene owns FX, collisions and the game loop; these
// hold per-instance state and the movement they need.

export class Pathogen extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def, lane) {
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
    this.body.setAllowGravity(false);
    this.def = def;
    this.lane = lane;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.armor = def.armor || 0;
    this.baseSpeed = def.speed;
    this.blocked = false;
    this.slowFactor = 1;
    this.slowUntil = 0;
    this.vaulted = false; // parasite: has it already leapt a blocker?
    this.vaulting = false; // mid-leap (movement handled by a tween)
    this.boss = false;
    this.refreshVelocity();
  }

  currentSpeed() {
    const slow = this.scene.time.now < this.slowUntil ? this.slowFactor : 1;
    return this.baseSpeed * slow;
  }

  refreshVelocity() {
    if (this.vaulting) return; // a tween owns motion during a leap
    this.setVelocityX(this.blocked ? 0 : -this.currentSpeed());
  }

  setBlocked(blocked) {
    this.blocked = blocked;
    this.refreshVelocity();
  }

  applySlow(factor, ms) {
    this.slowFactor = factor;
    this.slowUntil = this.scene.time.now + ms;
    this.setTint(0x9fd8ff);
    this.refreshVelocity();
  }

  // Clear the slow visual/speed once it expires (called each frame by the scene).
  tickMotion() {
    if (this.slowFactor < 1 && this.scene.time.now >= this.slowUntil) {
      this.slowFactor = 1;
      this.clearTint();
      this.refreshVelocity();
    }
  }

  isSlowed() {
    return this.slowFactor < 1 && this.scene.time.now < this.slowUntil;
  }

  // Returns true if this damage killed it. AoE, mines and chomp bypass armor.
  applyDamage(dmg, ignoreArmor = false) {
    this.hp -= ignoreArmor ? dmg : dmg * (1 - this.armor);
    return this.hp <= 0;
  }
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.projectile || "projectile");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);
    this.body.setAllowGravity(false);
    this.damage = def.damage;
    this.slowFactor = def.slowFactor || 1;
    this.slowDuration = def.slowDuration || 0;
    this.setVelocityX(def.projectileSpeed); // fire right, toward incoming pathogens
  }
}

export class Defender extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, def, col, row) {
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    this.setDepth(4);
    this.def = def;
    this.col = col;
    this.row = row;
    this.hp = def.hp || 0;
    this.maxHp = def.hp || 0;
    this.timer = 0; // fire / generate cadence
    this.armed = false; // mine: live after arm delay
    this.fuseT = def.fuse || 0; // mast cell fuse countdown
    this.chewUntil = 0; // neutrophil: busy until this time
    this.spent = false; // one-shot consumed
  }
}
