
import { Player, Replayer, Ground, Wall, Portal } from "../GameEntityModel/index.js";
import { RecordSystem } from "../RecordSystem/RecordSystem.js";
import { BaseLevel } from "./BaseLevel.js";
import { Assets } from "../AssetsManager.js";
import { Room } from "./Room.js";
import RoomManager from "../LevelSystems/RoomManager.js";
import CameraManager from "../LevelSystems/CameraManager.js";
import EntityManager from "../LevelSystems/EntityManager.js";
import PhysicsCollisionManager from "../LevelSystems/PhysicsCollisionManager.js";
import { CollisionSystem } from "../CollideSystem/CollisionSystem.js";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem.js";

export class Level3 extends BaseLevel {
    constructor(p, eventBus) {
        super(p, eventBus);
        // 关卡专属参数
        this.wallThickness = 20;
        this.bgAssetKey = "bgImageLevel3";

        // 1. 构建房间
        this.rooms = this._buildRooms(p);
        this._applyWorldOffsetsToRooms(p);

        // 2. 初始化实体管理器
        this.entityManager = new EntityManager();
        this._player = new Player(this.wallThickness + 10, 80, 40, 40);
        this._player.createListeners();
        this.entityManager.setPlayer(this._player);
        this.entityManager.addEntitiesFromRooms(this.rooms);

        // 3. 初始化房间管理器和相机
        this.roomManager = new RoomManager(p, this.rooms, 260);
        this.cameraManager = new CameraManager(this.roomManager);

        // 4. 物理/碰撞系统
        this.physicsCollisionManager = new PhysicsCollisionManager(
            this.entityManager.getEntities(),
            eventBus,
            PhysicsSystem,
            CollisionSystem
        );

        // 5. 录制系统
        this.recordSystem = new RecordSystem(
            this._player,
            5000,
            (x, y) => this.addReplayer(x, y),
            () => this.removeReplayer()
        );
        this.recordSystem.createListeners();
    }

    _buildRooms(p) {
        const w = this.wallThickness;
        const room0 = new Room([
            new Wall(0, 0, w, p.height),
            new Ground(0, 0, p.width, 80),
            new Ground(200, 160, 160, 20, true),
        ], {
            right: { targetRoomIndex: 1 },
        });
        const room1 = new Room([
            new Wall(p.width - w, 0, w, p.height),
            new Ground(0, 0, p.width, 80),
            new Ground(360, 130, 140, 20, true),
            new Ground(600, 200, 160, 20, true),
        ], {
            left: { targetRoomIndex: 0 },
        });
        const portal = new Portal(700, 220, 50, 50);
        portal.openPortal();
        room1.entities.add(portal);
        return [room0, room1];
    }

    _applyWorldOffsetsToRooms(p) {
        for (let i = 0; i < this.rooms.length; i++) {
            const offsetX = i * p.width;
            for (const entity of this.rooms[i].entities) {
                entity.x += offsetX;
            }
        }
    }

    // 通用功能全部交由 LevelSystems 管理器实现

    clearLevel(p = this.p, eventBus = this.eventBus) {
        super.clearLevel(p, eventBus);
    }

    addReplayer(startX, startY) {
        const replayer = new Replayer(startX, startY, 40, 40);
        replayer.createListeners();
        this.entityManager.addReplayer(replayer);
        this.physicsCollisionManager.setEntities(this.entityManager.getEntities());
        return replayer;
    }

    removeReplayer() {
        this.entityManager.removeReplayer();
        this.physicsCollisionManager.setEntities(this.entityManager.getEntities());
    }

    referenceOfPlayer() { return this.entityManager.referenceOfPlayer(); }
    referenceOfReplayer() { return this.entityManager.referenceOfReplayer(); }

    clearCanvas(p = this.p, cameraNudgeX = 0, bgParallaxFactor = 1) {
        // 支持多房间背景平铺
        const cameraX = this.cameraManager.getCameraX();
        const bgOffsetX = cameraNudgeX * bgParallaxFactor;
        const bg = Assets.bgImageLevel3;
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

    updatePhysics() {
        this.physicsCollisionManager.updatePhysics();
    }

    updateCollision(p = this.p, eventBus = this.eventBus) {
        this.physicsCollisionManager.updateCollision(eventBus);
        // 房间切换与过渡
        this.roomManager.checkRoomTransition(this._player);
        this.roomManager.updateTransition(p.deltaTime || 16);
    }

    draw(p = this.p) {
        const cameraX = this.cameraManager.getCameraX();
        p.push();
        p.translate(-cameraX, 0);
        for (const entity of this.entityManager.getEntities()) {
            entity.draw(p);
        }
        p.pop();
        if (this.recordSystem && typeof this.recordSystem.draw === "function") {
            this.recordSystem.draw(p);
        }
    }
}
