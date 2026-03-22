
import { PageBase } from "../PageBase.js";
import { ButtonBase } from "../../components/ButtonBase.js";
import { FollowImage } from "../../components/FollowImage.js";
import { Assets } from "../../../AssetsManager.js";
import { t } from '../../../i18n.js';
import { AudioManager } from '../../../AudioManager.js';

export class StaticPageMenu extends PageBase {
  constructor(switcher, p, eventBus) {
    super(switcher);
    this.p = p;
    this.eventBus = eventBus;
  }

  enter() {
    const p = this.p;

    AudioManager.playBGM('menu');

    // PLAY 按钮 → 进入开场动画
    const startBtn = new ButtonBase(p, t('btn_play'), 0.456 * p.width, 0.794 * p.height, () => {
      this.switcher.showOpeningScene(p);
    }, 'start-button');
    startBtn.btn.style('width', 0.088 * p.width + 'px');
    startBtn.btn.style('height', 0.155 * p.height + 'px');
    this.addElement(startBtn);

    // SETTINGS 按钮
    const settingsBtn = new ButtonBase(p, t('btn_settings'), 0.358 * p.width, 0.814 * p.height, () => {
      this.switcher.showSettings(p);
    }, 'settings-button');
    settingsBtn.btn.style('width', 0.06 * p.width + 'px');
    settingsBtn.btn.style('height', 0.11 * p.height + 'px');
    this.addElement(settingsBtn);

    // Credits 按钮
    const creditsBtn = new ButtonBase(p, t('btn_credits'), 0.588 * p.width, 0.822 * p.height, () => {
      this.switcher.showCredits(p);
    }, 'credits-button');
    creditsBtn.btn.style('width', 0.06 * p.width + 'px');
    creditsBtn.btn.style('height', 0.11 * p.height + 'px');
    this.addElement(creditsBtn);

    // 跟随鼠标的动图
    this.follower = new FollowImage(
      p,
      Assets.followerImg1,
      p.width * 0.5,
      p.height * 0.11,
      0.047 * p.width,
      80
    );
  }

  update() {
    if (this.follower) this.follower.update();
  }

  draw() {
    const p = this.p;
    if (Assets.bgImageMenu) {
      p.image(Assets.bgImageMenu, 0, 0, p.width, p.height);
    } else {
      p.background(200, 255, 200);
    }
    if (this.follower) this.follower.draw();
  }
}