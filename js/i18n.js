// js/i18n.js — 国际化 / Internationalization
// 用法：import { i18n, t } from '../i18n.js';
//       t('key') 获取当前语言对应的文字

const _dict = {
  en: {
    // ── Menu ─────────────────────────────────────────────────────────
    btn_play:       'PLAY',
    btn_settings:   'SETTINGS',
    btn_credits:    'Credits',

    // ── Opening Story ────────────────────────────────────────────────
    btn_skip:       'PRESS [ENTER] TO SKIP',
    notebook_front: '[HOW TO PLAY]<br>&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;press [R]<br>&nbsp;&nbsp;&nbsp;&nbsp;<br>> Record<br>> End Record<br>> Replay<br>> End Replay',
    notebook_back:  '&nbsp;use [WASD]<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>Enter the door<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>&nbsp;>&nbsp;>&nbsp;WIN&nbsp;<&nbsp;<&nbsp;',
    story_loading:  'Loading story...',

    // ── Result ───────────────────────────────────────────────────────
    btn_back_menu:  'Back to Menu',
    btn_restart:    'Restart Level',
    btn_next_level: 'Next Level',
    result_win:     'Level Complete!',
    result_lose:    'Game Over',

    // ── Setting Window ───────────────────────────────────────────────
    win_title:      '⚙  Settings',
    win_sound:      '🔊 Sound',
    win_bgm:        'BGM',
    win_sfx:        'SFX',
    win_language:   '🌐 Language',
    win_keybind:    '⌨ Controls',
    pause_title:    '⏸  Paused',
    pause_hint:     'Game is paused',
    pause_resume:   '▶  Resume',
    pause_setting:  '⚙  Setting',
    pause_hint_btn: '💡  Hint',
    pause_back_level_choice: '🗺  Back to Level Choice',
    pause_back_menu:'⏏  Back to Menu',
    hint_title:     '💡  Hint',
    hint_level1:    'Level 1 hint example',
    hint_level2:    'Level 2 hint example',
    hint_level3:    'Level 3 hint example',
    keybind_reset_title: 'Reset to default',
    keybind_conflict: 'The key {KEY} is already bound to {ACTION}',
    keybind_jump:   'Jump',
    keybind_moveLeft:  'Move Left',
    keybind_moveRight: 'Move Right',
    keybind_interaction: 'Interaction',
    keybind_record: 'Record/Stop',
    keybind_replay: 'Replay',

    // ── Record HUD ───────────────────────────────────────────────────
    rec_title_standby:     'Recorder Standby',
    rec_title_recording:   'Recording',
    rec_title_ready:       'Record Complete',
    rec_title_replaying:   'Replaying',
    rec_title_idle:        'Press {KEY} to Start Recording',
    rec_sub_max:           'Max Record Duration',
    rec_sub_press_e_end:   'Press {KEY} to end early',
    rec_sub_press_replay_end: 'Press {KEY} to end replay early',
    rec_sub_ready_prefix:  'Press {REPLAY} to replay | {RECORD} to re-record  Recorded',
    rec_hud_label:         'RECORD HUD',
    rec_blocked_air:       'Land first to record!',
    level1_missed_prompt:  'Wait... did I just miss something?',
    level1_replay_prompt:  '...He is repeating every step I just did.\nI think... I cannot touch him?',
    module_btn_label:      'Install Module',
    module_installation_complete: 'Installation Complete',
    click_to_close:        'Click anywhere to close',
  },

  zh: {
    // ── Menu ─────────────────────────────────────────────────────────
    btn_play:       '开始',
    btn_settings:   '设置',
    btn_credits:    '制作人员',

    // ── Opening Story ────────────────────────────────────────────────
    btn_skip:       '按 [ENTER] 跳过',
    notebook_front: '这里应该不写游戏操作比较好？[游戏操作]<br>&nbsp;&nbsp;&nbsp;<br>&nbsp;&nbsp;按 [R]<br>&nbsp;&nbsp;&nbsp;&nbsp;<br>> 开始录制<br>> 结束录制<br>> 开始回放<br>> 结束回放',
    notebook_back:  '不知道写什么很烦&nbsp;用 [WASD]<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>进入门<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;↓<br>&nbsp;>&nbsp;>&nbsp;胜利&nbsp;<&nbsp;<&nbsp;',
    story_loading:  '故事加载中...',

    // ── Result ───────────────────────────────────────────────────────
    btn_back_menu:  '返回菜单',
    btn_restart:    '重新开始当前关卡',
    btn_next_level: '下一关',
    result_win:     '恭喜通关！',
    result_lose:    '游戏结束',

    // ── Setting Window ───────────────────────────────────────────────
    win_title:      '⚙  设置',
    win_sound:      '🔊 音效设置',
    win_bgm:        '背景音乐',
    win_sfx:        '音效',
    win_language:   '🌐 语言',
    win_keybind:    '⌨ 按键设置',
    pause_title:    '⏸  已暂停',
    pause_hint:     '游戏已暂停',
    pause_resume:   '▶  继续游戏',
    pause_setting:  '⚙  设置',
    pause_hint_btn: '💡  提示',
    pause_back_level_choice: '🗺  返回关卡选择',
    pause_back_menu:'⏏  返回菜单',
    hint_title:     '💡  提示',
    hint_level1:    'level1提示实例',
    hint_level2:    'level2提示实例',
    hint_level3:    'level3提示实例',
    keybind_reset_title: '重置为默认',
    keybind_conflict: '按键 {KEY} 已绑定到 {ACTION}',
    keybind_jump:   '跳跃',
    keybind_moveLeft:  '向左移动',
    keybind_moveRight: '向右移动',
    keybind_interaction: '交互',
    keybind_record: '录制/停止',
    keybind_replay: '回放',

    // ── Record HUD ───────────────────────────────────────────────────
    rec_title_standby:     '录制系统待命',
    rec_title_recording:   '录制中',
    rec_title_ready:       '录制完成',
    rec_title_replaying:   '回放中',
    rec_title_idle:        '按 {KEY} 开始录制',
    rec_sub_max:           '最大录制时长',
    rec_sub_press_e_end:   '按 {KEY} 可提前结束录制',
    rec_sub_press_replay_end: '按 {KEY} 可提前结束回放',
    rec_sub_ready_prefix:  '按 {REPLAY} 回放，按 {RECORD} 重新录制  已录制',
    rec_hud_label:         '录制面板',
    rec_blocked_air:       '落地后才能录制！',
    level1_missed_prompt:  '等等，我刚刚是不是错过了什么？',
    level1_replay_prompt:  '……他在重复我刚才做的每一步。\n我好像……碰不到他？',
    module_btn_label:      '安装模块',
    module_installation_complete: '安装完成',
    click_to_close:        '点击任意处关闭',
  },
};

let _lang = 'en';
const _listeners = [];

export const i18n = {
  /** 切换语言，触发所有已注册的监听器 */
  setLang(lang) {
    if (!_dict[lang] || _lang === lang) return;
    _lang = lang;
    _listeners.forEach(fn => fn(lang));
  },

  getLang() {
    return _lang;
  },

  /** 注册语言变化监听器 */
  onChange(fn) {
    _listeners.push(fn);
  },

  /** 注销监听器 */
  offChange(fn) {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  },
};

/**
 * 快捷取文字函数：用当前语言取 _dict[lang][key]，
 * 找不到时回退到英文，再找不到返回 key 本身。
 */
export function t(key) {
  return _dict[_lang]?.[key] ?? _dict['en']?.[key] ?? key;
}
