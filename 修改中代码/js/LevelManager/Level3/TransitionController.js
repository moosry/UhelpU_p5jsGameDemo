// TransitionController.js
// 负责房间切换与相机平滑过渡
export class TransitionController {
    constructor(roomCount, roomWidth, transitionDurationMs = 260) {
        this.activeRoomIndex = 0;
        this._transition = null;
        this._transitionDurationMs = transitionDurationMs;
        this.roomCount = roomCount;
        this.roomWidth = roomWidth;
    }

    checkRoomTransition(player, rooms) {
        const room = rooms[this.activeRoomIndex];
        const leftBound = this.activeRoomIndex * this.roomWidth;
        const rightBound = leftBound + this.roomWidth;
        if (player.x + player.collider.w > rightBound && room.exits.right) {
            this.switchRoom(room.exits.right.targetRoomIndex, "right");
        } else if (player.x < leftBound && room.exits.left) {
            this.switchRoom(room.exits.left.targetRoomIndex, "left");
        }
    }

    switchRoom(roomIndex, direction) {
        if (roomIndex === this.activeRoomIndex) return;
        const fromRoomIndex = this.activeRoomIndex;
        this.activeRoomIndex = roomIndex;
        this._transition = {
            fromRoomIndex,
            toRoomIndex: roomIndex,
            direction,
            elapsedMs: 0,
        };
    }

    updateTransition(dt = 16) {
        if (!this._transition) return;
        this._transition.elapsedMs += dt;
        if (this._transition.elapsedMs >= this._transitionDurationMs) {
            this._transition = null;
        }
    }

    getCameraX() {
        if (!this._transition) {
            return this.activeRoomIndex * this.roomWidth;
        }
        const t = Math.min(1, this._transition.elapsedMs / this._transitionDurationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const fromX = this._transition.fromRoomIndex * this.roomWidth;
        const toX = this._transition.toRoomIndex * this.roomWidth;
        return fromX + (toX - fromX) * eased;
    }

    getActiveRoomIndex() {
        return this.activeRoomIndex;
    }
}
