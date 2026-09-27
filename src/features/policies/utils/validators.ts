export function validatePolicyName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Policy name is required';
  if (trimmed.length > 150) return 'Policy name is too long';
  return null;
}

export function validatePolicyCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return null; // server derives one from the name when omitted
  if (!/^[a-z0-9_]+$/i.test(trimmed)) return 'Code may only contain letters, numbers and underscores';
  if (trimmed.length > 60) return 'Code is too long';
  return null;
}

export function validateLeaveTypeName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Leave type name is required';
  if (trimmed.length > 150) return 'Leave type name is too long';
  return null;
}
