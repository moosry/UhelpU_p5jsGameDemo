import { t } from "../i18n.js";
import { shouldShowLevel1PromptByRule } from "../GameRuntime/Level1PromptState.js";
import { KeyPrompt } from "./KeyPrompt.js";

export class TextPrompt extends KeyPrompt {
  constructor(x, y, level = null, options = {}) {
    super(x, y, level, { keys: [] });
    this.type = "textprompt";
    this.textKey = options.textKey || "";
    this.boxWidth = options.width || 280;
    this.boxHeight = options.height || 72;
    this.textSizeValue = options.textSize || 14;
    this.lineHeight = options.lineHeight || Math.round(this.textSizeValue * 1.3);
    this.textColor = options.color || [255, 255, 255];
    this.visibilityRule = options.visibilityRule || "beforeRecordHud";
    this.showDistance = options.showDistance || 50;
    this.hideDistance = options.hideDistance || 150;
  }

  update(p) {
    if (!shouldShowLevel1PromptByRule(this.visibilityRule)) {
      this.targetAlpha = 0;
      this.currentAlpha = 0;
      return;
    }
    super.update(p);
  }

  draw(p) {
    if (this.currentAlpha < 0.01 || !this.textKey) return;

    const alpha = Math.floor(this.currentAlpha * 255);
    const label = t(this.textKey);

    p.push();
    p.translate(this.x, this.y + this.boxHeight);
    p.scale(1, -1);
    p.fill(this.textColor[0], this.textColor[1], this.textColor[2], alpha);
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(this.textSizeValue);
    p.textStyle(p.BOLD);
    p.textLeading(this.lineHeight);
    p.text(label, 0, 0, this.boxWidth, this.boxHeight);
    p.pop();
  }

  _getLayoutBounds() {
    return {
      width: this.boxWidth,
      height: this.boxHeight,
    };
  }
}