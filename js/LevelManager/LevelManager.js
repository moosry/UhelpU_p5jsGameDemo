import { Level1 } from "./Level1.js";
import { Level2 } from "./Level2.js";
import { Level3 } from "./Level3.js";
import { setGamePaused } from "../GameRuntime/GamePauseState.js";

export class LevelManager {
    constructor(p, eventBus) {
        this.p = p;
        this.eventBus = eventBus;
        this.levelMap = {
            "level1": Level1,
            "level2": Level2,
            "level3": Level3,
        }
        this.level = null;
        this.currentLevelIndex = null;
        this.paused = false;
    }
    loadLevel(levelIndex, p = this.p, eventBus = this.eventBus) {
        if(!this.level) {
            const LevelClass = this.levelMap[levelIndex];
            this.level = new LevelClass(p, eventBus);
            this.currentLevelIndex = levelIndex;
            console.log("load level: " + levelIndex);
        }
    }
    unloadLevel(p = this.p, eventBus = this.eventBus) {
        if(this.level) {
            this.level.clearLevel(p, eventBus);
            this.level = null;
            console.log("unload level");
        }
    }
    update(p = this.p, eventBus = this.eventBus) {
        if(this.level) {
            this.flipY(p);
            this.level.clearCanvas && this.level.clearCanvas(p);
            if(!this.paused) {
                this.level.updatePhysics && this.level.updatePhysics(p);
                this.level.updateCollision && this.level.updateCollision(p, eventBus);
                // 检测死亡的玩家是否超出画面
                this.checkDeadPlayerOutOfBounds(p, eventBus);
            }
           
            if(this.level) {
                this.level.draw && this.level.draw(p);
            }
        }
    }

    setPaused(paused) {
        this.paused = !!paused;
        setGamePaused(this.paused);

        if (this.level && this.level.recordSystem) {
            if (this.paused && typeof this.level.recordSystem.pauseForGamePause === "function") {
                this.level.recordSystem.pauseForGamePause();
            }
            if (!this.paused && typeof this.level.recordSystem.resumeFromGamePause === "function") {
                this.level.recordSystem.resumeFromGamePause();
            }
        }

        if (!this.paused || !this.level) return;

        for (const entity of this.level.entities || []) {
            if (entity.controllerManager && typeof entity.controllerManager.resetInputState === "function") {
                entity.controllerManager.resetInputState();
            }
        }

        if (this.level.recordSystem && typeof this.level.recordSystem.resetInputState === "function") {
            this.level.recordSystem.resetInputState();
        }
        if (this.level.recordSystem && this.level.recordSystem.clip && typeof this.level.recordSystem.clip.resetInputState === "function") {
            this.level.recordSystem.clip.resetInputState();
        }
    }
    flipY(p = this.p) {
        p.translate(0, p.height);
        p.scale(1, -1);
    }

       // 检查死亡的玩家是否超出画面边界
       checkDeadPlayerOutOfBounds(p = this.p, eventBus = this.eventBus) {
           if(!this.level) return;
       
           // 获取玩家引用
           let player = null;
           for(const entity of this.level.entities) {
               if(entity.type === "player") {
                   player = entity;
                   break;
               }
           }
       
           if(player && player.deathState && player.deathState.isDead) {
               const viewBounds = (this.level && typeof this.level.getViewBounds === "function")
                   ? this.level.getViewBounds(p)
                   : { minX: 0, maxX: p.width, minY: 0, maxY: p.height };

               // 检查玩家是否超出画面（任何方向超出都算）
               if(player.x > viewBounds.maxX || player.x + player.collider.w < viewBounds.minX ||
                  player.y > viewBounds.maxY || player.y + player.collider.h < viewBounds.minY) {
                   // 发布结算事件
                   eventBus && eventBus.publish("autoResult", "autoResult2");
               }
           }
       }
}