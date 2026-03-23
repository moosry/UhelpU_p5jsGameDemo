// 通用相机管理器：负责相机位置、视野边界等
class CameraManager {
    constructor(roomManager) {
        this.roomManager = roomManager;
    }

    getCameraX() {
        return this.roomManager.getCameraX();
    }

    getViewBounds() {
        return this.roomManager.getViewBounds();
    }
}

export default CameraManager;
