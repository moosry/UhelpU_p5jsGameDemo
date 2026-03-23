// RecordUI.js
// 负责录制系统的 UI 状态生成和渲染
import { keyCodeToLabel } from "./RecordKeyUtil.js";
import { KeyBindingManager } from "../KeyBindingSystem/KeyBindingManager.js";
import { t } from "../i18n.js";

export class RecordUI {
    static getRecordUiState(
        p,
        state,
        maxRecordTime,
        recordStartTime,
        recordEndTime,
        replayStartTime,
        paused,
        pausedRecordElapsed,
        pausedReplayElapsed
    ) {
        const kbm = KeyBindingManager.getInstance();
        const recordKey = keyCodeToLabel(kbm.getKeyByIntent('record'));
        const replayKey  = keyCodeToLabel(kbm.getKeyByIntent('replay'));
        const maxSec = (maxRecordTime / 1000).toFixed(1);
        // Steampunk dark-purple chrome shared by all states
        const chrome = {
            frameLight: p.color(68,  38, 100),
            frameDark:  p.color(12,   6,  24),
            panelFill:  p.color(34,  18,  58),
            panelShade: p.color(22,  11,  40),
            textMain:   p.color(218, 198, 238),
            textSub:    p.color(148, 122, 175),
        };
        const base = {
            ...chrome,
            title:        t("rec_title_standby"),
            subtitle:     `${t("rec_sub_max")} ${maxSec}s`,
            badge:        "STANDBY",
            accentA:      p.color(72,  48, 105),
            accentB:      p.color(44,  26,  70),
            dotColor:     p.color(100,  72, 138),
            progress:     0,
            showBlinkDot: false,
            pulse:        0,
            hudLabel: t("rec_hud_label"),
            airBlockText: t("rec_blocked_air"),
        };
        switch (state) {
            case "Recording": {
                const elapsedMs = paused && pausedRecordElapsed !== null
                    ? pausedRecordElapsed
                    : Math.max(0, performance.now() - recordStartTime);
                const elapsedSec = (elapsedMs / 1000).toFixed(1);
                return {
                    ...chrome,
                    title:        t("rec_title_recording"),
                    subtitle:     `${t('rec_sub_press_e_end').replace('{KEY}', recordKey)}  ${elapsedSec}s / ${maxSec}s`,
                    badge:        "REC",
                    accentA:      p.color(175,  38,  88),
                    accentB:      p.color(105,  18,  50),
                    panelFill:    p.color(42,   16,  55),
                    panelShade:   p.color(28,   10,  40),
                    dotColor:     p.color(240,  65, 115),
                    textMain:     p.color(240, 215, 235),
                    textSub:      p.color(195, 148, 175),
                    progress:     Math.min(1, elapsedMs / maxRecordTime),
                    showBlinkDot: Math.floor(performance.now() / 450) % 2 === 0,
                    pulse:        (Math.sin(performance.now() / 200) + 1) / 2,
                    hudLabel: t("rec_hud_label"),
                    airBlockText: t("rec_blocked_air"),
                };
            }
            case "ReadyToReplay": {
                const recordedSec = ((recordEndTime - recordStartTime) / 1000).toFixed(1);
                return {
                    ...chrome,
                    title:        t("rec_title_ready"),
                    subtitle:     `${t('rec_sub_ready_prefix').replace('{REPLAY}', replayKey).replace('{RECORD}', recordKey)}  ${recordedSec}s`,
                    badge:        "READY",
                    accentA:      p.color(58,  98, 130),
                    accentB:      p.color(34,  62,  90),
                    panelFill:    p.color(28,  22,  55),
                    panelShade:   p.color(18,  14,  40),
                    dotColor:     p.color(105, 165, 210),
                    textMain:     p.color(210, 215, 240),
                    textSub:      p.color(138, 148, 185),
                    progress:     1,
                    showBlinkDot: false,
                    pulse:        0,
                    hudLabel: t("rec_hud_label"),
                    airBlockText: t("rec_blocked_air"),
                };
            }
            case "Replaying": {
                const totalMs = Math.max(1, recordEndTime - recordStartTime);
                const replayElapsedMs = paused && pausedReplayElapsed !== null
                    ? pausedReplayElapsed
                    : Math.min(Math.max(0, performance.now() - replayStartTime), totalMs);
                const replayElapsedSec = (replayElapsedMs / 1000).toFixed(1);
                const totalReplaySec = (totalMs / 1000).toFixed(1);
                return {
                    ...chrome,
                    title:        t("rec_title_replaying"),
                    subtitle:     `${t('rec_sub_press_replay_end').replace('{KEY}', replayKey)}  ${replayElapsedSec}s / ${totalReplaySec}s`,
                    badge:        "PLAY",
                    accentA:      p.color(115,  75, 155),
                    accentB:      p.color(72,   42, 105),
                    panelFill:    p.color(36,   20,  62),
                    panelShade:   p.color(22,   12,  44),
                    dotColor:     p.color(175, 138, 215),
                    textMain:     p.color(218, 200, 240),
                    textSub:      p.color(155, 128, 185),
                    progress:     Math.min(1, replayElapsedMs / totalMs),
                    showBlinkDot: Math.floor(performance.now() / 700) % 2 === 0,
                    pulse:        0,
                    hudLabel: t("rec_hud_label"),
                    airBlockText: t("rec_blocked_air"),
                };
            }
            default:
                return {
                    ...base
                };
        }
    }
}
