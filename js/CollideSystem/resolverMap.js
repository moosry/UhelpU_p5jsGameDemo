import { ColliderShape, ColliderType } from "./enumerator.js";

export const resolverMap = {
    // "DYNAMIC-DYNAMIC": (a, b) => resolveBoth(a, b),
    "DYNAMIC-STATIC-RECTANGLE-RECTANGLE": (a, b) => resolveFirst(a, b),
    "DYNAMIC-DYNAMIC-RECTANGLE-RECTANGLE": (a, b) => resolveDynDyn(a, b),
}

function resolveFirst(a, b) {
    let  collisionMsg= "";

    let vectorX = (a.x+a.collider.w/2) - (b.x+b.collider.w/2);
    let vectorY = (a.y+a.collider.h/2) - (b.y+b.collider.h/2);

    let combinedHalfWidths = a.collider.w/2 + b.collider.w/2;
    let combinedHalfHeights = a.collider.h/2 + b.collider.h/2;

    //collision happened
    let overlapX = combinedHalfWidths - Math.abs(vectorX);
    let overlapY = combinedHalfHeights - Math.abs(vectorY);

    const prevY = (a.prevY !== undefined) ? a.prevY : a.y;
    const prevBottom = prevY;
    const prevTop = prevY + a.collider.h;
    const currBottom = a.y;
    const currTop = a.y + a.collider.h;
    const staBottom = b.y;
    const staTop = b.y + b.collider.h;

    const crossedFromAbove = prevBottom >= staTop && currBottom < staTop;
    const crossedFromBelow = prevTop <= staBottom && currTop > staBottom;

    // 使用帧穿越判定优先决定上下碰撞来源，避免被挤穿平台
    if(crossedFromAbove) {
        collisionMsg = "bottom";
        a.y = staTop;
        return collisionMsg;
    }

    if(crossedFromBelow) {
        collisionMsg = "top";
        a.y = staBottom - a.collider.h;
        return collisionMsg;
    }

    if(overlapX <= overlapY) {
        if(vectorX > 0) {
            collisionMsg = "left";
            a.x = a.x + overlapX;
        } else {
            collisionMsg = "right";
            a.x = a.x - overlapX;
        }
    } else {
        const platformTop = b.y + b.collider.h;

        if(prevY >= platformTop) {
            // 上一帧在平台上方 → 正常落在平台上
            collisionMsg = "bottom";
            a.y = platformTop;
        } else {
            // 上一帧在平台下方 → 推回平台下方，不允许穿过
            collisionMsg = "top";
            a.y = b.y - a.collider.h;
        }
    }
    return collisionMsg;
}

function resolveDynDyn(a, b) {
    const aPrevY = (a.prevY !== undefined) ? a.prevY : a.y;
    const bPrevY = (b.prevY !== undefined) ? b.prevY : b.y;

    const aPrevBottom = aPrevY;
    const aPrevTop = aPrevY + a.collider.h;
    const bPrevBottom = bPrevY;
    const bPrevTop = bPrevY + b.collider.h;

    // A 上一帧在 B 上方：A 踩 B 头，A 精确吸附到 B 顶部
    if(aPrevBottom >= bPrevTop) {
        if(a.headBlockedThisFrame) {
            // A 被平台顶住时，改为压回下方的 B，防止 A/B 互相穿模重叠
            b.y = a.y - b.collider.h;
        } else {
            a.y = b.y + b.collider.h;
        }
        return "a_on_b";
    }

    // B 上一帧在 A 上方：B 踩 A 头，B 精确吸附到 A 顶部
    if(bPrevBottom >= aPrevTop) {
        if(b.headBlockedThisFrame) {
            // B 被平台顶住时，改为压回下方的 A，防止 A/B 互相穿模重叠
            a.y = b.y - a.collider.h;
        } else {
            b.y = a.y + a.collider.h;
        }
        return "b_on_a";
    }

    // 左右方向的相交保留，不做垂直分离
    return "allowed collision";
}