import { GameEntity } from "./GameEntity.js";
import { RectangleCollider } from "../CollideSystem/CollideComponent.js";
import { ColliderShape, ColliderType } from "../CollideSystem/enumerator.js";
import { Assets } from "../AssetsManager.js";

export class Wall extends GameEntity {
    constructor(x, y, w, h) {
        super(x, y);
        this.type = "wall";
        this.movementComponent = null;
        this.collider = new RectangleCollider(ColliderType.STATIC, w, h);
    }

    draw(p) {
        const w = this.collider.w;
        const h = this.collider.h;
        const tile = Assets.tileImage_wall;

        if (tile) {
            p.image(tile, this.x, this.y, w, h);
        } else {
            p.fill(55, 55, 60);
            p.stroke(25, 25, 30);
            p.strokeWeight(2);
            p.rect(this.x, this.y, w, h);
        }
    }
}