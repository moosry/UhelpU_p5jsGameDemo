// LayoutCalculator.js
// 负责动态布局参数计算
import { Ladder } from "../../GameEntityModel/Ladder.js";

export function calculateLevel3Layout(cfg, p) {
    const leftHighPlatformX = 200 + cfg.obstacleOffsetX;
    const leftHighPlatformTopY = cfg.highPlatformY + cfg.highPlatformH;
    const ladderX = leftHighPlatformX + 50;
    const ladderW = 52;
    const ladderBottomY = leftHighPlatformTopY + 6;
    const ladderHeight = cfg.ladderHeight;
    const upperRoomW = cfg.upperRoomW;
    const upperRoomH = cfg.upperRoomH;
    const upperRoomX = ladderX + (ladderW - upperRoomW) / 2;
    const ladderTopY = ladderBottomY + ladderHeight;
    const upperRoomFloorY = ladderTopY;
    // 只让梯子本体延申20像素，布局参数不变
    const ladders = [new Ladder(ladderX, ladderBottomY, ladderW, ladderHeight + 20)];
    const homeWallThickness = cfg.homeWallThickness;
    const homeDoorW = ladderW;
    const homeDoorX = ladderX;
    const homeDoorY = upperRoomFloorY;
    const buttonW = cfg.buttonW;
    const buttonH = cfg.buttonH;
    const buttonY = ladderTopY;
    const leftButtonX = upperRoomX + 32 + 16;
    const rightButtonX = upperRoomX + upperRoomW - 32 - 16 - buttonW;
    const leftButton = { x: leftButtonX, y: buttonY, w: buttonW, h: buttonH };
    const rightButton = { x: rightButtonX, y: buttonY, w: buttonW, h: buttonH };
    return {
        ...cfg,
        leftHighPlatformX,
        leftHighPlatformTopY,
        ladderX,
        ladderW,
        ladderBottomY,
        ladderHeight,
        upperRoomW,
        upperRoomH,
        upperRoomX,
        upperRoomFloorY,
        homeWallThickness,
        homeDoorW,
        homeDoorX,
        homeDoorY,
        leftButton,
        rightButton,
        ladders,
        buttons: [leftButton, rightButton]
    };
}
