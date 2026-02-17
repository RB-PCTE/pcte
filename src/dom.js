export function getElements() {
  return {
    operationsView: document.querySelector("#operations-view"),
    movesView: document.querySelector("#moves-view"),
    adminModeToggle: document.querySelector("#admin-mode-toggle"),
    moveForm: document.querySelector("#move-form"),
    addEquipmentForm: document.querySelector("#add-equipment-form"),
    calibrationForm: document.querySelector("#calibration-form"),
    adminPasscodeForm: document.querySelector("#admin-passcode-form"),
  };
}

export function selfCheck(showToast) {
  const required = [
    "#operations-view",
    "#moves-view",
    "#admin-mode-toggle",
    "#move-form",
    "#add-equipment-form",
    "#calibration-form",
    "#admin-passcode-form",
  ];
  const missing = required.filter((selector) => !document.querySelector(selector));
  if (missing.length) {
    const message = `Self-check failed, missing required DOM hooks: ${missing.join(", ")}`;
    console.error(message);
    if (typeof showToast === "function") {
      showToast("UI self-check failed. See console for missing selectors.", "error");
    }
  }
  return missing;
}
