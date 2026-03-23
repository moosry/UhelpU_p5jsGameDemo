// SystemInitializer.js
// 负责初始化关卡各大系统
import { LadderSystem } from "../../GameEntityModel/LadderSystem.js";
import { EntityManager } from "./EntityManager.js";
import { RecordSystem } from "../../RecordSystem/RecordSystem.js";
import { PhysicsSystem } from "../../PhysicsSystem/PhysicsSystem.js";
import { CollisionSystem } from "../../CollideSystem/CollisionSystem.js";

export function initializeLevel3Systems(player, rooms, eventBus) {
    const ladderSystem = new LadderSystem();
    const entityManager = new EntityManager(player, rooms);
    const entities = entityManager.getEntities();
    ladderSystem.enable(player, entities);
    const recordSystem = new RecordSystem(
        player,
        5000,
        (x, y) => entityManager.addReplayer(x, y),
        () => entityManager.removeReplayer()
    );
    recordSystem.createListeners();
    const physicsSystem = new PhysicsSystem(entities);
    const collisionSystem = new CollisionSystem(entities, eventBus);
    return {
        ladderSystem,
        entityManager,
        recordSystem,
        physicsSystem,
        collisionSystem
    };
}
