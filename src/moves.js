// Moves domain helpers can be promoted here as backend integration progresses.
export function hasEquipmentId(entry) {
  return Boolean(entry && typeof entry.equipmentId === "string" && entry.equipmentId);
}
