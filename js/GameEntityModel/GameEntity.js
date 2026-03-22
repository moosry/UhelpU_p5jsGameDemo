export class GameEntity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.zIndex = 0;  // 绘制层级：较小值先绘制（下层），较大值后绘制（上层）
    }
}