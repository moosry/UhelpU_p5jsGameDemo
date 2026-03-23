// 通用物理与碰撞系统管理器：负责初始化和更新物理、碰撞系统
class PhysicsCollisionManager {
    constructor(entities, eventBus, PhysicsSystemClass, CollisionSystemClass) {
        this.physicsSystem = new PhysicsSystemClass(entities);
        this.collisionSystem = new CollisionSystemClass(entities, eventBus);
    }

    setEntities(entities) {
        this.physicsSystem.setEntities(entities);
        this.collisionSystem.setEntities(entities);
    }

    updatePhysics() {
        this.physicsSystem.physicsEntry();
    }

    updateCollision(eventBus) {
        this.collisionSystem.collisionEntry(eventBus);
    }
}

export default PhysicsCollisionManager;
