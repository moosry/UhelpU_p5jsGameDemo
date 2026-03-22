import { GameEntity } from "./GameEntity.js";

export class Character extends GameEntity {
    constructor(x, y) {
        super(x, y);
        // 死亡状态管理（支持多种死亡方式）
        this.deathState = {
            isDead: false,           // 是否已死亡
            initialized: false,      // 死亡初始化是否完成（用于一次性初始化）
            deathType: null,         // 死亡类型：'spike', 'lava' 等，便于以后扩展
        };
    }
    
    // 启动死亡状态（可重写以实现不同的死亡效果）
    triggerDeath(deathType = "default") {
        if(this.deathState.isDead) return; // 防止重复触发
        
        this.deathState.isDead = true;
        this.deathState.deathType = deathType;
        this.deathState.initialized = false;
    }
    
    // 初始化死亡效果（在物理系统中被调用一次）
    initDeathEffect() {
        if(this.deathState.isDead && !this.deathState.initialized) {
            // 根据死亡类型选择效果
            switch(this.deathState.deathType) {
                case 'spike':
                    this.initSpikeDeath();
                    break;
                // 以后可以添加其他死亡类型
                default:
                    this.initSpikeDeath();
            }
            this.deathState.initialized = true;
        }
    }
    
    // 地刺死亡效果：原地往上弹一下
    initSpikeDeath() {
        if(this.movementComponent) {
            this.movementComponent.velX = 0;  // 清零水平速度
            this.movementComponent.velY = 8;  // 给予向上的初速度
        }
    }
    
    createEventListeners() {

    }
    clearEventListeners() {
        
    }
    draw() {

    }
}