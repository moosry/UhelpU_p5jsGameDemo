// 通用实体管理器：负责实体的收集、增删、引用
class EntityManager {
    constructor() {
        this.entities = new Set();
        this._player = null;
        this._replayer = null;
    }

    setPlayer(player) {
        this._player = player;
        this.entities.add(player);
    }

    addReplayer(replayer) {
        this._replayer = replayer;
        this.entities.add(replayer);
    }

    removeReplayer() {
        if (this._replayer) {
            this.entities.delete(this._replayer);
            this._replayer = null;
        }
    }

    addEntitiesFromRooms(rooms) {
        for (const room of rooms) {
            for (const entity of room.entities) {
                this.entities.add(entity);
            }
        }
    }

    getEntities() {
        return this.entities;
    }

    referenceOfPlayer() {
        return this._player ?? null;
    }

    referenceOfReplayer() {
        return this._replayer ?? null;
    }
}

export default EntityManager;
