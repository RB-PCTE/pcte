// Equipment domain helpers can be promoted here as backend integration progresses.
export function normalizeEquipmentName(name) {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}
