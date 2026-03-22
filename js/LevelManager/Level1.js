//import all game entity classes
import { Player, Ground, Wall, Portal, Signboard, KeyPrompt, TextPrompt } from "../GameEntityModel/index.js";
import { CollisionSystem } from "../CollideSystem/CollisionSystem.js";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem.js";
import { RecordSystem } from "../RecordSystem/RecordSystem.js";
import { BaseLevel } from "./BaseLevel.js";

export class Level1 extends BaseLevel {
    constructor(p, eventBus) {
        super(p, eventBus);
        this.bgAssetKey = "bgImageLevel1";
        const wallThickness = 20;
        this.entities.add(new Wall(0, 0, wallThickness, p.height));
        this.entities.add(new Wall(p.width - wallThickness, 0, wallThickness, p.height));
        this.entities.add(new Ground(0, 0, p.width, 80));
        const platformWidth = 200;
        const platformX = p.width - wallThickness - platformWidth;
        this.entities.add(new Ground(platformX, 80, platformWidth, 150, true));
        // 将门改为 Portal，大小统一为 50x50
        const portalSize = 50;
        const portalX = p.width - wallThickness - portalSize;
        const portal = new Portal(portalX, 80 + 150, portalSize, portalSize);
        portal.openPortal(); // Level1 的门默认解锁
        this.entities.add(portal);

        const player = new Player(50, 450, 40, 40);
        player.createListeners();
        this.entities.add(player);

        // 场景内可交互木牌（固定尺寸 100×65，贴合 ground 顶部 y=80）
        const signboard = new Signboard(250, 80, Signboard.DEFAULT_W, Signboard.DEFAULT_H, this, eventBus);
        this.entities.add(signboard);

        // 按键提示（WAD 键，玩家和木牌之间，根据距离淡入淡出）
        const keyPrompt = new KeyPrompt(120, 100, this);
        this.entities.add(keyPrompt);

        // 木牌正上方按键提示（仅 C 键）
        const signboardKeyPromptX = signboard.x + Signboard.DEFAULT_W / 2 - 14;
        const signboardKeyPromptY = signboard.y + Signboard.DEFAULT_H + 8;
        const cKeyPrompt = new KeyPrompt(signboardKeyPromptX, signboardKeyPromptY, this, {
            keys: [{ col: 0, row: 0, label: "E" }],
        });
        this.entities.add(cKeyPrompt);

        const missedPromptWidth = 280;
        const signboardRightX = signboard.x + signboard.w;
        const gapWidth = platformX - signboardRightX;
        const missedPromptX = signboardRightX + (gapWidth - missedPromptWidth) / 2;
        const missedPromptY = signboard.y + 78;
        const missedPrompt = new TextPrompt(missedPromptX, missedPromptY, this, {
            textKey: "level1_missed_prompt",
            width: missedPromptWidth,
            height: 76,
            textSize: 16,
            showDistance: 80,
            hideDistance: 220,
        });
        this.entities.add(missedPrompt);

        const replayPrompt = new TextPrompt(missedPromptX, missedPromptY, this, {
            textKey: "level1_replay_prompt",
            width: missedPromptWidth,
            height: 110,
            textSize: 16,
            visibilityRule: "afterFirstReplay",
            showDistance: 160,
            hideDistance: 440,
        });
        this.entities.add(replayPrompt);
        
        this.recordSystem = new RecordSystem(player, 5000, (x, y) => this.addReplayer(x, y), () => this.removeReplayer());
        this.recordSystem.createListeners();

        this.physicsSystem = new PhysicsSystem(this.entities);
        this.collisionSystem = new CollisionSystem(this.entities, eventBus);
    }
}