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

export default RecordStateManager;
