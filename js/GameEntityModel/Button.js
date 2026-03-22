import { GameEntity } from "./GameEntity.js";
import { RectangleCollider } from "../CollideSystem/CollideComponent.js";
import { ColliderShape, ColliderType } from "../CollideSystem/enumerator.js";

export class Button extends GameEntity {
    constructor(x, y, w, h) {
        super(x, y);
        this.type = "button";
        this.movementComponent = null;
        this.collider = new RectangleCollider(ColliderType.TRIGGER, w, h);
        this.isPressed = false;
    }
    pressButton() {
        this.isPressed = true;
    }
    releaseButton() {
        this.isPressed = false;
    }
    draw(p) {
        p.noStroke();
        if(this.isPressed) {
            // 踩下状态：绿色，压缩
            p.fill(50, 255, 50);
            p.rect(this.x, this.y, this.collider.w, this.collider.h / 2);
        } else {
            // 未踩下：红色
            p.fill(255, 50, 50);
            p.rect(this.x, this.y, this.collider.w, this.collider.h);
        }
    }

}
