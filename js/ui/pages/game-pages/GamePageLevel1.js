import { PageBase } from "../PageBase.js";
import { ButtonBase } from "../../components/ButtonBase.js";
import { HintButton } from "../../components/HintButton.js";
import { WindowPause } from "../../windows/WindowPause.js";
import { WindowSetting } from "../../windows/WindowSetting.js";
import { WindowHint } from "../../windows/WindowHint.js";
import { WindowPrompt } from "../../windows/WindowPrompt.js";
import { AudioManager } from '../../../AudioManager.js';
import { i18n, t } from '../../../i18n.js';
import {
  markLevel1RecordHudOpened,
  resetLevel1PromptState,
} from '../../../GameRuntime/Level1PromptState.js';


export class GamePageLevel1 extends PageBase {
  constructor(switcher, p) {
    super(switcher);
    this._p = p;
    this._isPaused = false;
    this._isRecordHudUnlocked = false;
    this._isModuleInstalled = false;
    this._sceneHintBtn = null;
    this._sceneHintFrontText = null;
    this._sceneHintBackText = null;
    this._sceneHintTextPathMap = {
      zh: 'assets/text/signboard_hint_level1_front_zh.txt',
      en: 'assets/text/signboard_hint_level1_front_en.txt',
    };
    this._sceneHintBackTextPathMap = {
      zh: 'assets/text/signboard_hint_level1_back_zh.txt',
      en: 'assets/text/signboard_hint_level1_back_en.txt',
    };

    const backBtn = new ButtonBase(p, '◀', 0.02 * p.width, 0.03 * p.height, () => {
      console.log('返回按钮手动点击');
      this._resumeGame(); // 切换前先恢复状态
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
        this._unlockRecordHud();
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
    this._windowHint = new WindowHint(p, 1, 'hint_level1', hintX, hintY);

    // 创建模块安装提示框
    this._moduleInstallationPrompt = new WindowPrompt(p, 'module_installation_complete', {
      width: 400,
      padding: 40,
      fontSize: 18,
    });

    // ESC 键监听
    this._onKeyDown = (e) => {
      if (e.code === 'Escape') this._togglePause();
    };
    document.addEventListener('keydown', this._onKeyDown);

    // 监听木牌交互/离开范围事件（来自游戏实体 Signboard 的 eventBus 发布）
    this._onSignboardInteracted = () => {
      if (this._sceneHintBtn) {
        this._hideSceneHintButton();
      } else {
        this._showSceneHintButton();
      }
    };
    this._onSignboardOutOfRange = () => {
      this._hideSceneHintButton();
    };
    if (this.switcher.eventBus) {
      this.switcher.eventBus.subscribe('signboardInteracted', this._onSignboardInteracted);
      this.switcher.eventBus.subscribe('signboardOutOfRange', this._onSignboardOutOfRange);
    }

    this._onLangChange = () => {
      this._loadSceneHintFrontText();
      this._loadSceneHintBackText();
    };
    i18n.onChange(this._onLangChange);

    this._loadSceneHintFrontText();
    this._loadSceneHintBackText();
    resetLevel1PromptState();
    this._applyRecordHudVisibility();
  }

  _getCurrentRecordSystem() {
    return this.switcher?.runtimeLevelManager?.level?.recordSystem || null;
  }

  _applyRecordHudVisibility() {
    const recordSystem = this._getCurrentRecordSystem();
    if (!recordSystem || typeof recordSystem.setHudVisible !== 'function') return;
    recordSystem.setHudVisible(this._isRecordHudUnlocked);
  }

  _unlockRecordHud() {
    markLevel1RecordHudOpened();
    if (this._isRecordHudUnlocked) return;
    this._isRecordHudUnlocked = true;
    this._applyRecordHudVisibility();
  }

  async _loadSceneHintFrontText() {
    const lang = i18n.getLang() || 'en';
    const primaryPath = this._sceneHintTextPathMap[lang] || this._sceneHintTextPathMap.en;
    const fallbackPath = this._sceneHintTextPathMap.en;

    try {
      let response = await fetch(primaryPath);
      if (!response.ok && primaryPath !== fallbackPath) {
        response = await fetch(fallbackPath);
      }
      if (!response.ok) return;

      this._sceneHintFrontText = await response.text();

      if (this._sceneHintBtn) {
        this._sceneHintBtn.setFrontText(this._sceneHintFrontText);
      }
    } catch {
      // 忽略加载失败，保留默认文案
    }
  }

  async _loadSceneHintBackText() {
    const lang = i18n.getLang() || 'en';
    const primaryPath = this._sceneHintBackTextPathMap[lang] || this._sceneHintBackTextPathMap.en;
    const fallbackPath = this._sceneHintBackTextPathMap.en;

    try {
      let response = await fetch(primaryPath);
      if (!response.ok && primaryPath !== fallbackPath) {
        response = await fetch(fallbackPath);
      }
      if (!response.ok) return;

      this._sceneHintBackText = await response.text();

      if (this._sceneHintBtn) {
        this._sceneHintBtn.setBackText(this._sceneHintBackText);
      }
    } catch {
      // 忽略加载失败，保留默认文案
    }
  }

  _showSceneHintButton() {
    if (this._sceneHintBtn) return;

    const p = this._p;
    const margin = 16;
    const groundHeight = 80;
    const maxBottomY = p.height - groundHeight;
    const sceneHintW = Math.min(760, Math.max(240, p.width - margin * 2));
    const maxSceneHintH = Math.max(180, maxBottomY - margin);
    const sceneHintH = Math.min(560, Math.max(180, maxSceneHintH));
    const sceneHintX = Math.max(0, Math.min((p.width - sceneHintW) / 2, p.width - sceneHintW));
    const maxSceneHintY = Math.max(0, maxBottomY - sceneHintH);
    const sceneHintY = Math.max(0, Math.min((p.height - sceneHintH) / 2, maxSceneHintY));
    const sceneHintBtn = new HintButton(
      p,
      this._sceneHintFrontText || '发现了一个神秘的告示牌……',
      sceneHintX,
      sceneHintY,
      () => {},
      'scene-hint-notebook',
      this._sceneHintBackText || '按 ESC 或右上角暂停，内有 Hint'
    );

    sceneHintBtn.container.style('width', `${sceneHintW}px`);
    sceneHintBtn.container.style('height', `${sceneHintH}px`);
    sceneHintBtn.container.position(sceneHintX, sceneHintY);

    // 在背面添加"安装模块"按钮（居中靠下）
    if (!this._isModuleInstalled) {
      const moduleBtn = p.createButton(t('module_btn_label'));
      moduleBtn.addClass('hint-back-module-btn');
      moduleBtn.parent(sceneHintBtn.back);
      moduleBtn.mousePressed(() => {
        this._moduleInstallationPrompt.open();
        this._unlockRecordHud();
        this._isModuleInstalled = true;
        this._hideSceneHintButton();
        AudioManager.playSFX('click');
      });
    }

    this._sceneHintBtn = sceneHintBtn;
    this._setSceneHintInteractive(!this._isPaused);
    this.addElement(sceneHintBtn);
  }

  _setSceneHintInteractive(enabled) {
    if (!this._sceneHintBtn) return;
    this._sceneHintBtn.container.style('pointer-events', enabled ? 'auto' : 'none');
    this._sceneHintBtn.container.style('z-index', enabled ? '1100' : '1');
  }

  _hideSceneHintButton() {
    if (!this._sceneHintBtn) return;
    this._sceneHintBtn.remove();
    this._sceneHintBtn = null;
  }

  _togglePause() {
    if (this._windowPause.isVisible) {
      this._resumeGame();
    } else {
      this._pauseGame();
    }
  }

  _pauseGame() {
    this._isPaused = true;
    document.body.classList.add('game-paused');
    this.switcher.eventBus && this.switcher.eventBus.publish("pauseGame");
    this._setSceneHintInteractive(false);
    this._windowPause.open();
  }

  _resumeGame() {
    this._isPaused = false;
    document.body.classList.remove('game-paused');
    this.switcher.eventBus && this.switcher.eventBus.publish("resumeGame");
    this._setSceneHintInteractive(true);
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
    console.log('GamePageLevel1 exit');
    resetLevel1PromptState();
    this._hideSceneHintButton();
    this._isModuleInstalled = false;
    this._isRecordHudUnlocked = false;
    document.body.classList.remove('game-paused');
    document.removeEventListener('keydown', this._onKeyDown);
    if (this.switcher.eventBus) {
      this.switcher.eventBus.unsubscribe('signboardInteracted', this._onSignboardInteracted);
      this.switcher.eventBus.unsubscribe('signboardOutOfRange', this._onSignboardOutOfRange);
    }
    i18n.offChange(this._onLangChange);
    if (this._windowHint) this._windowHint.remove();
    if (this._windowSetting) this._windowSetting.remove();
    if (this._windowPause) this._windowPause.remove();
    if (this._moduleInstallationPrompt) this._moduleInstallationPrompt.remove();
    super.exit();
  }
}