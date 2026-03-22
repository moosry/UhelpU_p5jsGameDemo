import { GameEntity } from "./GameEntity.js";
import { RectangleCollider } from "../CollideSystem/CollideComponent.js";
import { ColliderShape, ColliderType } from "../CollideSystem/enumerator.js";
import { Assets } from "../AssetsManager.js";

export class Ground extends GameEntity {
    constructor(x, y, w, h, isPlatform = false) {
        super(x, y);
        this.type = "ground";
        this.movementComponent = null;
        this.collider = new RectangleCollider(ColliderType.STATIC, w, h);
        this.isPlatform = isPlatform;
    }

    draw(p) {
        const w = this.collider.w;
        const h = this.collider.h;
        const tile = this.isPlatform ? Assets.tileImage_platform : Assets.tileImage_ground;

        if (tile) {
            // y轴翻转环境下绘制贴图：先翻回正常方向再平铺
            p.push();
            p.translate(this.x, this.y + h);
            p.scale(1, -1);
            // 用贴图平铺整个区域
            const tw = tile.width;
            const th = tile.height;
            for (let ty = 0; ty < h; ty += th) {
                for (let tx = 0; tx < w; tx += tw) {
                    const drawW = Math.min(tw, w - tx);
                    const drawH = Math.min(th, h - ty);
                    p.image(tile, tx, ty, drawW, drawH, 0, 0, drawW, drawH);
                }
            }
            p.pop();
        } else {
            p.fill(55, 55, 60);
            p.noStroke();
            p.rect(this.x, this.y, w, h);
        }
    }
}