import { SwitcherBase } from "./SwitcherBase.js";
import { LevelManager } from "../LevelManager/LevelManager.js";
import { Level1 } from "../LevelManager/Level1.js";
import { Level2 } from "../LevelManager/Level2.js";
import { Level3 } from "../LevelManager/Level3.js";
import { GamePageLevel1 } from "../ui/pages/game-pages/GamePageLevel1.js";
import { GamePageLevel2 } from "../ui/pages/game-pages/GamePageLevel2.js";
import { GamePageLevel3 } from "../ui/pages/game-pages/GamePageLevel3.js";

export class SwitcherGamePage extends SwitcherBase {
  constructor(mainSwitcher, eventBus) {
    super(mainSwitcher);
    this.eventBus = eventBus;
    this.levelManager = new LevelManager(this);
  }

  loadLevel(levelNumber) {
    // 发布loadLevel事件，转换为字符串格式
    const levelKey = `level${levelNumber}`;
    this.eventBus && this.eventBus.publish("loadLevel", levelKey);

    const levelLogic = this.createLevelLogic(levelNumber);
    // 关卡逻辑已由 LevelManager 事件驱动加载，无需 setCurrentLevel

      const levelPage = this.createLevelPage(levelNumber, this.main.p);
    this.main.switchToGame(levelPage);
  }

  createLevelLogic(levelNumber) {
    switch(levelNumber) {
      case 1: return new Level1(this);
      case 2: return new Level2(this);
      case 3: return new Level3(this);
      default: throw new Error(`Unknown level: ${levelNumber}`);
    }
  }

  createLevelPage(levelNumber, p) {
    switch(levelNumber) {
      case 1: return new GamePageLevel1(this, p);
      case 2: return new GamePageLevel2(this, p);
      case 3: return new GamePageLevel3(this, p);
      default: throw new Error(`Unknown level page: ${levelNumber}`);
    }
  }
}