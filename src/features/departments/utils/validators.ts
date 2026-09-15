export function validateDepartmentName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Department name is required';
  if (trimmed.length > 100) return 'Department name is too long';
  return null;
}
