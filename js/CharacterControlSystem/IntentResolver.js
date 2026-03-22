import { KeyBindingManager } from '../KeyBindingSystem/KeyBindingManager.js';

class IntentResolver {
    constructor() {

    }
    resolve() {

    }
}
export class BasicIntentResolver extends IntentResolver {
    constructor() {
        super();
        this.keyBindingManager = KeyBindingManager.getInstance();
        this.conflictResolver = {
            "right": false,
            "left": false,
        }
    }
    resolve(event) {
        let intent = new Set();
        //处理意图冲突比如左右同时按下，返回意图
        
        // 通过 KeyBindingManager 动态查询按键对应的意图
        const mappedIntent = this.keyBindingManager.getIntentByKey(event.code);
        
        if(event.type === "keydown") {
            if(mappedIntent === "jump") {
                intent.add("wantsJump");
            } else if(mappedIntent === "moveRight") {
                this.conflictResolver["left"] = false;
                this.conflictResolver["right"] = true;
            } else if(mappedIntent === "moveLeft") {
                this.conflictResolver["left"] = true;
                this.conflictResolver["right"] = false;
            }
        }

        if(event.type === "keyup") {
            if(mappedIntent === "moveRight") {
                this.conflictResolver["right"] = false;
            } else if(mappedIntent === "moveLeft") {
                this.conflictResolver["left"] = false;
            }
        }

        if(this.conflictResolver["left"] && !this.conflictResolver["right"]) {
            intent.add("wantsLeft");
        } else if(!this.conflictResolver["left"] && this.conflictResolver["right"]) {
            intent.add("wantsRight");
        } else if(!this.conflictResolver["left"] && !this.conflictResolver["right"]) {
            intent.add("wantsStopX");
        }

        return intent;
    }
    // 返回当前按键状态下的意图（不依赖事件，用于每帧轮询）
    getCurrentIntent() {
        const intent = new Set();
        if(this.conflictResolver["left"] && !this.conflictResolver["right"]) {
            intent.add("wantsLeft");
        } else if(!this.conflictResolver["left"] && this.conflictResolver["right"]) {
            intent.add("wantsRight");
        } else if(!this.conflictResolver["left"] && !this.conflictResolver["right"]) {
            intent.add("wantsStopX");
        }
        return intent;
    }
}
