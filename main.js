// ...existing code...

import { SwitcherMain } from "./js/switchers/SwitcherMain.js";
import { EventBus } from "./js/EventSystem/EventBus.js";
import { LevelManager } from "./js/LevelManager/LevelManager.js";
import { StaticPageResult } from "./js/ui/pages/static-pages/StaticPageResult.js";
import { StaticPageWin } from "./js/ui/pages/static-pages/StaticPageWin.js";
import { Assets } from "./js/AssetsManager.js";
import { AudioManager } from "./js/AudioManager.js";
// 其他原有导入保持不变

// 纯 p5 实例模式，所有依赖都通过 p 实例传递
new p5((p) => {
  let switcher, eventBus, levelManager;

  p.setup = async () => {
    p.createCanvas(1280, 720);

    // p5.js 2.0: 在 setup 中用 await 加载资源
    await Assets.loadAll(p);

    eventBus = new EventBus();
    switcher = new SwitcherMain(p, eventBus);
    levelManager = new LevelManager(p, eventBus);

    // 订阅事件：UI响应，全部传递 p 实例和 eventBus
    eventBus.subscribe("loadLevel", (levelIndex) => {
      if (levelIndex === "level1") {
        AudioManager.playBGM("level1");
      } else if (levelIndex === "level2") {
        AudioManager.playBGM("level2");
      } else if (levelIndex === "level3") {
        AudioManager.playBGM("level3");
      } else {
        AudioManager.stopBGM();
      }

      // 加载关卡逻辑
      levelManager.loadLevel(levelIndex, p, eventBus);
      switcher.gameSwitcher.runtimeLevelManager = levelManager;
      // 切换 UI 页面到对应关卡页
      const levelNum = parseInt(String(levelIndex).replace("level", ""), 10);
      const gamePage = switcher.gameSwitcher.createLevelPage(levelNum, p);
      switcher.switchToGame(gamePage, p);
    });
    eventBus.subscribe("unloadLevel", () => {
      levelManager.unloadLevel(p, eventBus);
      switcher.gameSwitcher.runtimeLevelManager = null;
      // 切换回主菜单
      switcher.staticSwitcher.showMainMenu(p, eventBus);
    });
    eventBus.subscribe("returnLevelChoice", () => {
      levelManager.unloadLevel(p, eventBus);
      switcher.gameSwitcher.runtimeLevelManager = null;
      // 切换到关卡选择页面
      switcher.staticSwitcher.showLevelChoice(p);
    });
    eventBus.subscribe("autoResult", (result) => {
      const levelIndex = levelManager.currentLevelIndex;
      levelManager.unloadLevel(p, eventBus);
      switcher.gameSwitcher.runtimeLevelManager = null;
      if (result === "autoResult1") {
        // 胜利页面
        const winPage = new StaticPageWin(levelIndex, switcher, p);
        switcher.switchToStatic(winPage, p);
      } else {
        // 失败页面
        const resultPage = new StaticPageResult(result, levelIndex, switcher, p);
        switcher.switchToStatic(resultPage, p);
      }
    });

    // 暂停 / 恢复
    eventBus.subscribe("pauseGame",  () => { levelManager.setPaused(true);  });
    eventBus.subscribe("resumeGame", () => { levelManager.setPaused(false); });

    // 初始化主菜单，传递 p 和 eventBus
    switcher.staticSwitcher.showMainMenu(p, eventBus);
  };

  p.draw = () => {
    switcher.update(p);
    switcher.draw(p);
    levelManager.update(p, eventBus);
  };
});
