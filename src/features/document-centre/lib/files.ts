/** Saves a blob as a file (PDF downloads). */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFileName(...parts: Array<string | null | undefined>) {
  const name = parts.filter(Boolean).map((p) => String(p).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean).join('_');
  return `${name || 'letter'}.pdf`;
}
