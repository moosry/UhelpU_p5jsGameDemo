import { Assets } from "../AssetsManager.js";
import { Clip } from "./Clip.js";
import { isGamePaused } from "../GameRuntime/GamePauseState.js";
import { markLevel1ReplayStarted } from "../GameRuntime/Level1PromptState.js";
import { RecordUI } from "./RecordUI.js";
import { KeyBindingManager } from "../KeyBindingSystem/KeyBindingManager.js";


export class RecordSystem {
    constructor(player, maxRecordTime, addReplayerCallback, removeReplayerCallback) {
        //与状态无关的属性
        this.player = player;
        this.maxRecordTime = maxRecordTime;
        this.keyBindingManager = KeyBindingManager.getInstance();
        this.pressedKeys = new Set();
        this.addReplayer = addReplayerCallback;
        this.removeReplayer = removeReplayerCallback;
        this._keydownHandler = (event) => this.eventHandler(event);
        this._keyupHandler = (event) => this.eventHandler(event);
        
        //状态转移规则（使用意图而不是键码）
        this.states = {
            "ReadyToRecord": {
                "record": "Recording",
            },
            "Recording": {
                "record": "ReadyToReplay",
                "RecordTimeout": "ReadyToReplay",
            },
            "ReadyToReplay":{
                "replay": "Replaying",
                "record": "Recording",
            },
            "Replaying": {
                "ReplayTimeout": "ReadyToReplay",
                "replay": "ReadyToReplay",          // 按 R 键提前停止回放
            },
        }
        this.actions = {
            "ReadyToRecord": {
                "record": this.beingRecordingFromIdle,
            },
            "Recording": {
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
        this.eventDispatchTimer = null;
        this._replayRecords = [];
        this._replayCursor = 0;
        this.replayer = null;
        this._pausedRecordElapsed = null;
        this._pausedReplayElapsed = null;
        this._airBlockFlashMs = -9999;  // timestamp of last blocked-in-air attempt
        this._hudVisible = true;

          
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
        if(this.eventDispatchTimer) {
            clearTimeout(this.eventDispatchTimer);
            this.eventDispatchTimer = null;
        }
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
    // -> return:
    finishRecordingByKey() {
        this.recordEndTime = performance.now();
        this.clip.clearListeners();
        clearTimeout(this.recordTimer);
        this.recordTimer = null;
        this.replayer = this.addReplayer(this.clip.getStartX(), this.clip.getStartY());
        //this.printRecords();
    }

    finishRecordingByTimeout() {
        this.recordEndTime = performance.now();
        this.clip.clearListeners();
        this.recordTimer = null;
        this.replayer = this.addReplayer(this.clip.getStartX(), this.clip.getStartY());
        //this.printRecords();
    }
    //
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
    dispatchEvent(elapsedMs = 0) {
        const records = this.clip.getRecords() || [];
        this._replayRecords = records.map((record, index) => ({ ...record, __index: index }));
        this._replayRecords.sort((a, b) => {
            if (a.time === b.time) return a.__index - b.__index;
            return a.time - b.time;
        });

        this._replayCursor = 0;
        // 严格小于：time === elapsedMs 的事件（如注入的 t=0 移动键）不能跳过
        while (
            this._replayCursor < this._replayRecords.length
            && this._replayRecords[this._replayCursor].time < elapsedMs
        ) {
            this._replayCursor += 1;
        }

        // 同步立即触发当前时刻到期的事件（包括 t=0 注入的移动键），不等下一帧
        this.flushDueReplayEvents();
        this.scheduleNextReplayEvent();
    }

    scheduleNextReplayEvent() {
        if (this.eventDispatchTimer) {
            clearTimeout(this.eventDispatchTimer);
            this.eventDispatchTimer = null;
        }

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
        const event = new KeyboardEvent(record["keyType"], { code: record["code"] } );//创建键盘事件
        Object.defineProperty(event, "isReplay", { value: true })
        window.dispatchEvent(event);//发布键盘事件
    }

    beingReplay() {
        markLevel1ReplayStarted();
        if (this.replayer) this.replayer.isReplaying = true;
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
        this.replayer.inLevelReset();
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
        if (this.replayer) this.replayer.inLevelReset();
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

        const ui = RecordUI.getRecordUiState(
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
        if (ui.hudLabel) {
            p.text(ui.hudLabel, panelX + panelW - 14, panelY + 20);
        }

        // === AIR BLOCK OVERLAY ===
        if (isAirBlocked && ui.airBlockText) {
            p.fill(10, 5, 28, 135);
            p.rect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
            p.fill(185, 155, 220, 200);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(13);
            p.textStyle(p.BOLD);
            p.text(ui.airBlockText, panelX + panelW / 2, panelY + panelH / 2);
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
