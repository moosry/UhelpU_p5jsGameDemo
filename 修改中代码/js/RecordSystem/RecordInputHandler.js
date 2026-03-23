// 负责输入录制、回放派发、事件处理
class RecordInputHandler {
    constructor(player, entities = null) {
        this.player = player;
        this.entities = entities;
        this.pressedKeys = new Set();
        this._replayRecords = [];
        this._replayCursor = 0;
        this.clip = null;
        this.replayer = null;
        this.replayStartTime = null;
        this.eventDispatchTimer = null;
    }

    process(event, keyBindingManager) {
        const intent = keyBindingManager.getIntentByKey(event.code);
        if (intent !== "record" && intent !== "replay") {
            return null;
        }
        if (event.type === "keydown") {
            if (this.pressedKeys.has(intent)) {
                return null;
            } else {
                this.pressedKeys.add(intent);
                return intent;
            }
        }
        if (event.type === "keyup") {
            this.pressedKeys.delete(intent);
            return null;
        }
    }

    resetInputState() {
        this.pressedKeys.clear();
    }

    triggerKey(record) {
        if (this.entities) {
            for (const entity of this.entities) {
                if (entity && entity.type === "replayer" && entity.controllerManager && typeof entity.controllerManager.controlEntry === "function") {
                    const simpleEvent = { code: record["code"], type: record["keyType"], isReplay: true };
                    entity.controllerManager.controlEntry(simpleEvent);
                }
            }
        }
    }

    dispatchEvent(clip, replayStartTime, elapsedMs = 0) {
        const records = clip.getRecords() || [];
        this._replayRecords = records.map((record, index) => ({ ...record, __index: index }));
        this._replayRecords.sort((a, b) => {
            if (a.time === b.time) return a.__index - b.__index;
            return a.time - b.time;
        });
        this._replayCursor = 0;
        while (
            this._replayCursor < this._replayRecords.length
            && this._replayRecords[this._replayCursor].time < elapsedMs
        ) {
            this._replayCursor += 1;
        }
        this.flushDueReplayEvents(replayStartTime);
        this.scheduleNextReplayEvent(replayStartTime);
    }

    scheduleNextReplayEvent(replayStartTime) {
        if (this.eventDispatchTimer) {
            clearTimeout(this.eventDispatchTimer);
            this.eventDispatchTimer = null;
        }
        if (this._replayCursor >= this._replayRecords.length) {
            return;
        }
        const nextRecord = this._replayRecords[this._replayCursor];
        const elapsed = Math.max(0, performance.now() - replayStartTime);
        const delay = Math.max(0, nextRecord.time - elapsed);
        this.eventDispatchTimer = setTimeout(() => {
            this.flushDueReplayEvents(replayStartTime);
            this.scheduleNextReplayEvent(replayStartTime);
        }, delay);
    }

    flushDueReplayEvents(replayStartTime) {
        const elapsed = Math.max(0, performance.now() - replayStartTime);
        while (
            this._replayCursor < this._replayRecords.length
            && this._replayRecords[this._replayCursor].time <= elapsed + 0.5
        ) {
            this.triggerKey(this._replayRecords[this._replayCursor]);
            this._replayCursor += 1;
        }
    }
}

export default RecordInputHandler;
