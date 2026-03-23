// Room1.js
// 构建 room1 的工厂函数，导出 buildRoom1
import { Wall, Ground } from "../../GameEntityModel/index.js";
import { Room } from "../Room.js";

export function BuildRoom1(p, config) {
    const { wallThickness } = config;
    return new Room([
        new Wall(p.width - wallThickness, 0, wallThickness, p.height),
        new Ground(0, 0, p.width, 80),
        new Ground(360, 130, 140, 20, true),
        new Ground(600, 200, 160, 20, true),
    ], {
        left: { targetRoomIndex: 0 },
    });
}
