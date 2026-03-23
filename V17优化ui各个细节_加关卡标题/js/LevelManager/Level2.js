import { Player, Ground, Wall, Portal, Spike, Button } from "../GameEntityModel/index.js";
import { CollisionSystem } from "../CollideSystem/CollisionSystem.js";
import { PhysicsSystem } from "../PhysicsSystem/PhysicsSystem.js";
import { RecordSystem } from "../RecordSystem/RecordSystem.js";
import { BaseLevel } from "./BaseLevel.js";

export class Level2 extends BaseLevel {
    constructor(p, eventBus) {
        super(p, eventBus);
        this.bgAssetKey = "bgImageLevel2";
        const wallThickness = 20;
        this.entities.add(new Wall(0, 0, wallThickness, p.height));
        this.entities.add(new Wall(p.width - wallThickness, 0, wallThickness, p.height));
        this.button1 = new Button(700, 80, 20, 5);//右按钮
        this.button2 = new Button(215, 80, 20, 5);//左按钮
        this.portal = new Portal(1025, 280, 50, 50);
        this.entities.add(new Ground(0, 0, p.width, 80));//地面铺满整个画面
        this.rightPlatform = new Ground(1000, 250, 100, 30, true);//平台右
        this.entities.add(this.rightPlatform);
        
        this.entities.add(this.portal);

        this.entities.add(this.button1);
        this.entities.add(this.button2);

        const player = new Player(50, 80, 40, 40);
        player.createListeners();
        this.entities.add(player);

        this.recordSystem = new RecordSystem(player, 5000, (x, y) => this.addReplayer(x, y), () => this.removeReplayer());
        this.recordSystem.createListeners();

        this.physicsSystem = new PhysicsSystem(this.entities);
        this.collisionSystem = new CollisionSystem(this.entities, eventBus);

        // 电线传导状态：0~1 表示电力从按钮传向门的进度
        this._wire1Progress = 0;
        this._wire2Progress = 0;
        // 门上方左右指示灯；两灯同时点亮后会锁存常亮
        this._leftIndicatorOn = false;
        this._rightIndicatorOn = false;
        this._portalUnlocked = false;
        // 动画帧计数，供电弧锯齿动画使用
        this._wireFrame = 0;
    }

    updateCollision(p = this.p, eventBus = this.eventBus) {
        this.collisionSystem.collisionEntry(eventBus);

        // 按住时推进电力，松开则重置
        const wireSpeed = 0.050; // 约 100 帧（~1.7 秒）传到门
        if (this.button1.isPressed) {
            this._wire1Progress = Math.min(1, this._wire1Progress + wireSpeed);
        } else {
            this._wire1Progress = 0;
        }
        if (this.button2.isPressed) {
            this._wire2Progress = Math.min(1, this._wire2Progress + wireSpeed);
        } else {
            this._wire2Progress = 0;
        }

        // wire1=右按钮，wire2=左按钮
        const rightArrived = this._wire1Progress >= 1.0;
        const leftArrived = this._wire2Progress >= 1.0;

        // 未完全解锁前，指示灯只在对应电弧到达时点亮
        this._leftIndicatorOn = leftArrived;
        this._rightIndicatorOn = rightArrived;

        // 仅当两路同时送达门时，进入永久开启/常亮状态
        if (!this._portalUnlocked && leftArrived && rightArrived) {
            this._portalUnlocked = true;
            this.portal.openPortal();
        }

        if (this._portalUnlocked) {
            this._leftIndicatorOn = true;
            this._rightIndicatorOn = true;
        }
    }

    draw(p = this.p) {
        this._wireFrame++;

        // 先画地刺，再画地面，让地面遮住地刺底座
        for(const entity of this.entities) {
            if(entity.type === "spike") {
                entity.draw(p);
            }
        }

        for(const entity of this.entities) {
            if(entity.type === "ground") {
                entity.draw(p);
            }
        }

        // 电线绘制在其他实体之下（门、玩家等在上面）
        this._drawWires(p);

        for(const entity of this.entities) {
            if(entity.type !== "spike" && entity.type !== "ground") {
                entity.draw(p);
            }
        }

        this._drawPortalIndicators(p);

        //绘制录制ui
        this.recordSystem.draw && this.recordSystem.draw(p);

        this.button1.releaseButton();
        this.button2.releaseButton();
    }

    // ─── 电线绘制 ───────────────────────────────────────────────

    _drawWires(p) {
        // 按钮顶部中心
        const b1x = this.button1.x + this.button1.collider.w / 2;
        const b1y = this.button1.y + this.button1.collider.h;
        const b2x = this.button2.x + this.button2.collider.w / 2;
        const b2y = this.button2.y + this.button2.collider.h;
        // 走线规则：地板水平 -> 平台左边缘垂直上升 -> 平台高度水平到门x
        const platformLeftX = this.rightPlatform.x;
        const platformY = this.rightPlatform.y + this.rightPlatform.collider.h;
        const gateX = this.portal.x + this.portal.collider.w / 2;

        const wire1Path = [
            { x: b1x, y: b1y },
            { x: platformLeftX, y: b1y },
            { x: platformLeftX, y: platformY },
            { x: gateX, y: platformY },
        ];
        const wire2Path = [
            { x: b2x, y: b2y },
            { x: platformLeftX, y: b2y },
            { x: platformLeftX, y: platformY },
            { x: gateX, y: platformY },
        ];

        this._drawOneWire(p, wire1Path, this._wire1Progress);
        this._drawOneWire(p, wire2Path, this._wire2Progress);
    }

    _drawOneWire(p, path, progress) {
        p.push();
        p.noFill();

        // 静态电缆底色
        p.strokeWeight(2);
        p.stroke(45, 45, 65);
        this._drawPolylineLine(p, path);

        if (progress > 0) {
            const partial = this._slicePolylineByProgress(path, progress);
            const ex = partial.endX;
            const ey = partial.endY;

            // 外层光晕
            p.stroke(20, 90, 255, 55);
            p.strokeWeight(9);
            this._drawPolylineLine(p, partial.points);

            // 中层光晕
            p.stroke(70, 150, 255, 110);
            p.strokeWeight(4);
            this._drawPolylineLine(p, partial.points);

            // 电弧芯（锯齿动画）
            p.stroke(190, 235, 255, 230);
            p.strokeWeight(1.5);
            this._drawPolylineArc(p, partial.points);

            // 火花头：外光球
            p.noStroke();
            p.fill(80, 160, 255, 130);
            p.ellipse(ex, ey, 14, 14);
            // 火花头：亮核
            p.fill(240, 250, 255);
            p.ellipse(ex, ey, 5, 5);
        }

        p.pop();
    }

    _drawPortalIndicators(p) {
        const px = this.portal.x;
        const py = this.portal.y;
        const pw = this.portal.collider.w;
        const ph = this.portal.collider.h;

        const indicatorY = py + ph + 14;
        const leftX = px + pw * 0.28;
        const rightX = px + pw * 0.72;

        this._drawIndicatorLight(p, leftX, indicatorY, this._leftIndicatorOn, "left");
        this._drawIndicatorLight(p, rightX, indicatorY, this._rightIndicatorOn, "right");
    }

    _drawIndicatorLight(p, x, y, isOn, side) {
        p.push();

        if (isOn) {
            if (side === "left") {
                p.fill(120, 230, 255, 110);
            } else {
                p.fill(140, 255, 170, 110);
            }
            p.noStroke();
            p.ellipse(x, y, 18, 18);

            if (side === "left") {
                p.fill(170, 245, 255, 240);
            } else {
                p.fill(180, 255, 200, 240);
            }
            p.ellipse(x, y, 9, 9);
        } else {
            p.fill(55, 60, 70, 210);
            p.stroke(125, 130, 145, 220);
            p.strokeWeight(1.5);
            p.ellipse(x, y, 10, 10);
        }

        p.pop();
    }

    _drawPolylineLine(p, points) {
        if (!points || points.length < 2) return;
        for (let i = 1; i < points.length; i++) {
            p.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }
    }

    _drawPolylineArc(p, points) {
        if (!points || points.length < 2) return;
        for (let i = 1; i < points.length; i++) {
            this._drawArcLine(p, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }
    }

    _slicePolylineByProgress(points, progress) {
        if (!points || points.length === 0) {
            return { points: [], endX: 0, endY: 0 };
        }
        if (points.length === 1 || progress <= 0) {
            return {
                points: [points[0]],
                endX: points[0].x,
                endY: points[0].y,
            };
        }

        const segmentLens = [];
        let totalLen = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            segmentLens.push(len);
            totalLen += len;
        }

        if (totalLen <= 0) {
            const start = points[0];
            return { points: [start], endX: start.x, endY: start.y };
        }

        const target = Math.min(1, progress) * totalLen;
        let acc = 0;
        const partialPoints = [{ x: points[0].x, y: points[0].y }];

        for (let i = 1; i < points.length; i++) {
            const from = points[i - 1];
            const to = points[i];
            const segLen = segmentLens[i - 1];
            const nextAcc = acc + segLen;

            if (target >= nextAcc) {
                partialPoints.push({ x: to.x, y: to.y });
                acc = nextAcc;
                continue;
            }

            const remain = Math.max(0, target - acc);
            const t = segLen > 0 ? remain / segLen : 0;
            const endX = from.x + (to.x - from.x) * t;
            const endY = from.y + (to.y - from.y) * t;
            partialPoints.push({ x: endX, y: endY });
            return { points: partialPoints, endX, endY };
        }

        const last = points[points.length - 1];
        return { points: partialPoints, endX: last.x, endY: last.y };
    }

    // 带随帧抖动的锯齿电弧线
    _drawArcLine(p, x1, y1, x2, y2) {
        const segs = 10;
        const jitter = 3.5;
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len, ny = dx / len; // 法线方向

        p.beginShape();
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            let vx = p.lerp(x1, x2, t);
            let vy = p.lerp(y1, y2, t);
            if (i > 0 && i < segs) {
                const offset = Math.sin(this._wireFrame * 0.38 + i * 1.85) * jitter;
                vx += nx * offset;
                vy += ny * offset;
            }
            p.vertex(vx, vy);
        }
        p.endShape();
    }
}