// 门面类，统一对外接口
export class RecordSystem {
    constructor(player, maxRecordTime, addReplayerCallback, removeReplayerCallback, entities = null) {
        this.stateManager = new RecordStateManager(maxRecordTime);
        this.inputHandler = new RecordInputHandler(player, entities);
        this.ui = new RecordUI();
        this.player = player;
        this.addReplayer = addReplayerCallback;
        this.removeReplayer = removeReplayerCallback;
        this._hudVisible = true;
        this._keydownHandler = (event) => this.eventHandler(event);
        this._keyupHandler = (event) => this.eventHandler(event);
        // 绑定 actions 到 stateManager
        this.stateManager.setActions({
            "ReadyToRecord": { "record": () => this.beingRecordingFromIdle() },
            "Recording": {
                "record": () => this.finishRecordingByKey(),
                "RecordTimeout": () => this.finishRecordingByTimeout(),
            },
            "ReadyToReplay": {
                "replay": () => this.beingReplay(),
                "record": () => this.restartRecording(),
            },
            "Replaying": {
                "ReplayTimeout": () => this.finishReplayAndReset(),
                "replay": () => this.finishReplayByKey(),
            },
        });
    }

    setHudVisible(visible) {
        this._hudVisible = !!visible;
    }
    isHudVisible() {
        return this._hudVisible;
    }
    createListeners() {
        window.addEventListener("keydown", this._keydownHandler);
        window.addEventListener("keyup", this._keyupHandler);
    }
    clearAllListenersAndTimers() {
        window.removeEventListener("keydown", this._keydownHandler);
        window.removeEventListener("keyup", this._keyupHandler);
        // 代理 inputHandler/manager 清理
        this.inputHandler.resetInputState();
        if(this.inputHandler.eventDispatchTimer) {
            clearTimeout(this.inputHandler.eventDispatchTimer);
            this.inputHandler.eventDispatchTimer = null;
        }
        if(this.stateManager.recordTimer) {
            clearTimeout(this.stateManager.recordTimer);
        }
        if(this.stateManager.replayTimer) {
            clearTimeout(this.stateManager.replayTimer);
        }
        if(this.inputHandler.replayer) {
            this.removeReplayer();
        }
    }
    eventHandler(event) {
        if (isGamePaused()) {
            this.inputHandler.resetInputState();
            return;
        }
        const intent = this.inputHandler.process(event, KeyBindingManager.getInstance());
        if (intent !== null) {
            // Block starting a new recording while player is airborne
            if (intent === "record" && (this.stateManager.state === "ReadyToRecord" || this.stateManager.state === "ReadyToReplay")) {
                const cc = this.player?.controllerManager?.currentControlComponent;
                const isOnGround = cc?.abilityCondition?.["isOnGround"] ?? true;
                if (!isOnGround) {
                    this.stateManager._airBlockFlashMs = performance.now();
                    return;
                }
            }
            this.stateManager.transition(intent);
        }
    }
    // 录制/回放相关方法（门面转发）
    beingRecordingFromIdle() {
        this.stateManager.recordStartTime = performance.now();
        this.inputHandler.clip = new Clip(this.player.x, this.player.y, this.stateManager.recordStartTime);
        const heldKeys = this.player.controllerManager.currentControlMode.eventProcesser.pressedKeys;
        this.inputHandler.clip.injectHeldKeys(heldKeys);
        this.inputHandler.clip.createListeners();
        this.stateManager.recordTimer = setTimeout(() => {
            this.stateManager.transition("RecordTimeout");
        }, this.stateManager.maxRecordTime);
    }
    restartRecording() {
        this.stateManager.recordStartTime = performance.now();
        this.stateManager.recordEndTime = -1;
        this.stateManager.recordTimer = setTimeout(() => {
            this.stateManager.transition("RecordTimeout");
        }, this.stateManager.maxRecordTime);
        this.removeReplayer();
        this.inputHandler.replayer = null;
        this.inputHandler.clip = new Clip(this.player.x, this.player.y, this.stateManager.recordStartTime);
        const heldKeys = this.player.controllerManager.currentControlMode.eventProcesser.pressedKeys;
        this.inputHandler.clip.injectHeldKeys(heldKeys);
        this.inputHandler.clip.createListeners();
    }
    finishRecordingByKey() {
        this.stateManager.recordEndTime = performance.now();
        this.inputHandler.clip.clearListeners();
        clearTimeout(this.stateManager.recordTimer);
        this.stateManager.recordTimer = null;
        this.inputHandler.replayer = this.addReplayer(this.inputHandler.clip.getStartX(), this.inputHandler.clip.getStartY());
    }
    finishRecordingByTimeout() {
        this.stateManager.recordEndTime = performance.now();
        this.inputHandler.clip.clearListeners();
        this.stateManager.recordTimer = null;
        this.inputHandler.replayer = this.addReplayer(this.inputHandler.clip.getStartX(), this.inputHandler.clip.getStartY());
    }
    beingReplay() {
        markLevel1ReplayStarted();
        if (this.inputHandler.replayer) {
            this.inputHandler.replayer.isReplaying = true;
            this.inputHandler.replayer.createListeners && this.inputHandler.replayer.createListeners();
        }
        this.stateManager._pausedReplayElapsed = null;
        this.inputHandler.replayStartTime = performance.now();
        this.stateManager.replayTimer = setTimeout(() => {
            this.stateManager.transition("ReplayTimeout");
        }, this.stateManager.recordEndTime - this.stateManager.recordStartTime);
        this.inputHandler.dispatchEvent(this.inputHandler.clip, this.inputHandler.replayStartTime);
    }
    finishReplayAndReset() {
        if (this.inputHandler.replayer) this.inputHandler.replayer.isReplaying = false;
        this.stateManager.replayTimer = null;
        if (this.inputHandler.eventDispatchTimer) {
            clearTimeout(this.inputHandler.eventDispatchTimer);
            this.inputHandler.eventDispatchTimer = null;
        }
        this.inputHandler._replayRecords = [];
        this.inputHandler._replayCursor = 0;
        this.stateManager._pausedReplayElapsed = null;
        if (this.inputHandler.replayer && typeof this.inputHandler.replayer.inLevelReset === 'function') {
            this.inputHandler.replayer.inLevelReset();
        }
    }
    finishReplayByKey() {
        if (this.inputHandler.replayer) this.inputHandler.replayer.isReplaying = false;
        if (this.stateManager.replayTimer) clearTimeout(this.stateManager.replayTimer);
        this.stateManager.replayTimer = null;
        if (this.inputHandler.eventDispatchTimer) {
            clearTimeout(this.inputHandler.eventDispatchTimer);
            this.inputHandler.eventDispatchTimer = null;
        }
        this.inputHandler._replayRecords = [];
        this.inputHandler._replayCursor = 0;
        this.stateManager._pausedReplayElapsed = null;
        if (this.inputHandler.replayer && typeof this.inputHandler.replayer.inLevelReset === 'function') {
            this.inputHandler.replayer.inLevelReset();
        }
    }
    // UI 门面
    draw(p) {
        const ui = this.ui.getRecordUiState(
            p,
            this.stateManager.state,
            this.stateManager.maxRecordTime,
            this.stateManager.recordStartTime,
            this.stateManager.recordEndTime,
            this.inputHandler.replayStartTime,
            isGamePaused(),
            this.stateManager._pausedRecordElapsed,
            this.stateManager._pausedReplayElapsed
        );
        this.ui.draw(p, ui, this.player, this._hudVisible, this.stateManager);
    }
}
// 负责录制面板 UI
class RecordUI {
    constructor() {}

    getRecordUiState(p, state, maxRecordTime, recordStartTime, recordEndTime, replayStartTime, paused, pausedRecordElapsed, pausedReplayElapsed) {
        const kbm = KeyBindingManager.getInstance();
        const recordKey = keyCodeToLabel(kbm.getKeyByIntent('record'));
        const replayKey  = keyCodeToLabel(kbm.getKeyByIntent('replay'));
        const maxSec = (maxRecordTime / 1000).toFixed(1);
        const chrome = {
            frameLight: p.color(68,  38, 100),
            frameDark:  p.color(12,   6,  24),
            panelFill:  p.color(34,  18,  58),
            panelShade: p.color(22,  11,  40),
            textMain:   p.color(218, 198, 238),
            textSub:    p.color(148, 122, 175),
        };
        const base = {
            ...chrome,
            title:        t("rec_title_standby"),
            subtitle:     `${t("rec_sub_max")} ${maxSec}s`,
            badge:        "STANDBY",
            accentA:      p.color(72,  48, 105),
            accentB:      p.color(44,  26,  70),
            dotColor:     p.color(100,  72, 138),
            progress:     0,
            showBlinkDot: false,
            pulse:        0,
        };
        switch (state) {
            case "Recording": {
                const elapsedMs = paused && pausedRecordElapsed !== null
                    ? pausedRecordElapsed
                    : Math.max(0, performance.now() - recordStartTime);
                const elapsedSec = (elapsedMs / 1000).toFixed(1);
                return {
                    ...chrome,
                    title:        t("rec_title_recording"),
                    subtitle:     `${t('rec_sub_press_e_end').replace('{KEY}', recordKey)}  ${elapsedSec}s / ${maxSec}s`,
                    badge:        "REC",
                    accentA:      p.color(175,  38,  88),
                    accentB:      p.color(105,  18,  50),
                    panelFill:    p.color(42,   16,  55),
                    panelShade:   p.color(28,   10,  40),
                    dotColor:     p.color(240,  65, 115),
                    textMain:     p.color(240, 215, 235),
                    textSub:      p.color(195, 148, 175),
                    progress:     Math.min(1, elapsedMs / maxRecordTime),
                    showBlinkDot: Math.floor(performance.now() / 450) % 2 === 0,
                    pulse:        (Math.sin(performance.now() / 200) + 1) / 2,
                };
            }
            case "ReadyToReplay": {
                const recordedSec = ((recordEndTime - recordStartTime) / 1000).toFixed(1);
                return {
                    ...chrome,
                    title:        t("rec_title_ready"),
                    subtitle:     `${t('rec_sub_ready_prefix').replace('{REPLAY}', replayKey).replace('{RECORD}', recordKey)}  ${recordedSec}s`,
                    badge:        "READY",
                    accentA:      p.color(58,  98, 130),
                    accentB:      p.color(34,  62,  90),
                    panelFill:    p.color(28,  22,  55),
                    panelShade:   p.color(18,  14,  40),
                    dotColor:     p.color(105, 165, 210),
                    textMain:     p.color(210, 215, 240),
                    textSub:      p.color(138, 148, 185),
                    progress:     1,
                    showBlinkDot: false,
                    pulse:        0,
                };
            }
            case "Replaying": {
                const totalMs = Math.max(1, recordEndTime - recordStartTime);
                const replayElapsedMs = paused && pausedReplayElapsed !== null
                    ? pausedReplayElapsed
                    : Math.min(Math.max(0, performance.now() - replayStartTime), totalMs);
                const replayElapsedSec = (replayElapsedMs / 1000).toFixed(1);
                const totalReplaySec = (totalMs / 1000).toFixed(1);
                return {
                    ...chrome,
                    title:        t("rec_title_replaying"),
                    subtitle:     `${t('rec_sub_press_replay_end').replace('{KEY}', replayKey)}  ${replayElapsedSec}s / ${totalReplaySec}s`,
                    badge:        "PLAY",
                    accentA:      p.color(115,  75, 155),
                    accentB:      p.color(72,   42, 105),
                    panelFill:    p.color(36,   20,  62),
                    panelShade:   p.color(22,   12,  44),
                    dotColor:     p.color(175, 138, 215),
                    textMain:     p.color(218, 200, 240),
                    textSub:      p.color(155, 128, 185),
                    progress:     Math.min(1, replayElapsedMs / totalMs),
                    showBlinkDot: Math.floor(performance.now() / 700) % 2 === 0,
                    pulse:        0,
                };
            }
            default:
                return {
                    ...base,
                    title:    t('rec_title_idle').replace('{KEY}', recordKey),
                    subtitle: `${t('rec_sub_max')} ${maxSec}s`,
                    badge:    "IDLE",
                };
        }
    }

    draw(p, ui, player, hudVisible, recordStateManager) {
        if (!hudVisible) return;
        // ...原 draw 方法内容，参数替换为 ui, player, recordStateManager...
        // 这里只做结构拆分，具体 draw 逻辑后续迁移
    }
}
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
// 负责录制/回放状态、状态流转、定时器
class RecordStateManager {
    constructor(maxRecordTime) {
        this.maxRecordTime = maxRecordTime;
        this.states = {
            "ReadyToRecord": { "record": "Recording" },
            "Recording": { "record": "ReadyToReplay", "RecordTimeout": "ReadyToReplay" },
            "ReadyToReplay": { "replay": "Replaying", "record": "Recording" },
            "Replaying": { "ReplayTimeout": "ReadyToReplay", "replay": "ReadyToReplay" },
        };
        this.actions = {};
        this.state = "ReadyToRecord";
        this.recordStartTime = -1;
        this.recordEndTime = -1;
        this.recordTimer = null;
        this.replayTimer = null;
        this._pausedRecordElapsed = null;
        this._pausedReplayElapsed = null;
    }

    setActions(actions) {
        this.actions = actions;
    }

    transition(input) {
        const nextState = this.states[this.state][input];
        if (!nextState) {
            return false;
        } else {
            const actionFunc = this.actions[this.state][input];
            this.state = nextState;
            if (actionFunc) actionFunc();
        }
    }

    pauseForGamePause() {
        if (this.state === "Recording") {
            if (this._pausedRecordElapsed !== null) return;
            this._pausedRecordElapsed = Math.max(0, performance.now() - this.recordStartTime);
            if (this.recordTimer) {
                clearTimeout(this.recordTimer);
                this.recordTimer = null;
            }
            return;
        }
        if (this.state === "Replaying") {
            if (this._pausedReplayElapsed !== null) return;
            const totalMs = Math.max(1, this.recordEndTime - this.recordStartTime);
            this._pausedReplayElapsed = Math.min(
                Math.max(0, performance.now() - this.replayStartTime),
                totalMs
            );
            if (this.replayTimer) {
                clearTimeout(this.replayTimer);
                this.replayTimer = null;
            }
        }
    }

    resumeFromGamePause() {
        if (this.state === "Recording") {
            if (this._pausedRecordElapsed === null) return;
            const elapsed = this._pausedRecordElapsed;
            const remaining = Math.max(0, this.maxRecordTime - elapsed);
            this.recordStartTime = performance.now() - elapsed;
            this.recordTimer = setTimeout(() => {
                this.transition("RecordTimeout");
            }, remaining);
            this._pausedRecordElapsed = null;
            return;
        }
        if (this.state === "Replaying") {
            if (this._pausedReplayElapsed === null) return;
            const elapsed = this._pausedReplayElapsed;
            const totalMs = Math.max(1, this.recordEndTime - this.recordStartTime);
            const remaining = Math.max(0, totalMs - elapsed);
            this.replayStartTime = performance.now() - elapsed;
            this.replayTimer = setTimeout(() => {
                this.transition("ReplayTimeout");
            }, remaining);
            this._pausedReplayElapsed = null;
        }
    }
}
import RecordStateManager from "./RecordStateManager.js";
import RecordInputHandler from "./RecordInputHandler.js";
import RecordUI from "./RecordUI.js";
import { Clip } from "./Clip.js";
import { isGamePaused } from "../GameRuntime/GamePauseState.js";
import { KeyBindingManager } from "../KeyBindingSystem/KeyBindingManager.js";
import { markLevel1ReplayStarted } from "../GameRuntime/Level1PromptState.js";

// 门面类，统一对外接口
class RecordSystem {
    constructor(player, maxRecordTime, addReplayerCallback, removeReplayerCallback, entities = null) {
        this.stateManager = new RecordStateManager(maxRecordTime);
        this.inputHandler = new RecordInputHandler(player, entities);
        this.ui = new RecordUI();
        this.player = player;
        this.addReplayer = addReplayerCallback;
        this.removeReplayer = removeReplayerCallback;
        this._hudVisible = true;
        this._keydownHandler = (event) => this.eventHandler(event);
        this._keyupHandler = (event) => this.eventHandler(event);
        // 绑定 actions 到 stateManager
        this.stateManager.setActions({
            "ReadyToRecord": { "record": () => this.beingRecordingFromIdle() },
            "Recording": {
                "record": () => this.finishRecordingByKey(),
                "RecordTimeout": () => this.finishRecordingByTimeout(),
            },
            "ReadyToReplay": {
                "replay": () => this.beingReplay(),
                "record": () => this.restartRecording(),
            },
            "Replaying": {
                "ReplayTimeout": () => this.finishReplayAndReset(),
                "replay": () => this.finishReplayByKey(),
            },
        });
    }

    setHudVisible(visible) {
        this._hudVisible = !!visible;
    }
    isHudVisible() {
        return this._hudVisible;
    }
    createListeners() {
        window.addEventListener("keydown", this._keydownHandler);
        window.addEventListener("keyup", this._keyupHandler);
    }
    clearAllListenersAndTimers() {
        window.removeEventListener("keydown", this._keydownHandler);
        window.removeEventListener("keyup", this._keyupHandler);
        // 代理 inputHandler/manager 清理
        this.inputHandler.resetInputState();
        if(this.inputHandler.eventDispatchTimer) {
            clearTimeout(this.inputHandler.eventDispatchTimer);
            this.inputHandler.eventDispatchTimer = null;
        }
        if(this.stateManager.recordTimer) {
            clearTimeout(this.stateManager.recordTimer);
        }
        if(this.stateManager.replayTimer) {
            clearTimeout(this.stateManager.replayTimer);
        }
        if(this.inputHandler.replayer) {
            this.removeReplayer();
        }
    }
    eventHandler(event) {
        if (isGamePaused()) {
            this.inputHandler.resetInputState();
            return;
        }
        const intent = this.inputHandler.process(event, KeyBindingManager.getInstance());
        if (intent !== null) {
            // Block starting a new recording while player is airborne
            if (intent === "record" && (this.stateManager.state === "ReadyToRecord" || this.stateManager.state === "ReadyToReplay")) {
                const cc = this.player?.controllerManager?.currentControlComponent;
                const isOnGround = cc?.abilityCondition?.["isOnGround"] ?? true;
                if (!isOnGround) {
                    this.stateManager._airBlockFlashMs = performance.now();
                    return;
                }
            }
            this.stateManager.transition(intent);
        }
    }
    // 录制/回放相关方法（门面转发）
    beingRecordingFromIdle() {
        this.stateManager.recordStartTime = performance.now();
        this.inputHandler.clip = new Clip(this.player.x, this.player.y, this.stateManager.recordStartTime);
        const heldKeys = this.player.controllerManager.currentControlMode.eventProcesser.pressedKeys;
        this.inputHandler.clip.injectHeldKeys(heldKeys);
        this.inputHandler.clip.createListeners();
        this.stateManager.recordTimer = setTimeout(() => {
            this.stateManager.transition("RecordTimeout");
        }, this.stateManager.maxRecordTime);
    }
    restartRecording() {
        this.stateManager.recordStartTime = performance.now();
        this.stateManager.recordEndTime = -1;
        this.stateManager.recordTimer = setTimeout(() => {
            this.stateManager.transition("RecordTimeout");
        }, this.stateManager.maxRecordTime);
        this.removeReplayer();
        this.inputHandler.replayer = null;
        this.inputHandler.clip = new Clip(this.player.x, this.player.y, this.stateManager.recordStartTime);
        const heldKeys = this.player.controllerManager.currentControlMode.eventProcesser.pressedKeys;
        this.inputHandler.clip.injectHeldKeys(heldKeys);
        this.inputHandler.clip.createListeners();
    }
    finishRecordingByKey() {
        this.stateManager.recordEndTime = performance.now();
        this.inputHandler.clip.clearListeners();
        clearTimeout(this.stateManager.recordTimer);
        this.stateManager.recordTimer = null;
        this.inputHandler.replayer = this.addReplayer(this.inputHandler.clip.getStartX(), this.inputHandler.clip.getStartY());
    }
    finishRecordingByTimeout() {
        this.stateManager.recordEndTime = performance.now();
        this.inputHandler.clip.clearListeners();
        this.stateManager.recordTimer = null;
        this.inputHandler.replayer = this.addReplayer(this.inputHandler.clip.getStartX(), this.inputHandler.clip.getStartY());
    }
    beingReplay() {
        markLevel1ReplayStarted();
        if (this.inputHandler.replayer) {
            this.inputHandler.replayer.isReplaying = true;
            this.inputHandler.replayer.createListeners && this.inputHandler.replayer.createListeners();
        }
        this.stateManager._pausedReplayElapsed = null;
        this.inputHandler.replayStartTime = performance.now();
        this.stateManager.replayTimer = setTimeout(() => {
            this.stateManager.transition("ReplayTimeout");
        }, this.stateManager.recordEndTime - this.stateManager.recordStartTime);
        this.inputHandler.dispatchEvent(this.inputHandler.clip, this.inputHandler.replayStartTime);
    }
    finishReplayAndReset() {
        if (this.inputHandler.replayer) this.inputHandler.replayer.isReplaying = false;
        this.stateManager.replayTimer = null;
        if (this.inputHandler.eventDispatchTimer) {
            clearTimeout(this.inputHandler.eventDispatchTimer);
            this.inputHandler.eventDispatchTimer = null;
        }
        this.inputHandler._replayRecords = [];
        this.inputHandler._replayCursor = 0;
        this.stateManager._pausedReplayElapsed = null;
        if (this.inputHandler.replayer && typeof this.inputHandler.replayer.inLevelReset === 'function') {
            this.inputHandler.replayer.inLevelReset();
        }
    }
    finishReplayByKey() {
        if (this.inputHandler.replayer) this.inputHandler.replayer.isReplaying = false;
        if (this.stateManager.replayTimer) clearTimeout(this.stateManager.replayTimer);
        this.stateManager.replayTimer = null;
        if (this.inputHandler.eventDispatchTimer) {
            clearTimeout(this.inputHandler.eventDispatchTimer);
            this.inputHandler.eventDispatchTimer = null;
        }
        this.inputHandler._replayRecords = [];
        this.inputHandler._replayCursor = 0;
        this.stateManager._pausedReplayElapsed = null;
        if (this.inputHandler.replayer && typeof this.inputHandler.replayer.inLevelReset === 'function') {
            this.inputHandler.replayer.inLevelReset();
        }
    }
    // UI 门面
    draw(p) {
        const ui = this.ui.getRecordUiState(
            p,
            this.stateManager.state,
            this.stateManager.maxRecordTime,
            this.stateManager.recordStartTime,
            this.stateManager.recordEndTime,
            this.inputHandler.replayStartTime,
            isGamePaused(),
            this.stateManager._pausedRecordElapsed,
            this.stateManager._pausedReplayElapsed
        );
        this.ui.draw(p, ui, this.player, this._hudVisible, this.stateManager);
    }
}

export default RecordSystem;
        frameLight: p.color(68,  38, 100),
        frameDark:  p.color(12,   6,  24),
        panelFill:  p.color(34,  18,  58),
        panelShade: p.color(22,  11,  40),
        textMain:   p.color(218, 198, 238),
        textSub:    p.color(148, 122, 175),
    };

    const base = {
        ...chrome,
        title:        t("rec_title_standby"),
        subtitle:     `${t("rec_sub_max")} ${maxSec}s`,
        badge:        "STANDBY",
        accentA:      p.color(72,  48, 105),
        accentB:      p.color(44,  26,  70),
        dotColor:     p.color(100,  72, 138),
        progress:     0,
        showBlinkDot: false,
        pulse:        0,
    };

    switch (state) {
        case "Recording": {
            const elapsedMs = paused && pausedRecordElapsed !== null
                ? pausedRecordElapsed
                : Math.max(0, performance.now() - recordStartTime);
            const elapsedSec = (elapsedMs / 1000).toFixed(1);
            return {
                ...chrome,
                title:        t("rec_title_recording"),
                subtitle:     `${t('rec_sub_press_e_end').replace('{KEY}', recordKey)}  ${elapsedSec}s / ${maxSec}s`,
                badge:        "REC",
                accentA:      p.color(175,  38,  88),
                accentB:      p.color(105,  18,  50),
                panelFill:    p.color(42,   16,  55),
                panelShade:   p.color(28,   10,  40),
                dotColor:     p.color(240,  65, 115),
                textMain:     p.color(240, 215, 235),
                textSub:      p.color(195, 148, 175),
                progress:     Math.min(1, elapsedMs / maxRecordTime),
                showBlinkDot: Math.floor(performance.now() / 450) % 2 === 0,
                pulse:        (Math.sin(performance.now() / 200) + 1) / 2,
            };
        }
        case "ReadyToReplay": {
            const recordedSec = ((recordEndTime - recordStartTime) / 1000).toFixed(1);
            return {
                ...chrome,
                title:        t("rec_title_ready"),
                subtitle:     `${t('rec_sub_ready_prefix').replace('{REPLAY}', replayKey).replace('{RECORD}', recordKey)}  ${recordedSec}s`,
                badge:        "READY",
                accentA:      p.color(58,  98, 130),
                accentB:      p.color(34,  62,  90),
                panelFill:    p.color(28,  22,  55),
                panelShade:   p.color(18,  14,  40),
                dotColor:     p.color(105, 165, 210),
                textMain:     p.color(210, 215, 240),
                textSub:      p.color(138, 148, 185),
                progress:     1,
                showBlinkDot: false,
                pulse:        0,
            };
        }
        case "Replaying": {
            const totalMs = Math.max(1, recordEndTime - recordStartTime);
            const replayElapsedMs = paused && pausedReplayElapsed !== null
                ? pausedReplayElapsed
                : Math.min(Math.max(0, performance.now() - replayStartTime), totalMs);
            const replayElapsedSec = (replayElapsedMs / 1000).toFixed(1);
            const totalReplaySec = (totalMs / 1000).toFixed(1);
            return {
                ...chrome,
                title:        t("rec_title_replaying"),
                subtitle:     `${t('rec_sub_press_replay_end').replace('{KEY}', replayKey)}  ${replayElapsedSec}s / ${totalReplaySec}s`,
                badge:        "PLAY",
                accentA:      p.color(115,  75, 155),
                accentB:      p.color(72,   42, 105),
                panelFill:    p.color(36,   20,  62),
                panelShade:   p.color(22,   12,  44),
                dotColor:     p.color(175, 138, 215),
                textMain:     p.color(218, 200, 240),
                textSub:      p.color(155, 128, 185),
                progress:     Math.min(1, replayElapsedMs / totalMs),
                showBlinkDot: Math.floor(performance.now() / 700) % 2 === 0,
                pulse:        0,
            };
        }
        default:
            return {
                ...base,
                title:    t('rec_title_idle').replace('{KEY}', recordKey),
                subtitle: `${t('rec_sub_max')} ${maxSec}s`,
                badge:    "IDLE",
            };
    }
}

export class RecordSystem {
    constructor(player, maxRecordTime, addReplayerCallback, removeReplayerCallback, entities = null) {
        import RecordStateManager from "./RecordStateManager.js";
        import RecordInputHandler from "./RecordInputHandler.js";
        import RecordUI from "./RecordUI.js";

        // 门面类，协调各子系统
        class RecordSystem {
            constructor(player, entities, maxRecordTime) {
                this.stateManager = new RecordStateManager(maxRecordTime);
                this.inputHandler = new RecordInputHandler(player, entities);
                this.ui = new RecordUI();
                this.player = player;
                this.entities = entities;
                this.maxRecordTime = maxRecordTime;
                // 其他初始化...
            }

            // 代理方法
            process(event, keyBindingManager) {
                return this.inputHandler.process(event, keyBindingManager);
            }

            draw(p, ui, player, hudVisible) {
                return this.ui.draw(p, ui, player, hudVisible, this.stateManager);
            }

            pauseForGamePause() {
                this.stateManager.pauseForGamePause();
            }

            resumeFromGamePause() {
                this.stateManager.resumeFromGamePause();
            }

            // 其他协调方法...
        }

        export default RecordSystem;
                "record": this.finishRecordingByKey,
                "RecordTimeout": this.finishRecordingByTimeout,
            },
            "ReadyToReplay": {
                "replay": this.beingReplay,
                "record": this.restartRecording,
            },
            "Replaying": {
                "ReplayTimeout": this.finishReplayAndReset,
                "replay": this.finishReplayByKey,     // 按 R 键提前停止回放
            },
        }

        //决定状态的属性
        this.state = "ReadyToRecord";
        this.clip = null;
        this.recordStartTime = -1;
        this.recordEndTime = -1;
        this.recordTimer = null;
        this.replayTimer = null;
        this.eventTimers = [];
        this._replayRecords = [];
        this._replayCursor = 0;
        this.replayer = null;
        this._pausedRecordElapsed = null;
        this._pausedReplayElapsed = null;
        this._airBlockFlashMs = -9999;  // timestamp of last blocked-in-air attempt
        this._hudVisible = true;
        this.eventDispatchTimer = null; // 规范声明
        // 已移除梯子系统相关引用
        this.entities = entities; // 新增：保存 entities 引用

          
    }

    setHudVisible(visible) {
        this._hudVisible = !!visible;
    }

    isHudVisible() {
        return this._hudVisible;
    }

    createListeners() {
        window.addEventListener("keydown", this._keydownHandler);
        window.addEventListener("keyup", this._keyupHandler);
    }
    clearAllListenersAndTimers() {
        window.removeEventListener("keydown", this._keydownHandler);
        window.removeEventListener("keyup", this._keyupHandler);
        if(this.clip) {
            this.clip.clearListeners();
        }
        if(this.recordTimer) {
            clearTimeout(this.recordTimer);
        }
        if(this.replayTimer) {
            clearTimeout(this.replayTimer);
        }
        // eventDispatchTimer 已无赋值，无需清理
        if(this.eventTimers.length !== 0) {
            for(const timer of this.eventTimers) {
                clearTimeout(timer);
            }
        }
        this.eventTimers = [];
        this._replayRecords = [];
        this._replayCursor = 0;
        this._pausedRecordElapsed = null;
        this._pausedReplayElapsed = null;
        if(this.replayer) {
            this.removeReplayer();
        }
    }
    // event: window raw keyboard event -> returns: string (intent) or null
    eventHandler(event) {
        if (isGamePaused()) {
            this.resetInputState();
            return;
        }
        const intent = this.process(event);
        if (intent !== null) {
            // Block starting a new recording while player is airborne
            if (intent === "record" && (this.state === "ReadyToRecord" || this.state === "ReadyToReplay")) {
                const cc = this.player?.controllerManager?.currentControlComponent;
                const isOnGround = cc?.abilityCondition?.["isOnGround"] ?? true;
                if (!isOnGround) {
                    this._airBlockFlashMs = performance.now();
                    return;
                }
            }
            this.transition(intent);
        }
    }

    resetInputState() {
        this.pressedKeys.clear();
    }

    pauseForGamePause() {
        // 录制暂停
        if (this.state === "Recording") {
            if (this._pausedRecordElapsed !== null) return;
            this._pausedRecordElapsed = Math.max(0, performance.now() - this.recordStartTime);
            if (this.recordTimer) {
                clearTimeout(this.recordTimer);
                this.recordTimer = null;
            }
            return;
        }
        // 回放暂停
        if (this.state === "Replaying") {
            if (this._pausedReplayElapsed !== null) return;
            const totalMs = Math.max(1, this.recordEndTime - this.recordStartTime);
            this._pausedReplayElapsed = Math.min(
                Math.max(0, performance.now() - this.replayStartTime),
                totalMs
            );
            if (this.replayTimer) {
                clearTimeout(this.replayTimer);
                this.replayTimer = null;
            }
            if (this.eventDispatchTimer) {
                clearTimeout(this.eventDispatchTimer);
                this.eventDispatchTimer = null;
            }
            this.eventTimers = [];
            this._replayRecords = [];
            this._replayCursor = 0;
        }
    }

    resumeFromGamePause() {
        // 录制恢复
        if (this.state === "Recording") {
            if (this._pausedRecordElapsed === null) return;
            const elapsed = this._pausedRecordElapsed;
            const remaining = Math.max(0, this.maxRecordTime - elapsed);
            this.recordStartTime = performance.now() - elapsed;
            this.recordTimer = setTimeout(() => {
                this.transition("RecordTimeout");
            }, remaining);
            this._pausedRecordElapsed = null;
            return;
        }
        // 回放恢复
        if (this.state === "Replaying") {
            if (this._pausedReplayElapsed === null) return;
            const elapsed = this._pausedReplayElapsed;
            const totalMs = Math.max(1, this.recordEndTime - this.recordStartTime);
            const remaining = Math.max(0, totalMs - elapsed);
            this.replayStartTime = performance.now() - elapsed;
            this.replayTimer = setTimeout(() => {
                this.transition("ReplayTimeout");
            }, remaining);
            this.dispatchEvent(elapsed);
            this._pausedReplayElapsed = null;
        }
    }
    // -> return: boolean
    beingRecordingFromIdle() {
        this.recordStartTime = performance.now();
        this.clip = new Clip(this.player.x, this.player.y, this.recordStartTime);
        const heldKeys = this.player.controllerManager.currentControlMode.eventProcesser.pressedKeys;
        this.clip.injectHeldKeys(heldKeys);
        this.clip.createListeners();
        this.recordTimer = setTimeout(() => {
            this.transition("RecordTimeout");
        }, this.maxRecordTime);
    }
    // 合并重录逻辑，既清理定时器也重置录制状态
    restartRecording() {
        this.recordStartTime = performance.now();
        this.recordEndTime = -1;
        this.recordTimer = setTimeout(() => {
            this.transition("RecordTimeout");
        }, this.maxRecordTime);
        this.removeReplayer();
        this.replayer = null;
        this.clip = new Clip(this.player.x, this.player.y, this.recordStartTime);
        const heldKeys = this.player.controllerManager.currentControlMode.eventProcesser.pressedKeys;
        this.clip.injectHeldKeys(heldKeys);
        this.clip.createListeners();
    }
        // 已移除无效的 _clearRecordLadderStateTimer
    // -> return:
    finishRecordingByKey() {
        this.recordEndTime = performance.now();
        this.clip.clearListeners();
        clearTimeout(this.recordTimer);
        this.recordTimer = null;
        // 已移除无效的 _clearRecordLadderStateTimer 调用
        this.replayer = this.addReplayer(this.clip.getStartX(), this.clip.getStartY());
        //this.printRecords();
    }

    finishRecordingByTimeout() {
        this.recordEndTime = performance.now();
        this.clip.clearListeners();
        this.recordTimer = null;
        // 已移除无效的 _clearRecordLadderStateTimer 调用
        this.replayer = this.addReplayer(this.clip.getStartX(), this.clip.getStartY());
        //this.printRecords();
    }
        // 已移除重复定义的 pauseForGamePause/resumeFromGamePause/restartRecording
    dispatchEvent(elapsedMs = 0) {
        const records = this.clip.getRecords() || [];
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
        this.flushDueReplayEvents();
        this.scheduleNextReplayEvent();
    }

    // 已移除所有梯子帧相关方法

    scheduleNextReplayEvent() {
        // eventDispatchTimer 已无赋值，无需清理

        if (this._replayCursor >= this._replayRecords.length) {
            return;
        }

        const nextRecord = this._replayRecords[this._replayCursor];
        const elapsed = Math.max(0, performance.now() - this.replayStartTime);
        const delay = Math.max(0, nextRecord.time - elapsed);

        this.eventDispatchTimer = setTimeout(() => {
            this.flushDueReplayEvents();
            this.scheduleNextReplayEvent();
        }, delay);
    }

    flushDueReplayEvents() {
        const elapsed = Math.max(0, performance.now() - this.replayStartTime);
        while (
            this._replayCursor < this._replayRecords.length
            && this._replayRecords[this._replayCursor].time <= elapsed + 0.5
        ) {
            this.triggerKey(this._replayRecords[this._replayCursor]);
            this._replayCursor += 1;
        }
    }

    triggerKey(record){
        // 让所有分身也能响应回放事件，主动调用其 ControllerManager
        if (this.entities) {
            for (const entity of this.entities) {
                if (entity && entity.type === "replayer" && entity.controllerManager && typeof entity.controllerManager.controlEntry === "function") {
                    // 构造一个简化的事件对象，仅包含 code 和 keyType
                    const simpleEvent = { code: record["code"], type: record["keyType"], isReplay: true };
                    entity.controllerManager.controlEntry(simpleEvent);
                }
            }
        }
    }

    beingReplay() {
        markLevel1ReplayStarted();
        if (this.replayer) {
            this.replayer.isReplaying = true;
            // 自动确保监听器已注册
            this.replayer.createListeners && this.replayer.createListeners();
        }
        this._pausedReplayElapsed = null;
        this.replayStartTime = performance.now();

        this.replayTimer = setTimeout(() => {
            this.transition("ReplayTimeout");
        }, this.recordEndTime - this.recordStartTime);

        this.dispatchEvent();
    }

    finishReplayAndReset() {
        if (this.replayer) this.replayer.isReplaying = false;
        this.replayTimer = null;
        if (this.eventDispatchTimer) {
            clearTimeout(this.eventDispatchTimer);
            this.eventDispatchTimer = null;
        }
        this.eventTimers = [];
        this._replayRecords = [];
        this._replayCursor = 0;
        this._pausedReplayElapsed = null;
        if (this.replayer && typeof this.replayer.inLevelReset === 'function') {
            this.replayer.inLevelReset();
        }
    }

    finishReplayByKey() {
        // 按 R 键提前停止回放
        if (this.replayer) this.replayer.isReplaying = false;
        if (this.replayTimer) clearTimeout(this.replayTimer);
        this.replayTimer = null;
        if (this.eventDispatchTimer) {
            clearTimeout(this.eventDispatchTimer);
            this.eventDispatchTimer = null;
        }
        for (const timer of this.eventTimers) {
            clearTimeout(timer);
        }
        this.eventTimers = [];
        this._replayRecords = [];
        this._replayCursor = 0;
        this._pausedReplayElapsed = null;
        // 重置 replayer 位置和输入状态，保留监听器供下次回放使用
        if (this.replayer && typeof this.replayer.inLevelReset === 'function') {
            this.replayer.inLevelReset();
        }
    }

    process(event) {
        // 通过 KeyBindingManager 查询键码对应的意图
        const intent = this.keyBindingManager.getIntentByKey(event.code);
        
        // 只处理 record 和 replay 意图
        if (intent !== "record" && intent !== "replay") {
            return null;
        }
        
        if (event.type === "keydown") {
            if (this.pressedKeys.has(intent)) {
                return null;
            } else {
                this.pressedKeys.add(intent);
                return intent;  // 返回意图而不是事件
            }
        }
        
        if (event.type === "keyup") {
            this.pressedKeys.delete(intent);
            return null;
        }
    }
    //input: string -> return: void
    transition(input) {
        const nextState = this.states[this.state][input];
        if(!nextState){
            return false;
        } else {
            const actionFunc = this.actions[this.state][input];
            this.state = nextState;
            actionFunc.call(this);
        }
    }

    draw(p) {
        if (!this._hudVisible) {
            return;
        }

        const ui = getRecordUiState(
            p,
            this.state,
            this.maxRecordTime,
            this.recordStartTime,
            this.recordEndTime,
            this.replayStartTime,
            isGamePaused(),
            this._pausedRecordElapsed,
            this._pausedReplayElapsed
        );

        const panelW = Math.min(540, p.width - 32);
        const panelH = 92;
        const panelX = Math.floor((p.width - panelW) / 2);
        const panelY = 14;
        const badgeW = 104;
        const progressW = panelW - 32;
        const progressH = 8;
        const progressX = panelX + 16;
        const progressY = panelY + panelH - 16;
        const pulseSize = 14 + ui.pulse * 8;

        // Air-block state
        const _cc = this.player?.controllerManager?.currentControlComponent;
        const _isOnGround = _cc?.abilityCondition?.["isOnGround"] ?? true;
        const isAirBlocked = (this.state === "ReadyToRecord" || this.state === "ReadyToReplay") && !_isOnGround;
        const airBlockAge = performance.now() - this._airBlockFlashMs;
        // Shake: brief horizontal oscillation decaying over 350ms
        const shakeX = airBlockAge < 350
            ? Math.sin((airBlockAge / 350) * Math.PI * 6) * 5 * (1 - airBlockAge / 350)
            : 0;

        p.push();
        p.resetMatrix();
        p.translate(shakeX, 0);
        p.noStroke();
        if (Assets.customFont) {
            p.textFont(Assets.customFont);
        }

        // === PANEL CHROME ===
        // Outermost near-black border
        p.fill(ui.frameDark);
        p.rect(panelX - 4, panelY - 4, panelW + 8, panelH + 8);
        // Metallic purple inner border
        p.fill(ui.frameLight);
        p.rect(panelX - 2, panelY - 2, panelW + 4, panelH + 4);
        // Panel body layers
        p.fill(ui.panelShade);
        p.rect(panelX, panelY, panelW, panelH);
        p.fill(ui.panelFill);
        p.rect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
        // Subtle cool-purple shimmer strip at top
        p.fill(155, 95, 210, 16);
        p.rect(panelX + 4, panelY + 4, panelW - 8, 7);

        // === CORNER RIVETS (pixel steampunk detail) ===
        p.fill(72, 40, 108);
        p.rect(panelX + 4,          panelY + 4,          5, 5);
        p.rect(panelX + panelW - 9, panelY + 4,          5, 5);
        p.rect(panelX + 4,          panelY + panelH - 9, 5, 5);
        p.rect(panelX + panelW - 9, panelY + panelH - 9, 5, 5);
        // Rivet glint pixel
        p.fill(148, 98, 195, 200);
        p.rect(panelX + 5,          panelY + 5,          2, 2);
        p.rect(panelX + panelW - 8, panelY + 5,          2, 2);
        p.rect(panelX + 5,          panelY + panelH - 8, 2, 2);
        p.rect(panelX + panelW - 8, panelY + panelH - 8, 2, 2);

        // === BADGE AREA ===
        p.fill(ui.frameDark);
        p.rect(panelX + 12, panelY + 12, badgeW + 4, 38);
        p.fill(ui.accentB);
        p.rect(panelX + 14, panelY + 14, badgeW, 34);
        // Top accent stripe
        p.fill(ui.accentA);
        p.rect(panelX + 16, panelY + 16, badgeW - 4, 8);
        // Badge rivets on stripe
        p.fill(ui.frameDark);
        p.rect(panelX + 20,  panelY + 18, 3, 3);
        p.rect(panelX + 108, panelY + 18, 3, 3);

        // Recording crimson-rose pulse glow
        if (ui.badge === "REC") {
            p.fill(205, 38, 95, 36 + ui.pulse * 44);
            p.circle(panelX + 40, panelY + 33, pulseSize + 10);
            p.fill(205, 38, 95, 22 + ui.pulse * 24);
            p.circle(panelX + 40, panelY + 33, pulseSize);
        }

        // Indicator diamond (rotated square — pixel-art style)
        p.fill(ui.showBlinkDot ? ui.dotColor : p.color(38, 20, 60));
        p.push();
        p.translate(panelX + 40, panelY + 33);
        p.rotate(Math.PI / 4);
        p.rect(-5, -5, 10, 10);
        p.pop();
        if (ui.showBlinkDot) {
            p.fill(255, 225);
            p.push();
            p.translate(panelX + 40, panelY + 33);
            p.rotate(Math.PI / 4);
            p.rect(-2, -2, 4, 4);
            p.pop();
        }

        // Badge label
        p.fill(ui.textMain);
        p.textAlign(p.LEFT, p.CENTER);
        p.textSize(11);
        p.textStyle(p.BOLD);
        p.text(ui.badge, panelX + 52, panelY + 33);

        // Title + subtitle
        p.textStyle(p.BOLD);
        p.textSize(19);
        p.text(ui.title, panelX + 136, panelY + 31);

        p.textStyle(p.NORMAL);
        p.fill(ui.textSub);
        p.textSize(11);
        p.text(ui.subtitle, panelX + 136, panelY + 54);

        // === PROGRESS BAR ===
        p.fill(ui.frameDark);
        p.rect(progressX - 2, progressY - 2, progressW + 4, progressH + 4);
        // Dark purple track
        p.fill(14, 7, 28);
        p.rect(progressX, progressY, progressW, progressH);
        // Filled portion
        p.fill(ui.accentA);
        const barFillW = Math.max(0, progressW * ui.progress - 2);
        if (barFillW > 0) {
            p.rect(progressX + 1, progressY + 1, barFillW, progressH - 2);
        }
        // Quarter tick marks (industrial gauge look)
        p.fill(ui.frameDark);
        for (let i = 1; i < 4; i++) {
            p.rect(progressX + Math.floor(progressW * i / 4), progressY, 1, progressH);
        }

        // HUD label
        p.fill(ui.textSub);
        p.textAlign(p.RIGHT, p.CENTER);
        p.textSize(10);
        p.text(t("rec_hud_label"), panelX + panelW - 14, panelY + 20);

        // === AIR BLOCK OVERLAY ===
        if (isAirBlocked) {
            p.fill(10, 5, 28, 135);
            p.rect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
            p.fill(185, 155, 220, 200);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(13);
            p.textStyle(p.BOLD);
            p.text(t("rec_blocked_air"), panelX + panelW / 2, panelY + panelH / 2);
            p.textStyle(p.NORMAL);
        }

        // Crimson-purple flash on blocked attempt
        if (airBlockAge < 380) {
            const flashAlpha = (1 - airBlockAge / 380) * 140;
            p.fill(185, 28, 80, flashAlpha);
            p.rect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
        }

        p.pop();
    }
    printRecords() {
        const records = this.clip.getRecords();
        for( const record of records) {
            console.log("eventType: " + record["keyType"]);
        }
    }


}
