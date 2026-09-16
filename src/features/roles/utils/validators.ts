export function validateRoleName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Role name is required';
  if (trimmed.length > 100) return 'Role name is too long';
  return null;
}

export function validateSetName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Set name is required';
  if (trimmed.length > 100) return 'Set name is too long';
  return null;
}
