let formDirty = false;

export function setFormDirty(value: boolean) {
  formDirty = value;
}

export function confirmLeave(): boolean {
  if (!formDirty) return true;
  return window.confirm("You have unsaved changes. Leave without saving?");
}
