// EntityManager.js
// 统一管理全局实体集合，保证 Player/Replayer 在所有房间都可用
import { Player, Replayer } from "../../GameEntityModel/index.js";

export class EntityManager {
    constructor(player, rooms) {
        this.player = player;
        this.replayer = null;
        this.rooms = rooms;
        this.entities = this._buildEntities();
    }

    syncEntities(collisionSystem, ladderSystem) {
        this.entities = this._buildEntities();
        if (collisionSystem && typeof collisionSystem.setEntities === "function") {
            collisionSystem.setEntities(this.entities);
        }
        if (ladderSystem) {
            ladderSystem.entities = this.entities;
        }
    }
// ...existing code...

    _buildEntities() {
        const set = new Set();
        for (const room of this.rooms) {
            for (const entity of room.entities) {
                set.add(entity);
            }
        }
        set.add(this.player);
        if (this.replayer) set.add(this.replayer);
        return set;
    }

    getEntities() {
        return this.entities;
    }

    addReplayer(x, y) {
        if (!this.replayer) {
            this.replayer = new Replayer(x, y, 40, 40);
            this.replayer.createListeners();
            this.entities = this._buildEntities();
        }
        return this.replayer;
    }

    removeReplayer() {
        if (this.replayer) {
            this.replayer.clearEventListeners();
            this.replayer = null;
            this.entities = this._buildEntities();
        }
    }

    rebuildEntities() {
        this.entities = this._buildEntities();
    }

    referenceOfPlayer() {
        return this.player;
    }
    referenceOfReplayer() {
        return this.replayer;
    }
}
