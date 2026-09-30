'use client';

import { Search } from 'lucide-react';

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-60 xl:w-72">
      <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
      />
    </div>
  );
}
