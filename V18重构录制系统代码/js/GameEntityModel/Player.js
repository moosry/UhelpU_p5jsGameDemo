import { Character } from "./Character.js";
import { MovementComponent } from "../PhysicsSystem/MovementComponent.js";
import { ControllerManager } from "../CharacterControlSystem/ControllerManager.js";
import { RectangleCollider } from "../CollideSystem/CollideComponent.js";
import { ColliderShape, ColliderType } from "../CollideSystem/enumerator.js";
import { Assets } from "../AssetsManager.js";

function getPlayerSprite(velX, velY, isOnGround) {
    if (!isOnGround) {
        if (velY > 0) { // y轴向上为正，跳跃中
            if (velX > 0) return Assets.playerImg_upRight;
            if (velX < 0) return Assets.playerImg_upLeft;
            return Assets.playerImg_up;
        }
        return null; // 下落时沿用上一帧
    }
    if (velX > 0) return Assets.playerImg_right;
    if (velX < 0) return Assets.playerImg_left;
    return null; // 静止时沿用上一帧
}

export class Player extends Character {
    constructor(x, y, w, h) {
        super(x, y);
        this.type = "player";
        this.startX = x;
        this.startY = y;
        this.movementComponent = new MovementComponent(0, 0, 0, 0);
        this.controllerManager = new ControllerManager("BasicMode", this.movementComponent);
           this.controllerManager.owner = this; // 设置owner用于死亡状态检查
        this.collider = new RectangleCollider(ColliderType.DYNAMIC, w, h);
        this._lastSprite = null;
          this._idleStartMs = null;
        this._idleDelayMs = 2000;
          this._idleFrameDurationMs = 120;
        this._idleSequence = [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1];
                this._trailParticles = [];
                this._trailEmitAccumulator = 0;
                this._jumpRingEffects = [];
                this._jumpBurstParticles = [];
                this._landingDustParticles = [];
                this._wasOnGround = true;
                this._prevVelY = 0;
                this._trailFacing = 1;
    }
    createListeners() {
        
        this.controllerManager.createListeners();
    }
    clearListeners() {
        this.controllerManager.clearListeners();
    }

    _updateTrailParticles(p, drawX, drawY, shouldEmit, velX) {
        for (let i = this._trailParticles.length - 1; i >= 0; i--) {
            const particle = this._trailParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 1;
            if (particle.life <= 0) {
                this._trailParticles.splice(i, 1);
            }
        }

        if (!shouldEmit) return;

        this._trailEmitAccumulator += Math.max(Math.abs(velX) * 0.2, 0.6);
        while (this._trailEmitAccumulator >= 1) {
            this._trailEmitAccumulator -= 1;
            const spawnX = velX >= 0
                ? drawX - p.random(1, 4)
                : drawX + this.collider.w + p.random(1, 4);
            const spawnY = drawY + p.random(1, 4);
            const size = p.random(2, 4);
            const life = Math.floor(p.random(10, 18));
            this._trailParticles.push({
                x: spawnX,
                y: spawnY,
                vx: p.random(-0.25, 0.25),
                vy: p.random(-0.12, 0.12),
                size,
                life,
                maxLife: life,
            });
        }
    }

    _spawnLandingDust(p, drawX, drawY, impactVelY) {
        const count = Math.floor(Math.min(Math.abs(impactVelY) * 1.6, 14));
        for (let i = 0; i < count; i++) {
            // 左右交替从角色两侧脚底喷出，不从中间生成（避免被贴图遮盖）
            const side = (i % 2 === 0) ? -1 : 1;
            const speed = p.random(1.2, 3.0);
            const angle = p.random(0.05, 0.38); // 接近水平的扇形
            const life = Math.floor(p.random(12, 22));
            // 起点在角色左侧或右侧边缘外
            const spawnX = side < 0
                ? drawX - p.random(2, 6)
                : drawX + this.collider.w + p.random(2, 6);
            this._landingDustParticles.push({
                x: spawnX,
                y: drawY + p.random(0, 4),
                vx: Math.cos(angle) * speed * side,
                vy: Math.sin(angle) * speed * 0.3,
                size: p.random(3, 6),
                life,
                maxLife: life,
            });
        }
    }

    _updateLandingDust() {
        for (let i = this._landingDustParticles.length - 1; i >= 0; i--) {
            const d = this._landingDustParticles[i];
            d.x += d.vx;
            d.y += d.vy;
            d.vx *= 0.88;
            d.vy *= 0.82;
            d.life -= 1;
            if (d.life <= 0) {
                this._landingDustParticles.splice(i, 1);
            }
        }
    }

    _drawLandingDust(p) {
        if (this._landingDustParticles.length === 0) return;
        p.push();
        p.noStroke();
        for (const d of this._landingDustParticles) {
            const t = d.life / d.maxLife;
            const alpha = Math.floor(t * 160);
            p.fill(195, 178, 155, alpha);
            p.circle(d.x, d.y, d.size * t + 1);
        }
        p.pop();
    }

    _spawnJumpRing(p, drawX, drawY) {
        this._jumpRingEffects.push({
            x: drawX + this.collider.w / 2,
            y: drawY + 2,
            radius: 2,
            life: 16,
            maxLife: 16,
        });

        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12 + p.random(-0.15, 0.15);
            const speed = p.random(0.8, 1.8);
            const life = Math.floor(p.random(10, 16));
            this._jumpBurstParticles.push({
                x: drawX + this.collider.w / 2,
                y: drawY + 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.6,
                size: p.random(2, 4),
                life,
                maxLife: life,
            });
        }
    }

    _updateJumpEffects() {
        for (let i = this._jumpRingEffects.length - 1; i >= 0; i--) {
            const ring = this._jumpRingEffects[i];
            ring.radius += 1.4;
            ring.life -= 1;
            if (ring.life <= 0) {
                this._jumpRingEffects.splice(i, 1);
            }
        }

        for (let i = this._jumpBurstParticles.length - 1; i >= 0; i--) {
            const particle = this._jumpBurstParticles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.02;
            particle.life -= 1;
            if (particle.life <= 0) {
                this._jumpBurstParticles.splice(i, 1);
            }
        }
    }

    _drawJumpEffects(p) {
        p.push();
        p.noFill();
        for (const ring of this._jumpRingEffects) {
            const alpha = Math.floor((ring.life / ring.maxLife) * 220);
            p.stroke(255, 246, 196, alpha);
            p.strokeWeight(2);
            p.circle(ring.x, ring.y, ring.radius * 2);
        }
        p.pop();

        p.push();
        p.noStroke();
        for (const particle of this._jumpBurstParticles) {
            const alpha = Math.floor((particle.life / particle.maxLife) * 230);
            p.fill(255, 248, 200, alpha);
            p.rect(particle.x, particle.y, particle.size, particle.size);
        }
        p.pop();
    }

    _drawTrailParticles(p) {
        p.push();
        p.noStroke();
        for (const particle of this._trailParticles) {
            const alpha = Math.floor((particle.life / particle.maxLife) * 210);
            const blend = (particle.maxLife - particle.life) / particle.maxLife;
            const g = Math.floor(210 + (250 - 210) * blend);
            const b = Math.floor(230 + (200 - 230) * blend);
            p.fill(255, g, b, alpha);
            p.rect(particle.x, particle.y, particle.size, particle.size);
        }
        p.pop();
    }


    draw(p) {
        if(this.deathState && this.deathState.isDead) {
            this._trailParticles = [];
            this._trailEmitAccumulator = 0;
            this._jumpRingEffects = [];
            this._jumpBurstParticles = [];
            this._landingDustParticles = [];
            this._wasOnGround = true;
            const deadSprite = Assets.playerImg_dead;
            if (deadSprite) {
                p.push();
                p.translate(this.x, this.y + this.collider.h);
                p.scale(1, -1);
                p.image(deadSprite, 0, 0, this.collider.w, this.collider.h);
                p.pop();
                return;
            }
        }

        const isOnGround = this.controllerManager.currentControlComponent.abilityCondition["isOnGround"];
        if (this.movementComponent.velX > 0.05) this._trailFacing = 1;
        if (this.movementComponent.velX < -0.05) this._trailFacing = -1;

        if (this._wasOnGround && !isOnGround && this.movementComponent.velY > 0.12) {
            this._spawnJumpRing(p, this.x, this.y);
        }
        // 落地检测：上一帧在空中、本帧在地面，且有一定下落速度
        if (!this._wasOnGround && isOnGround && this._prevVelY < -1.5) {
            this._spawnLandingDust(p, this.x, this.y, this._prevVelY);
        }
        this._prevVelY = this.movementComponent.velY;
        this._updateJumpEffects();
        this._updateLandingDust();

        const isMoving = Math.abs(this.movementComponent.velX) > 0.08;
        const isAirTrail = !isOnGround && (Math.abs(this.movementComponent.velY) > 0.12 || Math.abs(this.movementComponent.velX) > 0.05);
        const emitVelX = isOnGround ? this.movementComponent.velX : this._trailFacing * Math.max(Math.abs(this.movementComponent.velX), 1);
        this._updateTrailParticles(p, this.x, this.y, (isOnGround && isMoving) || isAirTrail, emitVelX);
        this._drawTrailParticles(p);
        this._drawJumpEffects(p);
        this._wasOnGround = isOnGround;

        const isIdle = isOnGround
            && Math.abs(this.movementComponent.velX) < 0.01
            && Math.abs(this.movementComponent.velY) < 0.01;

        let sprite = null;
        if (isIdle) {
            if (this._idleStartMs === null) {
                this._idleStartMs = p.millis();
            }
            const idleElapsed = p.millis() - this._idleStartMs;
            if (Array.isArray(Assets.playerIdleImgs) && Assets.playerIdleImgs.length >= 6) {
                const sequenceDurationMs = this._idleSequence.length * this._idleFrameDurationMs;
                const cycleDurationMs = this._idleDelayMs + sequenceDurationMs;
                const elapsedInCycle = idleElapsed % cycleDurationMs;
                if (elapsedInCycle >= this._idleDelayMs) {
                    const playElapsed = elapsedInCycle - this._idleDelayMs;
                    const seqIndex = Math.floor(playElapsed / this._idleFrameDurationMs);
                    const frameNumber = this._idleSequence[Math.min(seqIndex, this._idleSequence.length - 1)];
                    sprite = Assets.playerIdleImgs[frameNumber - 1] || null;
                }
            }
        } else {
            this._idleStartMs = null;
        }

        if (!sprite) {
            sprite = getPlayerSprite(this.movementComponent.velX, this.movementComponent.velY, isOnGround);
        }
        if (sprite) {
            this._lastSprite = sprite;
        }
        sprite = this._lastSprite || Assets.playerImg_right;

        if (sprite) {
            p.push();
            p.translate(this.x, this.y + this.collider.h);
            p.scale(1, -1);
            p.image(sprite, 0, 0, this.collider.w, this.collider.h);
            p.pop();
        } else {
            p.fill(100, 200, 255);
            p.rect(this.x, this.y, this.collider.w, this.collider.h);
        }

        // 落地灰尘在贴图之后绘制，确保显示在角色两侧不被遮挡
        this._drawLandingDust(p);
    }
}