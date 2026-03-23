import { PageBase } from "../PageBase.js";
import { ButtonBase } from "../../components/ButtonBase.js";
import { WindowPause } from "../../windows/WindowPause.js";
import { WindowSetting } from "../../windows/WindowSetting.js";
import { WindowHint } from "../../windows/WindowHint.js";
import { AudioManager } from '../../../AudioManager.js';

export class GamePageLevel2 extends PageBase {
  constructor(switcher, p) {
    super(switcher);
    this._p = p;

    const backBtn = new ButtonBase(p, '◀', 0.02 * p.width, 0.03 * p.height, () => {
      this._resumeGame();
      this.switcher.eventBus && this.switcher.eventBus.publish("returnLevelChoice");
    }, 'back-button');
    backBtn.btn.style('width', 0.030 * p.width + 'px');
    backBtn.btn.style('height', 0.055 * p.height + 'px');
    this.addElement(backBtn);

    // 暂停按钮
    const pauseBtn = new ButtonBase(p, '⏸', 0.95 * p.width, 0.03 * p.height, () => {
      this._togglePause();
    }, 'pause-button');
    pauseBtn.btn.style('width', 0.030 * p.width + 'px');
    pauseBtn.btn.style('height', 0.055 * p.height + 'px');
    this.addElement(pauseBtn);

    // 暂停窗口
    this._windowPause = new WindowPause(p, {
      onResume: () => this._resumeGame(),
      onSetting: () => {
        this._windowSetting.open();
      },
      onHint: () => {
        this._windowHint.open();
      },
      onBackLevelChoice: () => {
        this._resumeGame();
        this.switcher.eventBus && this.switcher.eventBus.publish("returnLevelChoice");
      },
      onBackMenu: () => {
        this._resumeGame();
        this.switcher.eventBus && this.switcher.eventBus.publish("unloadLevel");
        this.switcher.main.staticSwitcher.showMainMenu(p);
      },
    });

    const settingX = Math.round(p.width - 320 - 24);
    const settingY = Math.round(p.height * 0.16);
    this._windowSetting = new WindowSetting(p, settingX, settingY);
    this._windowSetting.onBGMChange = (value) => AudioManager.setBGMVolume(value);
    this._windowSetting.onSFXChange = (value) => AudioManager.setSFXVolume(value);
    this._windowSetting.setBGMVolume(AudioManager.getBGMVolume());
    this._windowSetting.setSFXVolume(AudioManager.getSFXVolume());

    const hintX = 24;
    const hintY = Math.round(p.height * 0.16);
    this._windowHint = new WindowHint(p, 2, 'hint_level2', hintX, hintY);

    // ESC 键监听
    this._onKeyDown = (e) => {
      if (e.code === 'Escape') this._togglePause();
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  _togglePause() {
    if (this._windowPause.isVisible) {
      this._resumeGame();
    } else {
      this._pauseGame();
    }
  }

  _pauseGame() {
    this.switcher.eventBus && this.switcher.eventBus.publish("pauseGame");
    this._windowPause.open();
  }

  _resumeGame() {
    this.switcher.eventBus && this.switcher.eventBus.publish("resumeGame");
    this._windowPause.close();
    this._windowSetting.close();
    this._windowHint.close();
  }

  update() {
    // 游戏逻辑由 main.js 的 levelManager.update() 驱动
  }

  draw() {
    // 游戏绘制由 main.js 的 levelManager.update() 驱动
  }

  exit() {
    document.removeEventListener('keydown', this._onKeyDown);
    if (this._windowHint) this._windowHint.remove();
    if (this._windowSetting) this._windowSetting.remove();
    if (this._windowPause) this._windowPause.remove();
    super.exit();
  }
}
