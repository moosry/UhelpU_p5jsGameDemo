/**
 * KeyBindingConfig.js — 按键配置数据层
 * 负责读写 localStorage 中的按键绑定配置
 */

// 默认按键配置
export const DEFAULT_KEYBINDING = {
  // 游戏控制
  jump: 'KeyW',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  interaction: 'KeyE',
  
  // 录制系统
  record: 'KeyC',
  replay: 'KeyR',
};

// localStorage 储存键名
export const STORAGE_KEY = 'game_keybinding';

/**
 * 配置管理类：负责 localStorage 的读写
 */
export class KeyBindingConfig {
  /**
   * 兼容旧版本默认键位：旧版本没有 interaction，且 record 默认是 KeyE。
   * 升级时将 interaction 设为 KeyE，并把 record 挪到 KeyC。
   * @param {Object} raw
   * @returns {Object}
   */
  static migrateLegacy(raw = {}) {
    const migrated = { ...(raw || {}) };
    const hasInteraction = Object.prototype.hasOwnProperty.call(migrated, 'interaction');
    if (!hasInteraction && migrated.record === 'KeyE') {
      migrated.record = 'KeyC';
      migrated.interaction = 'KeyE';
    }
    return migrated;
  }

  /**
   * 只保留默认意图键，避免旧版本脏数据污染配置。
   * @param {Object} raw
   * @returns {Object}
   */
  static sanitize(raw = {}) {
    const clean = {};
    for (const [intent, defaultKey] of Object.entries(DEFAULT_KEYBINDING)) {
      const candidate = raw[intent];
      clean[intent] = (typeof candidate === 'string' && candidate.length > 0)
        ? candidate
        : defaultKey;
    }
    return clean;
  }

  /**
   * 从 localStorage 加载配置，失败则返回默认配置
   */
  static load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return { ...DEFAULT_KEYBINDING };

      const parsed = JSON.parse(saved);
      const migrated = KeyBindingConfig.migrateLegacy(parsed || {});
      // 用默认值补全并清洗 localStorage 中异常键（兼容旧存档）
      const merged = { ...DEFAULT_KEYBINDING, ...migrated };
      const sanitized = KeyBindingConfig.sanitize(merged);

      // 若清洗后结果与原始存档不同，回写一次，避免后续继续读到脏数据。
      if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
        KeyBindingConfig.save(sanitized);
      }

      return sanitized;
    } catch (e) {
      console.warn('Failed to load keybinding config:', e);
      return { ...DEFAULT_KEYBINDING };
    }
  }

  /**
   * 保存配置到 localStorage
   */
  static save(config) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save keybinding config:', e);
    }
  }

  /**
   * 重置为默认配置
   */
  static reset() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
