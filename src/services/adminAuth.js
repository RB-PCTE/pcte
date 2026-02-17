import { ADMIN_MODE_KEY, ADMIN_PASSCODE_KEY } from "../storage.js";

function readPasscodeRecord() {
  const raw = localStorage.getItem(ADMIN_PASSCODE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.value === "string") {
      return parsed;
    }
  } catch {
    return { method: "plain", value: raw };
  }
  return null;
}

async function hashPasscode(passcode) {
  if (!window.crypto?.subtle || !window.TextEncoder) {
    return passcode;
  }
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(passcode));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasPasscode() {
  return Boolean(readPasscodeRecord()?.value);
}

export async function setPasscode(passcode) {
  const record = window.crypto?.subtle && window.TextEncoder
    ? { method: "sha256", value: await hashPasscode(passcode) }
    : { method: "plain", value: passcode };
  localStorage.setItem(ADMIN_PASSCODE_KEY, JSON.stringify(record));
}

export async function verifyPasscode(passcode) {
  const record = readPasscodeRecord();
  if (!record?.value) return false;
  if (record.method === "sha256") {
    return (await hashPasscode(passcode)) === record.value;
  }
  return record.value === passcode;
}

export function enableAdminMode() {
  localStorage.setItem(ADMIN_MODE_KEY, "true");
}

export function disableAdminMode() {
  localStorage.setItem(ADMIN_MODE_KEY, "false");
}

export function isAdminModeEnabled() {
  return localStorage.getItem(ADMIN_MODE_KEY) === "true" && hasPasscode();
}
