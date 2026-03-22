import { Player, Ground, Wall, Portal, Spike, Button } from "../GameEntityModel/index.js";
import { CollisionSystem } from "../CollideSystem/CollisionSystem.js";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem.js";
import { RecordSystem } from "../RecordSystem/RecordSystem.js";
import { BaseLevel } from "./BaseLevel.js";

export class Level2 extends BaseLevel {
    constructor(p, eventBus) {
        super(p, eventBus);
        this.bgAssetKey = "bgImageLevel2";
        const wallThickness = 20;
        this.entities.add(new Wall(0, 0, wallThickness, p.height));
        this.entities.add(new Wall(p.width - wallThickness, 0, wallThickness, p.height));
        this.button1 = new Button(700, 80, 20, 5);//右按钮
        this.button2 = new Button(215, 240, 20, 5);//左按钮
        this.portal = new Portal(825, 280, 50, 50);
        this.entities.add(new Ground(0, 0, p.width, 80));//地面铺满整个画面
        this.entities.add(new Ground(330, 130, 100, 30, true));//平台中
        this.entities.add(new Ground(175, 210, 100, 30, true));//平台左
        this.entities.add(new Ground(800, 250, 100, 30, true));//平台右

        this.entities.add(new Spike(400, 50, 200, 70));
        
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
    }
    updateCollision(p = this.p, eventBus = this.eventBus) {
        this.collisionSystem.collisionEntry(eventBus);
        if(this.button1.isPressed && this.button2.isPressed) {
            this.portal.openPortal();
        }
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
    
}