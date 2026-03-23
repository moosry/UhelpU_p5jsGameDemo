import { Character } from "./Character.js";
import { MovementComponent } from "../PhysicsSystem/MovementComponent.js";
import { ControllerManager } from "../CharacterControlSystem/ControllerManager.js";
import { RectangleCollider } from "../CollideSystem/CollideComponent.js";
import { ColliderShape, ColliderType } from "../CollideSystem/enumerator.js";
import { Assets } from "../AssetsManager.js";

function getCloneSprite(velX, velY, isOnGround) {
    if (!isOnGround) {
        if (velY > 0) {
            if (velX > 0) return Assets.cloneImg_upRight;
            if (velX < 0) return Assets.cloneImg_upLeft;
            return Assets.cloneImg_up;
        }
        return null;
    }
    if (velX > 0) return Assets.cloneImg_right;
    if (velX < 0) return Assets.cloneImg_left;
    return null;
}

export class Replayer extends Character {
    constructor(x, y, w, h) {
        super(x, y);
        this.type = "replayer";
        this.startX = x;
        this.startY = y;
        this.isReplaying = false;
        this.movementComponent = new MovementComponent(0, 0, 0, 0);
        this.controllerManager = new ControllerManager("BasicModeReplayer", this.movementComponent);
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
                this._wasOnGround = true;
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

    _drawJumpEffects(p, isGhost) {
        const alphaScale = isGhost ? 0.55 : 1;
        p.push();
        p.noFill();
        for (const ring of this._jumpRingEffects) {
            const alpha = Math.floor((ring.life / ring.maxLife) * 220 * alphaScale);
            p.stroke(255, 246, 196, alpha);
            p.strokeWeight(2);
            p.circle(ring.x, ring.y, ring.radius * 2);
        }
        p.pop();

        p.push();
        p.noStroke();
        for (const particle of this._jumpBurstParticles) {
            const alpha = Math.floor((particle.life / particle.maxLife) * 230 * alphaScale);
            p.fill(255, 248, 200, alpha);
            p.rect(particle.x, particle.y, particle.size, particle.size);
        }
        p.pop();
    }

    _drawTrailParticles(p, isGhost) {
        p.push();
        p.noStroke();
        for (const particle of this._trailParticles) {
            const baseAlpha = isGhost ? 100 : 210;
            const alpha = Math.floor((particle.life / particle.maxLife) * baseAlpha);
            const blend = (particle.maxLife - particle.life) / particle.maxLife;
            const g = Math.floor(210 + (250 - 210) * blend);
            const b = Math.floor(230 + (200 - 230) * blend);
            p.fill(255, g, b, alpha);
            p.rect(particle.x, particle.y, particle.size, particle.size);
        }
        p.pop();
    }

    inLevelReset() {
        this.x = this.startX;
        this.y = this.startY;
        this.movementComponent.velX = 0;
        this.movementComponent.velY = 0;
        // 清除控制状态，避免残留的 pressedKeys 导致下次回放 keydown 被过滤
        const mode = this.controllerManager.currentControlMode;
        mode.eventProcesser.pressedKeys.clear();
        mode.intentResolver.conflictResolver["left"] = false;
        mode.intentResolver.conflictResolver["right"] = false;
        this._lastSprite = null;
        this._idleStartMs = null;
        this._trailParticles = [];
        this._trailEmitAccumulator = 0;
        this._jumpRingEffects = [];
        this._jumpBurstParticles = [];
        this._wasOnGround = true;
    }

    draw(p) {
        let drawX = this.x;
        let drawY = this.y;

        if (!this.isReplaying) {
            drawX = this.startX;
            drawY = this.startY;
            this.x = this.startX;
            this.y = this.startY;
            this.movementComponent.velX = 0;
            this.movementComponent.velY = 0;
        }

        if (!this.isReplaying) {
            this._trailParticles = [];
            this._trailEmitAccumulator = 0;
            this._jumpRingEffects = [];
            this._jumpBurstParticles = [];
            this._idleStartMs = null;
            this._wasOnGround = true;
            const ghostSprite = (Array.isArray(Assets.cloneIdleImgs) && Assets.cloneIdleImgs.length >= 1)
                ? Assets.cloneIdleImgs[0]
                : Assets.cloneImg_right;
            this._lastSprite = ghostSprite || this._lastSprite;

            if (this._lastSprite) {
                p.push();
                p.translate(drawX, drawY + this.collider.h);
                p.scale(1, -1);
                p.tint(255, 60);
                p.image(this._lastSprite, 0, 0, this.collider.w, this.collider.h);
                p.noTint();
                p.pop();
            } else {
                p.fill(255, 200, 255, 60);
                p.rect(drawX, drawY, this.collider.w, this.collider.h);
            }
            return;
        }

        const isOnGround = this.controllerManager.currentControlComponent.abilityCondition["isOnGround"];
        if (this.movementComponent.velX > 0.05) this._trailFacing = 1;
        if (this.movementComponent.velX < -0.05) this._trailFacing = -1;

        if (this._wasOnGround && !isOnGround && this.movementComponent.velY > 0.12) {
            this._spawnJumpRing(p, drawX, drawY);
        }
        this._updateJumpEffects();

        const isMoving = Math.abs(this.movementComponent.velX) > 0.08;
        const isAirTrail = !isOnGround && (Math.abs(this.movementComponent.velY) > 0.12 || Math.abs(this.movementComponent.velX) > 0.05);
        const emitVelX = isOnGround ? this.movementComponent.velX : this._trailFacing * Math.max(Math.abs(this.movementComponent.velX), 1);
        this._updateTrailParticles(p, drawX, drawY, (isOnGround && isMoving) || isAirTrail, emitVelX);
        this._drawTrailParticles(p, false);
        this._drawJumpEffects(p, false);
        this._wasOnGround = isOnGround;

        const isIdle = isOnGround
            && Math.abs(this.movementComponent.velX) < 0.01
            && Math.abs(this.movementComponent.velY) < 0.01;

        let sprite = null;
        if (isIdle) {
            if (this._idleStartMs === null) {
                this._idleStartMs = p.millis();
            }
            if (Array.isArray(Assets.cloneIdleImgs) && Assets.cloneIdleImgs.length >= 6) {
                const idleElapsed = p.millis() - this._idleStartMs;
                const sequenceDurationMs = this._idleSequence.length * this._idleFrameDurationMs;
                const cycleDurationMs = this._idleDelayMs + sequenceDurationMs;
                const elapsedInCycle = idleElapsed % cycleDurationMs;
                if (elapsedInCycle >= this._idleDelayMs) {
                    const playElapsed = elapsedInCycle - this._idleDelayMs;
                    const seqIndex = Math.floor(playElapsed / this._idleFrameDurationMs);
                    const frameNumber = this._idleSequence[Math.min(seqIndex, this._idleSequence.length - 1)];
                    sprite = Assets.cloneIdleImgs[frameNumber - 1] || null;
                }
            }
        } else {
            this._idleStartMs = null;
        }

        if (!sprite) {
            sprite = this.isReplaying
                ? getCloneSprite(this.movementComponent.velX, this.movementComponent.velY, isOnGround)
                : null;
        }
        if (sprite) this._lastSprite = sprite;
        sprite = this._lastSprite || Assets.cloneImg_right;

        if (sprite) {
            p.push();
            p.translate(drawX, drawY + this.collider.h);
            p.scale(1, -1);
            p.image(sprite, 0, 0, this.collider.w, this.collider.h);
            p.pop();
        } else {
            p.fill(255, 200, 255);
            p.rect(drawX, drawY, this.collider.w, this.collider.h);
        }
    }
}
