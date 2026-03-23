// LadderSystem.js —— 全局梯子输入与状态管理，适用于所有关卡
export class LadderSystem {
    constructor() {
        this.climbSpeed = 3.2;
        this.enabled = false;
    }

    enable(player, entities) {
        this.enabled = true;
        this.player = player;
        this.entities = entities;
    }

    disable() {
        this.enabled = false;
        this.player = null;
        this.entities = null;
    }

    update() {
        if (!this.enabled || !this.entities) return;
        const climbers = [];
        if (this.player) climbers.push(this.player);
        for (const entity of this.entities) {
            if (entity.type === "replayer") climbers.push(entity);
        }
        for (const climber of climbers) {
            this._updateClimber(climber);
        }
    }

    _updateClimber(climber) {
        const movement = climber.movementComponent;
        if (!movement) return;
        // 只依赖实时碰撞+输入
        const isOnLadder = this._findIntersectingLadderForPlayer(climber);
        const pressingUp = climber.input?.up;
        if (isOnLadder && pressingUp) {
            climber.y -= climber.climbSpeed || this.climbSpeed;
        }
    }

    _findIntersectingLadderForPlayer(player) {
        if (!this.entities) return null;
        for (const entity of this.entities) {
            if (entity.type === "ladder" && entity.overlapsPlayer(player)) {
                return entity;
            }
        }
        return null;
    }
}
