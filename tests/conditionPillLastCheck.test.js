function normalizeConditionRating(value) {
  const allowed = [
    "Excellent",
    "Good",
    "Fair",
    "Needs attention",
    "Missing",
    "Fault",
    "Unserviceable",
  ];
  const text = typeof value === "string" ? value.trim() : "";
  return allowed.includes(text) ? text : "";
}

function normalizeConditionCheckValue(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "yes" || normalized === "true") return true;
    if (normalized === "no" || normalized === "false") return false;
  }
  return null;
}

function normalizeConditionLogEntry(rawCondition = {}) {
  const safeCondition = rawCondition && typeof rawCondition === "object" ? rawCondition : {};
  const rating = normalizeConditionRating(safeCondition.rating);
  const contentsOk = normalizeConditionCheckValue(safeCondition.contentsOk);
  const functionalOk = normalizeConditionCheckValue(safeCondition.functionalOk);
  const checkedAt =
    typeof safeCondition.checkedAt === "string" && safeCondition.checkedAt.trim()
      ? safeCondition.checkedAt
      : "";
  if (!rating && contentsOk === null && functionalOk === null && !checkedAt) {
    return null;
  }
  return { rating, contentsOk, functionalOk, checkedAt };
}

function isConditionCheckEntry(entry) {
  if (!entry || typeof entry !== "object") return false;
  if (entry.type === "condition") return true;
  return Boolean(normalizeConditionLogEntry(entry.condition));
}

function getConditionCheckTimestamp(entry) {
  const checkedAt = typeof entry?.condition?.checkedAt === "string" ? entry.condition.checkedAt : "";
  if (checkedAt.trim()) return checkedAt;
  return typeof entry?.timestamp === "string" ? entry.timestamp : "";
}

function deriveLastConditionFromLogs(logsForItem = []) {
  const latest = (Array.isArray(logsForItem) ? logsForItem : [])
    .filter((entry) => isConditionCheckEntry(entry) && !entry.deletedAt)
    .reduce((currentLatest, candidate) => {
      const candidateTime = new Date(getConditionCheckTimestamp(candidate)).getTime();
      if (!Number.isFinite(candidateTime)) return currentLatest;
      if (!currentLatest) return candidate;
      const latestTime = new Date(getConditionCheckTimestamp(currentLatest)).getTime();
      return !Number.isFinite(latestTime) || candidateTime > latestTime
        ? candidate
        : currentLatest;
    }, null);

  if (!latest) return null;

  return normalizeConditionLogEntry({
    ...(latest.condition && typeof latest.condition === "object" ? latest.condition : {}),
    checkedAt: getConditionCheckTimestamp(latest),
  });
}

function getLastConditionCheck(equipmentId, moveLogs = []) {
  return deriveLastConditionFromLogs(
    (Array.isArray(moveLogs) ? moveLogs : []).filter((entry) => entry.equipmentId === equipmentId)
  );
}

(function run() {
  const equipmentId = "eq-1";
  const logsCheckReceiptTransfer = [
    {
      id: "m1",
      equipmentId,
      type: "move",
      timestamp: "2025-01-01T00:00:00.000Z",
      condition: { rating: "Good", contentsOk: true, functionalOk: true },
    },
    { id: "r1", equipmentId, type: "received", timestamp: "2025-01-02T00:00:00.000Z" },
    { id: "m2", equipmentId, type: "move", timestamp: "2025-01-03T00:00:00.000Z" },
  ];
  const first = getLastConditionCheck(equipmentId, logsCheckReceiptTransfer);
  if (!first || first.rating !== "Good") {
    throw new Error("Check → receipt → transfer should keep latest check result");
  }

  const logsMultipleChecks = [
    {
      id: "m1",
      equipmentId,
      type: "move",
      timestamp: "2025-01-01T00:00:00.000Z",
      condition: { rating: "Fair", contentsOk: true, functionalOk: false },
    },
    {
      id: "m2",
      equipmentId,
      type: "move",
      timestamp: "2025-01-05T00:00:00.000Z",
      condition: { rating: "Excellent", contentsOk: true, functionalOk: true },
    },
  ];
  const second = getLastConditionCheck(equipmentId, logsMultipleChecks);
  if (!second || second.rating !== "Excellent") {
    throw new Error("Multiple checks should use the newest check");
  }

  const logsNoChecks = [
    { id: "m1", equipmentId, type: "move", timestamp: "2025-01-01T00:00:00.000Z" },
    { id: "r1", equipmentId, type: "received", timestamp: "2025-01-03T00:00:00.000Z" },
  ];
  const third = getLastConditionCheck(equipmentId, logsNoChecks);
  if (third !== null) {
    throw new Error("No checks should produce null (Not checked)");
  }

  console.log("conditionPillLastCheck tests passed");
})();
