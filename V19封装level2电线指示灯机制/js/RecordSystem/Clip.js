import { isGamePaused } from "../GameRuntime/GamePauseState.js";
import { KeyBindingManager } from "../KeyBindingSystem/KeyBindingManager.js";

export class Clip {
    constructor(startX, startY, recordStartTime) {
        this.startX = startX;
        this.startY = startY;
        this.records = [];
        this.recordStartTime = recordStartTime;//

        const keyBindingManager = KeyBindingManager.getInstance();
        this.allowedKeys = new Set([
            keyBindingManager.getKeyByIntent("jump"),
            keyBindingManager.getKeyByIntent("moveLeft"),
            keyBindingManager.getKeyByIntent("moveRight"),
        ].filter(Boolean));
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
