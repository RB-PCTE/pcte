function normalizeCorrectionEntry(entry = {}) {
  const safeEntry = entry && typeof entry === "object" ? entry : {};
  return {
    id: safeEntry.id || "",
    ts: safeEntry.ts || "",
    targetType: safeEntry.targetType,
    targetId: safeEntry.targetId,
    reason: safeEntry.reason,
    changes: safeEntry.changes || {},
  };
}

function normalizeCorrections(corrections = []) {
  return (Array.isArray(corrections) ? corrections : [])
    .map((entry) => normalizeCorrectionEntry(entry))
    .filter((entry) => entry.targetType === "move" && entry.targetId)
    .sort((a, b) => Date.parse(a.ts || "") - Date.parse(b.ts || ""));
}

function setMoveFieldValue(move, fieldName, value) {
  if (fieldName === "shippingTracking") {
    move.shipping = { ...(move.shipping || {}), trackingNumber: value || "" };
    return;
  }
  if (fieldName === "receiptDate") {
    move.receivedAt = value || "";
    move.shipping = { ...(move.shipping || {}), receivedAt: value || "" };
    return;
  }
}

function applyCorrectionsToMoves(moves = [], corrections = []) {
  const effectiveMoves = (Array.isArray(moves) ? moves : []).map((entry) => ({ ...entry, _corrections: [] }));
  const byId = new Map(effectiveMoves.map((entry) => [entry.id, entry]));
  normalizeCorrections(corrections).forEach((correction) => {
    const target = byId.get(correction.targetId);
    if (!target) return;
    Object.entries(correction.changes || {}).forEach(([fieldName, change]) => {
      setMoveFieldValue(target, fieldName, change.to ?? "");
    });
    target._corrections.push(correction);
  });
  return effectiveMoves;
}

const moves = [{ id: "m1", shipping: { trackingNumber: "OLD" }, receivedAt: "" }];
const corrections = [
  {
    id: "c1",
    ts: "2025-01-01T00:00:00.000Z",
    targetType: "move",
    targetId: "m1",
    reason: "Fix tracking",
    changes: { shippingTracking: { from: "OLD", to: "NEW" } },
  },
  {
    id: "c2",
    ts: "2025-01-02T00:00:00.000Z",
    targetType: "move",
    targetId: "m1",
    reason: "Mark received",
    changes: { receiptDate: { from: "", to: "2025-01-02" } },
  },
];

const [effective] = applyCorrectionsToMoves(moves, corrections);
if (effective.shipping.trackingNumber !== "NEW") throw new Error("tracking correction failed");
if (effective.receivedAt !== "2025-01-02") throw new Error("receipt correction failed");
if (effective._corrections.length !== 2) throw new Error("audit metadata failed");
console.log("applyCorrectionsToMoves test passed");
