const ADMIN_MODE_KEY = "equipmentTrackerAdminMode";
export const ADMIN_PASSCODE_KEY = "equipmentTrackerAdminPasscode";

function formatDiagnosticsTimestamp(date = new Date()) {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function createAdminController({ elements, onApplyAdminMode, showToast }) {
  let pendingAdminAction = null;
  const diagnosticsEvents = [];

  function renderDiagnosticsLog() {
    if (!elements.adminDiagnosticsLog) {
      return;
    }
    elements.adminDiagnosticsLog.value = diagnosticsEvents.join("\n");
    elements.adminDiagnosticsLog.scrollTop = elements.adminDiagnosticsLog.scrollHeight;
  }

  function logEvent(message) {
    const entry = `${formatDiagnosticsTimestamp()} ${message}`;
    diagnosticsEvents.push(entry);
    if (diagnosticsEvents.length > 20) {
      diagnosticsEvents.shift();
    }
    renderDiagnosticsLog();
  }

  function setDiagnosticsVisibility(isVisible) {
    elements.adminDiagnosticsPanel?.classList.toggle("is-hidden", !isVisible);
    if (elements.adminDiagnosticsToggle) {
      elements.adminDiagnosticsToggle.checked = isVisible;
    }
    if (isVisible) {
      renderDiagnosticsLog();
    }
  }

  function readAdminPasscodeRecord() {
    const raw = localStorage.getItem(ADMIN_PASSCODE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.value === "string"
      ) {
        return parsed;
      }
    } catch {
      return {
        method: "plain",
        value: raw,
      };
    }
    return null;
  }

  function hasAdminPasscodeRecord() {
    const record = readAdminPasscodeRecord();
    return Boolean(record?.value);
  }

  function saveAdminPasscodeRecord(record) {
    localStorage.setItem(ADMIN_PASSCODE_KEY, JSON.stringify(record));
  }

  async function hashPasscode(passcode) {
    if (!window.crypto?.subtle || !window.TextEncoder) {
      return passcode;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(passcode);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function buildPasscodeRecord(passcode) {
    if (window.crypto?.subtle && window.TextEncoder) {
      return {
        method: "sha256",
        value: await hashPasscode(passcode),
      };
    }
    return {
      method: "plain",
      value: passcode,
    };
  }

  async function verifyAdminPasscode(passcode) {
    const record = readAdminPasscodeRecord();
    if (!record || !record.value) {
      return false;
    }
    if (record.method === "sha256") {
      const hash = await hashPasscode(passcode);
      return hash === record.value;
    }
    return record.value === passcode;
  }

  function loadAdminMode() {
    return (
      localStorage.getItem(ADMIN_MODE_KEY) === "true" &&
      hasAdminPasscodeRecord()
    );
  }

  function saveAdminMode(isEnabled) {
    localStorage.setItem(ADMIN_MODE_KEY, String(Boolean(isEnabled)));
  }

  function resetAdminPasscodeDialog() {
    if (elements.adminPasscodeInput) {
      elements.adminPasscodeInput.value = "";
    }
    if (elements.adminPasscodeNew) {
      elements.adminPasscodeNew.value = "";
    }
    if (elements.adminPasscodeConfirm) {
      elements.adminPasscodeConfirm.value = "";
    }
    if (elements.adminPasscodeError) {
      elements.adminPasscodeError.textContent = "";
      elements.adminPasscodeError.classList.add("is-hidden");
    }
  }

  function setAdminPasscodeDialogError(message) {
    if (!elements.adminPasscodeError) {
      return;
    }
    elements.adminPasscodeError.textContent = message;
    elements.adminPasscodeError.classList.toggle("is-hidden", !message);
  }

  function resetAdminPasscodeSettingsStatus() {
    if (elements.adminPasscodeUpdateError) {
      elements.adminPasscodeUpdateError.textContent = "";
      elements.adminPasscodeUpdateError.classList.add("is-hidden");
    }
    if (elements.adminPasscodeUpdateSuccess) {
      elements.adminPasscodeUpdateSuccess.classList.add("is-hidden");
    }
  }

  function setAdminPasscodeSettingsError(message) {
    if (!elements.adminPasscodeUpdateError) {
      return;
    }
    elements.adminPasscodeUpdateError.textContent = message;
    elements.adminPasscodeUpdateError.classList.toggle("is-hidden", !message);
  }

  function openAdminPasscodeDialog() {
    if (!elements.adminPasscodeDialog) {
      return;
    }
    const hasPasscode = hasAdminPasscodeRecord();
    const mode = hasPasscode ? "verify" : "setup";
    elements.adminPasscodeDialog.dataset.mode = mode;
    if (elements.adminPasscodeTitle) {
      elements.adminPasscodeTitle.textContent = hasPasscode
        ? "Enable Admin mode"
        : "Set admin passcode";
    }
    if (elements.adminPasscodeHint) {
      elements.adminPasscodeHint.textContent = hasPasscode
        ? "Enter the local browser passcode to unlock Admin mode."
        : "Create a local browser passcode to protect Admin mode.";
    }
    if (elements.adminPasscodeVerify) {
      elements.adminPasscodeVerify.classList.toggle("is-hidden", !hasPasscode);
    }
    if (elements.adminPasscodeSetup) {
      elements.adminPasscodeSetup.classList.toggle("is-hidden", hasPasscode);
    }
    if (elements.adminPasscodeSubmit) {
      elements.adminPasscodeSubmit.textContent = hasPasscode
        ? "Enable Admin mode"
        : "Set passcode & enable";
    }
    logEvent(`Admin dialog opened (${mode})`);
    resetAdminPasscodeDialog();
    elements.adminPasscodeDialog.showModal();
    const focusTarget = hasPasscode
      ? elements.adminPasscodeInput
      : elements.adminPasscodeNew;
    focusTarget?.focus();
  }

  function closeAdminPasscodeDialog() {
    elements.adminPasscodeDialog?.close();
  }

  function applyAndPersistAdminMode(isEnabled, options = {}) {
    saveAdminMode(isEnabled);
    onApplyAdminMode(Boolean(isEnabled), options);
    if (isEnabled) {
      logEvent("Admin enabled");
    }
  }

  async function handleAdminPasscodeFormSubmit(event) {
    event.preventDefault();
    resetAdminPasscodeSettingsStatus();
    setAdminPasscodeDialogError("");
    const mode = elements.adminPasscodeDialog?.dataset.mode ?? "verify";
    if (mode === "setup") {
      const newPasscode = elements.adminPasscodeNew?.value.trim() ?? "";
      const confirmPasscode = elements.adminPasscodeConfirm?.value.trim() ?? "";
      if (!newPasscode || !confirmPasscode) {
        setAdminPasscodeDialogError("Enter and confirm a new passcode.");
        return;
      }
      if (newPasscode !== confirmPasscode) {
        setAdminPasscodeDialogError("Passcodes do not match.");
        return;
      }
      const record = await buildPasscodeRecord(newPasscode);
      saveAdminPasscodeRecord(record);
      logEvent("Admin passcode set");
      applyAndPersistAdminMode(true, { focus: true });
      const nextAction = pendingAdminAction;
      pendingAdminAction = null;
      if (typeof nextAction === "function") {
        nextAction();
      }
      closeAdminPasscodeDialog();
      showToast("Admin passcode set.", "success");
      return;
    }

    const passcode = elements.adminPasscodeInput?.value.trim() ?? "";
    if (!passcode) {
      setAdminPasscodeDialogError("Enter the admin passcode to continue.");
      return;
    }
    const isValid = await verifyAdminPasscode(passcode);
    if (!isValid) {
      logEvent("Admin passcode verify failed");
      setAdminPasscodeDialogError("Incorrect passcode.");
      return;
    }
    applyAndPersistAdminMode(true, { focus: true });
    const nextAction = pendingAdminAction;
    pendingAdminAction = null;
    if (typeof nextAction === "function") {
      nextAction();
    }
    closeAdminPasscodeDialog();
  }

  async function handleAdminPasscodeSettingsSubmit(event) {
    event.preventDefault();
    resetAdminPasscodeSettingsStatus();
    const currentPasscode = elements.adminPasscodeCurrent?.value.trim() ?? "";
    const newPasscode = elements.adminPasscodeUpdate?.value.trim() ?? "";
    const confirmPasscode =
      elements.adminPasscodeUpdateConfirm?.value.trim() ?? "";
    if (!currentPasscode || !newPasscode || !confirmPasscode) {
      setAdminPasscodeSettingsError("Complete all passcode fields.");
      return;
    }
    if (newPasscode !== confirmPasscode) {
      setAdminPasscodeSettingsError("New passcodes do not match.");
      return;
    }
    const isValid = await verifyAdminPasscode(currentPasscode);
    if (!isValid) {
      setAdminPasscodeSettingsError("Current passcode is incorrect.");
      return;
    }
    const record = await buildPasscodeRecord(newPasscode);
    saveAdminPasscodeRecord(record);
    logEvent("Admin passcode set");
    if (elements.adminPasscodeUpdateSuccess) {
      elements.adminPasscodeUpdateSuccess.classList.remove("is-hidden");
    }
    if (elements.adminPasscodeCurrent) {
      elements.adminPasscodeCurrent.value = "";
    }
    if (elements.adminPasscodeUpdate) {
      elements.adminPasscodeUpdate.value = "";
    }
    if (elements.adminPasscodeUpdateConfirm) {
      elements.adminPasscodeUpdateConfirm.value = "";
    }
    showToast("Admin passcode updated.", "success");
  }

  function requestAdminModeEnable(action) {
    pendingAdminAction = typeof action === "function" ? action : null;
    openAdminPasscodeDialog();
  }

  function bindEvents() {
    if (elements.adminPasscodeForm) {
      elements.adminPasscodeForm.addEventListener("submit", handleAdminPasscodeFormSubmit);
    }

    if (elements.adminPasscodeCancel) {
      elements.adminPasscodeCancel.addEventListener("click", (event) => {
        event.preventDefault();
        closeAdminPasscodeDialog();
        logEvent("Admin dialog cancelled");
      });
    }

    if (elements.adminPasscodeDialog) {
      elements.adminPasscodeDialog.addEventListener("close", () => {
        pendingAdminAction = null;
        resetAdminPasscodeDialog();
      });
    }

    if (elements.adminPasscodeSettingsForm) {
      elements.adminPasscodeSettingsForm.addEventListener(
        "submit",
        handleAdminPasscodeSettingsSubmit
      );
    }

    if (elements.adminDiagnosticsToggle) {
      elements.adminDiagnosticsToggle.addEventListener("change", () => {
        setDiagnosticsVisibility(elements.adminDiagnosticsToggle.checked);
      });
    }

    setDiagnosticsVisibility(false);
  }

  return {
    bindEvents,
    loadAdminMode,
    requestAdminModeEnable,
    applyAndPersistAdminMode,
  };
}
