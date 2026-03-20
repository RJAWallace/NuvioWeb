import { LocalStore } from "../core/storage/localStore.js";

const ROTATED_DPAD_KEY = "rotatedDpadMapping";

export function getArrowCodeFromKey(key) {
  if (key === "ArrowUp" || key === "Up") return 38;
  if (key === "ArrowDown" || key === "Down") return 40;
  if (key === "ArrowLeft" || key === "Left") return 37;
  if (key === "ArrowRight" || key === "Right") return 39;
  return null;
}

function isEditableTarget(target) {
  const tagName = String(target?.tagName || "").toUpperCase();
  return Boolean(
    target?.isContentEditable
    || tagName === "INPUT"
    || tagName === "TEXTAREA"
    || tagName === "SELECT"
  );
}

function isSimulator() {
  const ua = String(globalThis.navigator?.userAgent || "").toLowerCase();
  return ua.includes("simulator");
}

function shouldUseRotatedMapping() {
  const stored = LocalStore.get(ROTATED_DPAD_KEY, null);
  if (typeof stored === "boolean") {
    return stored;
  }
  return isSimulator();
}

export function normalizeDirectionalKeyCode(code) {
  const rotatedMap = {
    37: 38,
    38: 37,
    39: 40,
    40: 39
  };
  if (shouldUseRotatedMapping() && rotatedMap[code]) {
    return rotatedMap[code];
  }
  return code;
}

export function normalizeKeyEvent(event, backCodes = []) {
  const key = String(event?.key || "");
  const code = String(event?.code || "");
  const rawCode = Number(getArrowCodeFromKey(key) || event?.keyCode || 0);
  const normalizedCode = normalizeDirectionalKeyCode(rawCode);
  const isBack = isBackEvent(event, backCodes, normalizedCode);
  return {
    key,
    code,
    keyCode: normalizedCode,
    originalKeyCode: rawCode,
    isArrow: normalizedCode >= 37 && normalizedCode <= 40,
    isEnter: normalizedCode === 13 || key === "Enter",
    isBack
  };
}

const MEDIA_KEY_NAMES = new Set([
  "MediaPlayPause",
  "MediaPlay",
  "MediaPause",
  "MediaStop",
  "MediaFastForward",
  "MediaRewind",
  "MediaTrackPrevious",
  "MediaTrackNext",
  "Play",
  "Pause",
  // Tizen XF86 key names for media transport controls
  "XF86PlayBack",
  "XF86AudioPlay",
  "XF86AudioPause",
  "XF86AudioStop",
  "XF86AudioRewind",
  "XF86AudioForward"
]);

const MEDIA_KEY_CODES = new Set([
  10252,
  415,
  19,
  413,
  178,
  417,
  412,
  176,
  177,
  179
]);

export function isMediaKeyEvent(event) {
  const key = String(event?.key || "");
  const rawCode = Number(event?.keyCode || 0);
  return MEDIA_KEY_NAMES.has(key) || MEDIA_KEY_CODES.has(rawCode);
}

export function isBackEvent(event, backCodes = [], normalizedCode = null) {
  const target = event?.target || null;
  const key = String(event?.key || "");
  const code = String(event?.code || "");
  const rawCode = Number(event?.keyCode || 0);
  const effectiveCode = Number(normalizedCode || rawCode || 0);

  // Never treat media transport keys as back events, even if the
  // key name contains "back" (e.g. "XF86PlayBack" on Tizen).
  if (isMediaKeyEvent(event)) {
    return false;
  }

  if (isEditableTarget(target) && (key === "Backspace" || rawCode === 8 || key === "Delete" || rawCode === 46)) {
    return false;
  }

  if (backCodes.includes(effectiveCode) || backCodes.includes(rawCode)) {
    return true;
  }

  if (
    key === "Escape"
    || key === "Esc"
    || key === "Backspace"
    || key === "GoBack"
    || key === "XF86Back"
    || code === "BrowserBack"
    || code === "GoBack"
  ) {
    return true;
  }

  // Match keys that are specifically back-navigation actions.
  // Use word-boundary check to avoid false positives like "XF86PlayBack".
  const keyLower = key.toLowerCase();
  return keyLower === "back"
    || keyLower === "browserback"
    || (keyLower.includes("back") && !keyLower.includes("play"));
}
