import { Replayer } from "../GameEntityModel/index.js";
import { Assets } from "../AssetsManager.js";

export class BaseLevel {
    constructor(p = null, eventBus = null) {
        this.p = p;
        this.eventBus = eventBus;
        this.entities = new Set();
        this.physicsSystem = null;
        this.collisionSystem = null;
        this.recordSystem = null;
        this.bgAssetKey = null;
    }

    clearLevel() {
        if (this.recordSystem && typeof this.recordSystem.clearAllListenersAndTimers === "function") {
            this.recordSystem.clearAllListenersAndTimers();
        }

        const player = this.referenceOfPlayer();
        if (player && typeof player.clearListeners === "function") {
            player.clearListeners();
        }
    }

    findEntityByType(type) {
        for (const entity of this.entities) {
            if (entity.type === type) {
                return entity;
            }
        }
        return null;
    }

    referenceOfPlayer() {
        return this.findEntityByType("player");
    }

    referenceOfReplayer() {
        return this.findEntityByType("replayer");
    }

    syncSystemsEntities() {
        if (this.physicsSystem && typeof this.physicsSystem.setEntities === "function") {
            this.physicsSystem.setEntities(this.entities);
        }
        if (this.collisionSystem && typeof this.collisionSystem.setEntities === "function") {
            this.collisionSystem.setEntities(this.entities);
        }
    }

    addReplayer(startX, startY) {
        const ref = this.referenceOfReplayer();
        if (ref !== null) {
            return ref;
        }

        const replayer = new Replayer(startX, startY, 40, 40);
        replayer.createListeners();
        this.entities.add(replayer);
        this.syncSystemsEntities();
        return replayer;
    }

    removeReplayer() {
        const ref = this.referenceOfReplayer();
        if (ref === null) {
            return;
        }

        ref.clearEventListeners();
        this.entities.delete(ref);
        this.syncSystemsEntities();
    }

    clearCanvas(p = this.p) {
        const bg = this.bgAssetKey ? Assets[this.bgAssetKey] : null;
        if (bg) {
            p.push();
            p.scale(1, -1);
            p.image(bg, 0, -p.height, p.width, p.height);
            p.pop();
            return;
        }
        p.background(220);
    }

    updatePhysics() {
        if (this.physicsSystem && typeof this.physicsSystem.physicsEntry === "function") {
            this.physicsSystem.physicsEntry();
        }
        // 更新所有游戏实体（如 Signboard 的交互检测）
        for (const entity of this.entities) {
            if (entity.update && typeof entity.update === "function") {
                entity.update(this.p);
            }
        }
    }

    updateCollision(p = this.p, eventBus = this.eventBus) {
        if (this.collisionSystem && typeof this.collisionSystem.collisionEntry === "function") {
            this.collisionSystem.collisionEntry(eventBus);
        }
    }

    updateAnimation() {

    }

    draw(p = this.p) {
        // 按 zIndex 排序绘制（zIndex 较小）先绘制，zIndex 较大后绘制）
        const sortedEntities = Array.from(this.entities).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        for (const entity of sortedEntities) {
            entity.draw(p);
        }

        if (this.recordSystem && typeof this.recordSystem.draw === "function") {
            this.recordSystem.draw(p);
        }
    }
}