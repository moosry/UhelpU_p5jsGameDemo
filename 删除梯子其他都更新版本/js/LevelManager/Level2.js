import { Player, Ground, Wall, Portal, Spike, Button } from "../GameEntityModel/index.js";
import { CollisionSystem } from "../CollideSystem/CollisionSystem.js";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem.js";
import { RecordSystem } from "../RecordSystem/RecordSystem.js";
import { BaseLevel } from "./BaseLevel.js";
import { WireIndicatorSystem } from "../MechanismSystem/WireIndicatorSystem.js";

export class Level2 extends BaseLevel {
    constructor(p, eventBus) {
        super(p, eventBus);
        this.bgAssetKey = "bgImageLevel2";
        const wallThickness = 20;
        this.entities.add(new Wall(0, 0, wallThickness, p.height));
        this.entities.add(new Wall(p.width - wallThickness, 0, wallThickness, p.height));
        this.button1 = new Button(700, 80, 20, 5);//右按钮
        this.button2 = new Button(215, 80, 20, 5);//左按钮
        this.portal = new Portal(1025, 280, 50, 50);
        this.entities.add(new Ground(0, 0, p.width, 80));//地面铺满整个画面
        this.rightPlatform = new Ground(1000, 250, 100, 30, true);//平台右
        this.entities.add(this.rightPlatform);
        
        this.entities.add(this.portal);

        this.entities.add(this.button1);
        this.entities.add(this.button2);

        const player = new Player(50, 80, 40, 40);
        player.createListeners();
        this.entities.add(player);

        this.recordSystem = new RecordSystem(player, 5000, (x, y) => this.addReplayer(x, y), () => this.removeReplayer());
        this.recordSystem.createListeners();

        this.physicsSystem = new PhysicsSystem(this.entities);
        this.collisionSystem = new CollisionSystem(this.entities, eventBus);


        // 计算电线路径和指示灯坐标
        const b1x = this.button1.x + this.button1.collider.w / 2;
        const b1y = this.button1.y + this.button1.collider.h;
        const b2x = this.button2.x + this.button2.collider.w / 2;
        const b2y = this.button2.y + this.button2.collider.h;
        const platformLeftX = this.rightPlatform.x;
        const platformY = this.rightPlatform.y + this.rightPlatform.collider.h;
        const gateX = this.portal.x + this.portal.collider.w / 2;
        const gateY = platformY;

        const wire1Path = [
            { x: b1x, y: b1y },
            { x: platformLeftX, y: b1y },
            { x: platformLeftX, y: platformY },
            { x: gateX, y: platformY },
        ];
        const wire2Path = [
            { x: b2x, y: b2y },
            { x: platformLeftX, y: b2y },
            { x: platformLeftX, y: platformY },
            { x: gateX, y: platformY },
        ];
        // 指示灯坐标
        const px = this.portal.x;
        const py = this.portal.y;
        const pw = this.portal.collider.w;
        const ph = this.portal.collider.h;
        const indicatorY = py + ph + 14;
        const leftX = px + pw * 0.28;
        const rightX = px + pw * 0.72;

        this.wireIndicatorSystem = new WireIndicatorSystem(
            [this.button2, this.button1], // 顺序：左、右
            [wire2Path, wire1Path],
            [
                { x: leftX, y: indicatorY },
                { x: rightX, y: indicatorY },
            ],
            () => this.portal.openPortal(),
            {
                wireSpeed: 0.05,
                indicatorColors: [
                    { on: [120, 230, 255], off: [55, 60, 70] },
                    { on: [140, 255, 170], off: [55, 60, 70] },
                ],
            }
        );
    }

    updateCollision(p = this.p, eventBus = this.eventBus) {
        this.collisionSystem.collisionEntry(eventBus);
        this.wireIndicatorSystem.update();
    }

    draw(p = this.p) {
        // 先画地刺，再画地面，让地面遮住地刺底座
        for(const entity of this.entities) {
            if(entity.type === "spike") {
                entity.draw(p);
            }
        }

        for(const entity of this.entities) {
            if(entity.type === "ground") {
                entity.draw(p);
            }
        }

        // 电线和指示灯
        this.wireIndicatorSystem.draw(p);

        for(const entity of this.entities) {
            if(entity.type !== "spike" && entity.type !== "ground") {
                entity.draw(p);
            }
        }

        //绘制录制ui
        this.recordSystem.draw && this.recordSystem.draw(p);

        this.button1.releaseButton();
        this.button2.releaseButton();
    }

    // ...其余代码无变动...
}