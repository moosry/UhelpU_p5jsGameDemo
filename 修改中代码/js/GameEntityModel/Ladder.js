// Ladder.js — 通用梯子实体，自动处理爬梯输入与状态
import { GameEntity } from "./GameEntity.js";

export class Ladder extends GameEntity {
    /**
     * @param {number} x - 梯子左上角 x
     * @param {number} y - 梯子底部 y
     * @param {number} w - 梯子宽度
     * @param {number} h - 梯子高度
     */
    constructor(x, y, w, h) {
        super(x, y);
        this.type = "ladder";
        this.w = w;
        this.h = h;
        this.zIndex = -10; // 保证在玩家下方
    }

    draw(p) {
        p.push();
        const leftRailX = this.x + 10;
        const rightRailX = this.x + this.w - 10;
        const topY = this.y + this.h;
        p.stroke(58, 43, 28);
        p.strokeWeight(4);
        p.line(leftRailX, this.y, leftRailX, topY);
        p.line(rightRailX, this.y, rightRailX, topY);
        p.stroke(145, 116, 78);
        p.strokeWeight(3);
        for (let rungY = this.y + 8; rungY <= topY - 8; rungY += 18) {
            p.line(leftRailX, rungY, rightRailX, rungY);
        }
        p.pop();
    }

    // 用于判定玩家是否在梯子范围
    overlapsPlayer(player, marginX = 8, marginY = 16) {
        return (
            player.x < this.x + this.w + marginX &&
            player.x + player.collider.w > this.x - marginX &&
            player.y < this.y + this.h + marginY &&
            player.y + player.collider.h > this.y - marginY
        );
    }
}
