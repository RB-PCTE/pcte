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

function normalizeLastConditionCheck(rawValue = null) {
  if (!rawValue || typeof rawValue !== "object") return null;
  const result = normalizeConditionLogEntry(rawValue.result);
  const checkedAt =
    typeof rawValue.checkedAt === "string" && rawValue.checkedAt.trim()
      ? rawValue.checkedAt
      : result?.checkedAt || "";
  if (!result && !checkedAt) return null;
  return {
    result,
    checkedAt,
    moveId: typeof rawValue.moveId === "string" ? rawValue.moveId : "",
  };
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

  const result = normalizeConditionLogEntry({
    ...(latest.condition && typeof latest.condition === "object" ? latest.condition : {}),
    checkedAt: getConditionCheckTimestamp(latest),
  });
  if (!result) return null;

  return {
    result,
    checkedAt: result.checkedAt || getConditionCheckTimestamp(latest),
    moveId: latest.id,
  };
}

function getConditionPillRating(item) {
  const lastConditionCheck = normalizeLastConditionCheck(item.lastConditionCheck);
  return lastConditionCheck?.result?.rating || "Not checked";
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
  const first = deriveLastConditionFromLogs(logsCheckReceiptTransfer);
  if (!first || first.result.rating !== "Good" || first.moveId !== "m1") {
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
  const second = deriveLastConditionFromLogs(logsMultipleChecks);
  if (!second || second.result.rating !== "Excellent" || second.moveId !== "m2") {
    throw new Error("Multiple checks should use the newest check");
  }

  const noCheckItem = { id: equipmentId, lastConditionCheck: null };
  if (getConditionPillRating(noCheckItem) !== "Not checked") {
    throw new Error("No checks should produce Not checked");
  }

  const checkedItem = {
    id: equipmentId,
    lastConditionCheck: {
      result: { rating: "Good", contentsOk: true, functionalOk: true },
      checkedAt: "2025-01-01T00:00:00.000Z",
      moveId: "m1",
    },
  };
  if (getConditionPillRating(checkedItem) !== "Good") {
    throw new Error("Pill must read from item.lastConditionCheck");
  }

  console.log("conditionPillLastCheck tests passed");
})();
