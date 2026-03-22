import { KeyBindingManager } from '../KeyBindingSystem/KeyBindingManager.js';

class EventProcesser {
    constructor() {

    }
    process() {

    }
}

export class BasicEventProcesser extends EventProcesser {
    constructor() {
        super();
        this.keyBindingManager = KeyBindingManager.getInstance();
        this.pressedKeys = new Set();
    }
    process(event) {//输入层
        if(!this.keyBindingManager.getAllowedKeys().has(event.code)) {
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