import { isGamePaused } from "../GameRuntime/GamePauseState.js";
import { KeyBindingManager } from "../KeyBindingSystem/KeyBindingManager.js";

export class Clip {
    constructor(startX, startY, recordStartTime) {
        this.startX = startX;
        this.startY = startY;
        this.records = [];
        this.recordStartTime = recordStartTime;

        // 自动收集所有 relevant intent 的按键
        const keyBindingManager = KeyBindingManager.getInstance();
        // 梯子相关意图，若无专门意图则直接加 KeyW/KeyS
        const relevantIntents = [
            "jump", "moveLeft", "moveRight", "interaction", "record", "replay",
            "climbUp", "climbDown"
        ];
        // 允许的按键集合，补充 KeyW/KeyS 以防没有 climbUp/climbDown 意图
        this.allowedKeys = new Set(
            relevantIntents
                .map(intent => keyBindingManager.getKeyByIntent(intent))
                .filter(Boolean)
        );
        // 兼容没有 climbUp/climbDown 意图时，直接允许 KeyW/KeyS
        this.allowedKeys.add("KeyW");
        this.allowedKeys.add("KeyS");
        this.pressedKeys = new Set();

        this._keydownHandler = (event) => this.eventHandler(event);
        this._keyupHandler = (event) => this.eventHandler(event);
    }
    eventHandler(event) {
        if (isGamePaused()) {
            this.resetInputState();
            return;
        }
        const processedEvent = this.process(event);
        if(processedEvent) {
            const record = {
                keyType: event.type,
                code: event.code,
                time: performance.now() - this.recordStartTime,
            };
            this.records.push(record);
        }
    }
    injectHeldKeys(heldKeys) {
        for (const code of heldKeys) {
            if (this.allowedKeys.has(code)) {
                this.pressedKeys.add(code);
                this.records.push({
                    keyType: "keydown",
                    code: code,
                    time: 0,
                });
            }
        }
    }

    createListeners() {
        window.addEventListener("keydown", this._keydownHandler);
        window.addEventListener("keyup", this._keyupHandler);
    }

    clearListeners() {
        window.removeEventListener("keydown", this._keydownHandler);
        window.removeEventListener("keyup", this._keyupHandler);
    }

    resetInputState() {
        this.pressedKeys.clear();
    }

    getStartX() {
        return this.startX;
    }

    getStartY() {
        return this.startY;
    }
    getRecords() {
        return this.records;
    }
    process(event) {//输入层
        if(!this.allowedKeys.has(event.code)) {
            return null;
        }

        if(event.type === "keydown") {
            if(this.pressedKeys.has(event.code)) {
                return null;
            }
            this.pressedKeys.add(event.code);
            return event;
        }

        if(event.type === "keyup") {
            //assert(pressedKeys.has(event.code));
            this.pressedKeys.delete(event.code);
            return event;
        }
    }
}
