// 通用房间管理器：负责房间的注册、切换、过渡动画等，不依赖具体关卡数据
class RoomManager {
    constructor(p, rooms = [], transitionDurationMs = 260) {
        this.p = p;
        this.rooms = rooms;
        this.activeRoomIndex = 0;
        this._transition = null;
        this._transitionDurationMs = transitionDurationMs;
    }

    setRooms(rooms) {
        this.rooms = rooms;
    }

    getActiveRoom() {
        return this.rooms[this.activeRoomIndex];
    }

    checkRoomTransition(player) {
        const p = this.p;
        const room = this.getActiveRoom();
        const leftBound = this.activeRoomIndex * p.width;
        const rightBound = leftBound + p.width;
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
        const p = this.p;
        if (!this._transition) {
            return this.activeRoomIndex * p.width;
        }
        const t = Math.min(1, this._transition.elapsedMs / this._transitionDurationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const fromX = this._transition.fromRoomIndex * p.width;
        const toX = this._transition.toRoomIndex * p.width;
        return fromX + (toX - fromX) * eased;
    }

    getViewBounds() {
        const p = this.p;
        const cameraX = this.getCameraX();
        return {
            minX: cameraX,
            maxX: cameraX + p.width,
            minY: 0,
            maxY: p.height,
        };
    }
}

export default RoomManager;
