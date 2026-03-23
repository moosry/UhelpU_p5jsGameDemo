// AssembleRooms.js
// 负责组装所有房间并应用世界偏移
import { BuildRoom0 } from "./Room0.js";
import { BuildRoom1 } from "./Room1.js";

export function AssembleRooms(p, config, ladders, buttons) {
    const room0 = BuildRoom0(p, config, ladders, buttons);
    const room1 = BuildRoom1(p, config);
    const rooms = [room0, room1];
    // 应用世界偏移
    for (let i = 0; i < rooms.length; i++) {
        const offsetX = i * p.width;
        for (const entity of rooms[i].entities) {
            entity.x += offsetX;
        }
    }
    return rooms;
}
