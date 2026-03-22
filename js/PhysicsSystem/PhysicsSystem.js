export class PhysicsSystem {
    constructor(entities) {
        this.entities = entities;
    }
    setEntities(entities) {
        this.entities = entities;
    }
    physicsEntry() {
        for(const entity of this.entities) {
            const m = entity.movementComponent;
            if(m) {
                // 初始化死亡效果（仅执行一次）
                if(entity.initDeathEffect) {
                    entity.initDeathEffect();
                }

                entity.headBlockedThisFrame = false;
                entity.prevX = entity.x;
                entity.prevY = entity.y;
                const blockedXLastFrame = entity.blockedXLastFrame === true;
                entity.blockedXLastFrame = false;
                if(entity.controllerManager && !blockedXLastFrame) {
                    entity.controllerManager.tick();
                }
                m.velY = m.velY + m.accY;
                m.velX = m.velX + m.accX;
                entity.x = entity.x + m.velX;
                entity.y = entity.y + m.velY;
            }
        }
    }
}