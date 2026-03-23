// Room0.js
// 构建 room0 的工厂函数，导出 buildRoom0
import { Wall, Ground, Spike, Button } from "../../GameEntityModel/index.js";
import { Room } from "../Room.js";

export function BuildRoom0(p, config, ladders, buttons) {
    return new Room([
        new Wall(0, 0, config.wallThickness, p.height),
        new Ground(0, 0, p.width, 80),
        new Ground(80 + config.obstacleOffsetX, config.highPlatformY, 120, config.stepPlatformH, true),
        new Ground(config.leftHighPlatformX, config.highPlatformY, 180, config.highPlatformH, true),
        ...ladders,
        new Ground(config.upperRoomX, config.upperRoomFloorY, config.homeDoorX - config.upperRoomX, config.homeWallThickness, true),
        new Ground(config.homeDoorX + config.homeDoorW, config.upperRoomFloorY, config.upperRoomX + config.upperRoomW - (config.homeDoorX + config.homeDoorW), config.homeWallThickness, true),
        new Wall(config.upperRoomX, config.upperRoomFloorY, config.homeWallThickness, config.upperRoomH),
        new Wall(config.upperRoomX + config.upperRoomW - config.homeWallThickness, config.upperRoomFloorY, config.homeWallThickness, config.upperRoomH),
        new Ground(config.upperRoomX, config.upperRoomFloorY + config.upperRoomH - config.homeWallThickness, config.upperRoomW, config.homeWallThickness, true),
        new Button(buttons[0].x, buttons[0].y, buttons[0].w, buttons[0].h),
        new Button(buttons[1].x, buttons[1].y, buttons[1].w, buttons[1].h),
        new Spike(380 + config.obstacleOffsetX, config.highSpikeW, config.highSpikeW, config.highSpikeH),
        new Ground(460 + config.obstacleOffsetX, config.lowPlatformY, 150, 20, true),
        new Spike(610 + config.obstacleOffsetX, config.highSpikeY, config.highSpikeW, config.highSpikeH),
        new Ground(690 + config.obstacleOffsetX, config.lowPlatformY, 150, 20, true),
        new Spike(840 + config.obstacleOffsetX, config.highSpikeY, config.highSpikeW, config.highSpikeH),
    ], {
        right: { targetRoomIndex: 1 },
    });
}
