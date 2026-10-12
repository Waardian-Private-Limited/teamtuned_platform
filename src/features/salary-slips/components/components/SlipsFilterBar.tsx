'use client';

import { Download, Lock, Search, Send, X } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { SearchableFilterDropdown, type FilterOption } from '@/components/ui/SearchableFilterDropdown';
import { Btn } from '@/features/compensation/components/shared/Buttons';

interface SlipsFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  siteId: number | null;
  siteOptions: FilterOption[];
  onSiteChange: (value: number | null) => void;
  selectedCount: number;
  canEdit: boolean;
  canHold: boolean;
  generateBlockedReason: string | null;
  holdBlockedReason: string | null;
  onGenerateSelected: () => void;
  onHoldSelected: () => void;
  onDownloadSelected: () => void;
  onClearSelection: () => void;
}

export function SlipsFilterBar({
  searchValue,
  onSearchChange,
  siteId,
  siteOptions,
  onSiteChange,
  selectedCount,
  canEdit,
  canHold,
  generateBlockedReason,
  holdBlockedReason,
  onGenerateSelected,
  onHoldSelected,
  onDownloadSelected,
  onClearSelection,
}: SlipsFilterBarProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 lg:w-64 2xl:h-10 2xl:w-72">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
          <input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or code…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg outline-none placeholder:text-fg-subtle focus:ring-0 sm:text-sm"
          />
        </div>
        {siteOptions.length > 0 && (
          <SearchableFilterDropdown
            label="Sites"
            allLabel="All sites"
            value={siteId}
            options={siteOptions}
            onChange={onSiteChange}
            searchPlaceholder="Search sites…"
            className="w-full sm:w-48"
          />
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 tt-fade-in sm:justify-end">
          <span className="text-xs font-semibold text-fg sm:text-sm">
            {selectedCount} selected
            {canEdit && generateBlockedReason && <span className="ml-2 font-normal text-fg-muted">{generateBlockedReason}</span>}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Btn variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={onClearSelection}>
              Clear
            </Btn>
            {canEdit && (
              <Tooltip content={generateBlockedReason} side="bottom" align="end">
                <Btn icon={<Send className="h-3.5 w-3.5" />} disabled={Boolean(generateBlockedReason)} onClick={onGenerateSelected}>
                  Generate selected
                </Btn>
              </Tooltip>
            )}
            {canEdit && canHold && (
              <Tooltip content={holdBlockedReason} side="bottom" align="end">
                <Btn icon={<Lock className="h-3.5 w-3.5" />} disabled={Boolean(holdBlockedReason)} onClick={onHoldSelected}>
                  Hold selected
                </Btn>
              </Tooltip>
            )}
            <Btn variant="primary" icon={<Download className="h-3.5 w-3.5" />} onClick={onDownloadSelected}>
              Download selected
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
