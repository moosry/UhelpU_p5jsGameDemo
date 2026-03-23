import { Level3Config } from "./Level3/Level3Config.js";
import { TransitionController } from "./Level3/TransitionController.js";
import { Player } from "../GameEntityModel/index.js";
import { Ladder } from "../GameEntityModel/Ladder.js";
import { LadderSystem } from "../GameEntityModel/LadderSystem.js";
import { CollisionSystem } from "../CollideSystem/CollisionSystem.js";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem.js";
import { RecordSystem } from "../RecordSystem/RecordSystem.js";
import { BaseLevel } from "./BaseLevel.js";
import { Assets } from "../AssetsManager.js";
import { KeyBindingManager } from "../KeyBindingSystem/KeyBindingManager.js";
import { AssembleRooms } from "./Level3/AssembleRooms.js";
import { EntityManager } from "./Level3/EntityManager.js";

export class Level3 extends BaseLevel {
    constructor(p, eventBus) {
        super(p, eventBus);
        // 过渡/相机控制器
        this.transitionController = new TransitionController(
            2, // 房间数量，后续可自动获取
            p.width,
            260
        );
        this.ladderSystem = new LadderSystem();

        // 配置参数
        const cfg = Level3Config;
        // ====== 动态布局参数计算 ======
        const leftHighPlatformX = 200 + cfg.obstacleOffsetX;
        const leftHighPlatformTopY = cfg.highPlatformY + cfg.highPlatformH;
        const ladderX = leftHighPlatformX + 50;
        const ladderW = 52;
        const ladderBottomY = leftHighPlatformTopY + 6;
        const ladderHeight = cfg.ladderHeight;
        const upperRoomW = cfg.upperRoomW;
        const upperRoomH = cfg.upperRoomH;
        const upperRoomX = ladderX + (ladderW - upperRoomW) / 2;
        const ladderTopY = ladderBottomY + ladderHeight;
        const upperRoomFloorY = ladderTopY;
        // 只让梯子本体延申20像素，布局参数不变
        this._ladders = [new Ladder(ladderX, ladderBottomY, ladderW, ladderHeight + 20)];
        const homeWallThickness = cfg.homeWallThickness;
        const homeDoorW = ladderW;
        const homeDoorX = ladderX;
        const homeDoorY = upperRoomFloorY;
        const buttonW = cfg.buttonW;
        const buttonH = cfg.buttonH;
        const buttonY = ladderTopY;
        const leftButtonX = upperRoomX + 32 + 16;
        const rightButtonX = upperRoomX + upperRoomW - 32 - 16 - buttonW;
        const leftButton = { x: leftButtonX, y: buttonY, w: buttonW, h: buttonH };
        const rightButton = { x: rightButtonX, y: buttonY, w: buttonW, h: buttonH };
        // ====== 组装房间参数 ======
        const roomParams = {
            ...cfg,
            leftHighPlatformX,
            leftHighPlatformTopY,
            ladderX,
            ladderW,
            ladderBottomY,
            ladderHeight,
            upperRoomW,
            upperRoomH,
            upperRoomX,
            upperRoomFloorY,
            homeWallThickness,
            homeDoorW,
            homeDoorX,
            homeDoorY,
            leftButton,
            rightButton
        };
        this.rooms = AssembleRooms(p, roomParams, this._ladders, [leftButton, rightButton]);

        this._player = new Player(cfg.wallThickness + 10, 80, 40, 40);
        this._player.lockControlThisFrame = false;
        this._player.createListeners();
        this._playerDefaultAccY = this._player.movementComponent.accY;

        this.entityManager = new EntityManager(this._player, this.rooms);
        this.entities = this.entityManager.getEntities();

        this.physicsSystem = new PhysicsSystem(this.entities);
        this.collisionSystem = new CollisionSystem(this.entities, eventBus);
        this.ladderSystem.enable(this._player, this.entities);

        const keyBindingManager = KeyBindingManager.getInstance();
        if (keyBindingManager.getKeyByIntent("jump") === "KeyW") {
            keyBindingManager.rebind("jump", "Space");
        }

        // 包装回调，保证每次增删分身后同步实体集合到所有系统
        const syncAllEntities = () => {
            this.entityManager.syncEntities(this.collisionSystem, this.ladderSystem);
            this.physicsSystem.setEntities(this.entityManager.getEntities());
        };
            this.recordSystem = new RecordSystem(
                this._player,
                5000,
                (x, y) => {
                    const rep = this.entityManager.addReplayer(x, y);
                    syncAllEntities();
                    return rep;
                },
                () => {
                    this.entityManager.removeReplayer();
                    syncAllEntities();
                },
                this.ladderSystem, // 新增：传递 LadderSystem 实例
                this.entities      // 新增：传递 entities 给 RecordSystem
            );
        this.recordSystem.createListeners();
    }




    // 房间切换与相机全部交给 TransitionController

    getViewBounds(p = this.p) {
        const cameraX = this.transitionController.getCameraX();
        return {
            minX: cameraX,
            maxX: cameraX + p.width,
            minY: 0,
            maxY: p.height,
        };
    }

    clearLevel(p = this.p, eventBus = this.eventBus) {
        this.recordSystem.clearAllListenersAndTimers();
        this._player.clearListeners();
        this.ladderSystem.disable();
    }

    // 梯子输入监听和状态管理已迁移到 LadderSystem


    referenceOfPlayer() { return this.entityManager.referenceOfPlayer(); }
    referenceOfReplayer() { return this.entityManager.referenceOfReplayer(); }

    clearCanvas(p = this.p, cameraNudgeX = 0, bgParallaxFactor = 1) {
        const cameraX = this.transitionController.getCameraX();
        const bgOffsetX = cameraNudgeX * bgParallaxFactor;
        const bg = Assets && Assets.bgImageLevel3;
        if (bg) {
            p.push();
            p.translate(-cameraX - bgOffsetX, 0);
            p.scale(1, -1);
            for (let i = 0; i < this.rooms.length; i++) {
                p.image(bg, i * p.width, -p.height, p.width, p.height);
            }
            p.pop();
        } else {
            p.background(220);
        }
    }


    // 梯子判定已迁移到 LadderSystem

    // 梯子爬行状态管理已迁移到 LadderSystem

    // 不再需要 _drawLadders，Ladder 实体自己绘制

    updatePhysics() {
        this.ladderSystem.update();
        this.physicsSystem.physicsEntry();
    }

    updateCollision(p = this.p, eventBus = this.eventBus) {
        this.collisionSystem.collisionEntry(eventBus);
        // 过渡动画
        if (this.transitionController._transition) {
            this.transitionController.updateTransition(p.deltaTime || 16);
            return;
        }
        // 检查房间切换
        this.transitionController.checkRoomTransition(this._player, this.rooms);
        // 保证实体集合始终同步
        this.entities = this.entityManager.getEntities();
        this.collisionSystem.setEntities(this.entities);
        this.ladderSystem.entities = this.entities;
    }

    draw(p = this.p) {
        const cameraX = this.transitionController.getCameraX();
        p.push();
        p.translate(-cameraX, 0);
        // 梯子已作为实体自动绘制
        for (const entity of this.entities) {
            entity.draw(p);
        }
        p.pop();
        if (this.recordSystem && typeof this.recordSystem.draw === "function") {
            this.recordSystem.draw(p);
        }
    }
}
