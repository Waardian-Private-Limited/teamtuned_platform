'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { usePathname } from 'next/navigation';
import { PanelRight } from 'lucide-react';
import { usePermission } from '@/lib/hooks/usePermission';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { cx } from '@/theme/tokens';
import { ROSTER_PERMISSIONS } from '../../constants/roster.constants';
import type { Violation } from '../../types/roster.types';
import { useRosterBoard } from '../../hooks/useRosterBoard';
import { useRosterBoardDerived } from '../../hooks/useRosterBoardDerived';
import { useRosterBoardSelection } from '../../hooks/useRosterBoardSelection';
import { useRosterBoardActions } from '../../hooks/useRosterBoardActions';
import { useRosterBoardViewport } from '../../hooks/useRosterBoardViewport';
import { cellKey } from '../../utils/rosterBoard';
import { BoardHeader } from './components/BoardHeader';
import { ExportRosterDialog } from './components/ExportRosterDialog';
import { BoardSkeleton } from './components/BoardSkeleton';
import { ScoreBar } from './components/ScoreBar';
import { RosterGrid } from './components/RosterGrid';
import { CoverageView } from './components/CoverageView';
import { IssuesList } from './components/IssuesList';
import { CellInspector } from './components/CellInspector';
import { OpenShiftsPanel } from './components/OpenShiftsPanel';
import { MobileAgenda } from './components/MobileAgenda';
import { GenerateDrawer } from './components/GenerateDrawer';
import { PublishDialog } from './components/PublishDialog';

type View = 'grid' | 'coverage' | 'issues' | 'open';
type PanelTab = 'cell' | 'issues' | 'open';

export function RosterBoardPage({ rosterId }: { rosterId: number }) {
  const pathname = usePathname();
  const base = pathname.startsWith('/org-admin') ? '/org-admin/roster' : '/employee/roster';
  const { can } = usePermission();
  const canEditPerm = can(ROSTER_PERMISSIONS.EDIT);
  const canPublish = can(ROSTER_PERMISSIONS.PUBLISH);
  const { isMd, isLg } = useRosterBoardViewport();

  const rb = useRosterBoard(rosterId);
  const { board } = rb;
  const d = useRosterBoardDerived(board, rb.violations);
  const selection = useRosterBoardSelection(d.employeeIds, d.dates);

  const [view, setView] = useState<View>('grid');
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab>('cell');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [pulse, setPulse] = useState<{ key: string; n: number } | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = board?.roster.status;
  const readOnly = !canEditPerm || status === 'archived';
  const editable = !readOnly && !rb.generating;

  const actions = useRosterBoardActions({
    cellMap: d.cellMap,
    activeTemplates: d.activeTemplates,
    selected: selection.selected,
    applyEdit: rb.applyEdit,
    editable,
  });

  const moveRef = useRef(actions.moveOrSwap);
  moveRef.current = actions.moveOrSwap;
  const onMove = useCallback((from: string, to: string) => void moveRef.current(from, to), []);

  const refresh = useCallback(() => rb.load(true), [rb.load]);

  useEffect(() => () => {
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
  }, []);

  useEffect(() => {
    if (rb.generating) selection.clear();
  }, [rb.generating]);

  const understaffedDates = useMemo(() => {
    const s = new Set<string>();
    for (const k of d.violationIndex.understaffed.keys()) s.add(k.slice(k.indexOf(':') + 1));
    return s;
  }, [d.violationIndex.understaffed]);

  const effectiveView: View = isLg && view === 'open' ? 'grid' : view;
  const issueCount = rb.summary?.violationCount ?? rb.violations.length;
  const lockedCount = useMemo(() => (board?.assignments ?? []).filter((a) => a.locked).length, [board?.assignments]);
  const hasAssignments = (board?.assignments.length ?? 0) > 0;

  const onSelect = useCallback(
    (key: string, mode: 'single' | 'toggle' | 'range') => {
      selection.select(key, mode);
      setPanelTab('cell');
    },
    [selection.select]
  );

  const onAgendaPick = (key: string) => {
    selection.select(key, 'single');
    setSheetOpen(true);
  };

  const pulseCell = (key: string) => {
    setPulse({ key, n: Date.now() });
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(null), 2600);
  };

  const onPickViolation = (v: Violation) => {
    if (v.employeeId === undefined) {
      setView('coverage');
      return;
    }
    const key = cellKey(v.employeeId, v.date);
    setView('grid');
    selection.select(key, 'single');
    pulseCell(key);
  };

  const onIssuesClick = () => {
    if (isLg && effectiveView === 'grid') {
      setPanelOpen(true);
      setPanelTab('issues');
    } else setView('issues');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const arrows: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key]) {
      e.preventDefault();
      selection.move(arrows[e.key][0], arrows[e.key][1], e.shiftKey);
      return;
    }
    if (e.key === 'Escape') {
      selection.clear();
      return;
    }
    if (!editable || !selection.selected.length) return;
    if (/^[1-9]$/.test(e.key)) {
      e.preventDefault();
      actions.assignNth(Number(e.key));
    } else if (e.key === '0' || e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      actions.setKindFor(selection.selected, 'off');
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      actions.toggleLock(selection.selected);
    }
  };

  const doArchive = async () => {
    setArchiving(true);
    const ok = await rb.archive();
    setArchiving(false);
    if (ok) setArchiveOpen(false);
  };

  if (rb.loading) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="h-24 animate-pulse rounded-xl border border-line bg-bg-subtle" />
        <BoardSkeleton />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-line bg-surface px-4 py-16 text-center">
        <h2 className="text-base font-semibold text-fg">This roster could not be opened</h2>
        <p className="mt-1 max-w-sm text-sm font-medium text-[var(--tt-danger)]">{rb.loadError}</p>
        <Button className="mt-5 !h-10 !w-auto px-5 !text-sm" onClick={() => rb.load()}>Try again</Button>
      </div>
    );
  }

  const inspector = (
    <CellInspector
      rosterId={rosterId}
      keys={selection.selected}
      cellMap={d.cellMap}
      employees={d.employeesById}
      templates={d.templateMap}
      activeTemplates={d.activeTemplates}
      canEdit={editable}
      actions={actions}
    />
  );
  const issues = <IssuesList violations={rb.violations} employees={d.employeesById} templates={d.templateMap} onPick={onPickViolation} />;
  const openPanel = (
    <OpenShiftsPanel
      rosterId={rosterId}
      unitId={board.unit.id}
      openShifts={board.open_shifts}
      templates={board.templates}
      dates={d.dates}
      canEdit={editable}
      canForce={canEditPerm}
      refresh={refresh}
    />
  );

  const viewOptions: { value: View; label: string }[] = [
    { value: 'grid', label: isMd ? 'Grid' : 'Day' },
    { value: 'coverage', label: 'Coverage' },
    { value: 'issues', label: issueCount ? `Issues ${issueCount}` : 'Issues' },
    ...(!isLg ? [{ value: 'open' as View, label: 'Open' }] : []),
  ];

  const failedMessage = rb.generateError || (status === 'failed' ? board.roster.job?.error || 'Generation failed' : '');

  let content: React.ReactNode;
  if (rb.generating) content = <BoardSkeleton label="Building your roster…" />;
  else if (!board.employees.length)
    content = <div className="rounded-xl border border-line bg-surface px-4 py-14 text-center text-sm text-fg-muted">This team has no members in this period. Add members to the team to plan their shifts.</div>;
  else if (effectiveView === 'coverage') content = <CoverageView dates={d.dates} shifts={d.usedTemplates} counts={d.coverage} understaffed={d.violationIndex.understaffed} />;
  else if (effectiveView === 'issues') content = <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface p-4 tt-scroll-hidden">{issues}</div>;
  else if (effectiveView === 'open') content = <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface tt-scroll-hidden">{openPanel}</div>;
  else if (!isMd)
    content = (
      <MobileAgenda
        dates={d.dates}
        assignments={board.assignments}
        employees={d.employeesById}
        templates={d.templateMap}
        selected={selection.selected[0] ?? null}
        onPick={onAgendaPick}
      />
    );
  else
    content = (
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {!hasAssignments && (
            <p className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-xs text-fg-muted">
              Nothing is planned yet. {canEditPerm ? 'Generate the roster to fill it automatically, or click a cell to set shifts by hand.' : ''}
            </p>
          )}
          <RosterGrid
            employees={board.employees}
            employeeIds={d.employeeIds}
            dates={d.dates}
            byEmployee={d.byEmployee}
            templates={d.templateMap}
            staffed={d.staffed}
            understaffedDates={understaffedDates}
            errorCellsByEmployee={d.violationIndex.errorCellsByEmployee}
            selectedByEmployee={selection.selectedByEmployee}
            focusKey={selection.focus}
            pulse={pulse}
            canEdit={editable}
            onSelect={onSelect}
            onMove={onMove}
            onKeyDown={onKeyDown}
          />
          <p className="hidden text-[11px] text-fg-muted xl:block">
            Arrows move, Shift extends. 1–9 assign a shift, 0 sets off, L locks. Drag a shift onto another cell to move or swap.
          </p>
        </div>
        {isLg && panelOpen && (
          <aside className="flex min-h-0 w-[340px] shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line p-2">
              <SegmentedControl
                options={[
                  { value: 'cell', label: 'Cell' },
                  { value: 'issues', label: issueCount ? `Issues ${issueCount}` : 'Issues' },
                  { value: 'open', label: 'Open shifts' },
                ]}
                value={panelTab}
                onChange={setPanelTab}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">{panelTab === 'cell' ? inspector : panelTab === 'issues' ? <div className="p-4">{issues}</div> : openPanel}</div>
          </aside>
        )}
      </div>
    );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <BoardHeader
          roster={board.roster}
          unitName={board.unit.name}
          backHref={base}
          canEdit={canEditPerm}
          canPublish={canPublish}
          saveState={rb.saveState}
          validating={rb.validating}
          generating={rb.generating}
          hasAssignments={hasAssignments}
          onGenerate={() => setGenerateOpen(true)}
          onValidate={rb.validateNow}
          onPublish={() => setPublishOpen(true)}
          onArchive={() => setArchiveOpen(true)}
          onExport={() => setExportOpen(true)}
        />
        {failedMessage && !rb.generating && <p className="px-1 text-sm font-medium text-[var(--tt-danger)]">{failedMessage}</p>}
        {readOnly && status !== 'archived' && <p className="px-1 text-xs text-fg-muted">You can view this roster but not change it.</p>}
        {status === 'archived' && <p className="px-1 text-xs text-fg-muted">This roster is archived and read-only.</p>}
        <ScoreBar summary={rb.summary} issues={issueCount} onIssues={onIssuesClick} />
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <SegmentedControl options={viewOptions} value={effectiveView} onChange={setView} />
          </div>
          {isLg && effectiveView === 'grid' && (
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-pressed={panelOpen}
              className={cx('inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors', panelOpen ? 'border-fg bg-fg text-fg-inverted' : 'border-line bg-surface text-fg hover:bg-bg-subtle')}
            >
              <PanelRight className="h-3.5 w-3.5" />
              Panel
            </button>
          )}
        </div>
        <div className={cx('flex min-h-0 flex-1 flex-col', !isMd && effectiveView === 'grid' && 'min-h-[320px]')}>{content}</div>
      </div>

      <GenerateDrawer
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        regenerate={hasAssignments}
        lockedCount={lockedCount}
        settings={board.unit.settings}
        onSubmit={rb.generate}
      />
      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        rosterId={rosterId}
        version={board.roster.version}
        errorCount={d.violationIndex.errorCount}
        employees={d.employeesById}
        templates={d.templateMap}
        onPublished={refresh}
      />
      <Drawer open={!isLg && sheetOpen && selection.selected.length > 0} onClose={() => setSheetOpen(false)} title="Cell">
        <div className="-mx-4 -my-4 sm:-mx-6 sm:-my-5">{inspector}</div>
      </Drawer>
      <ExportRosterDialog open={exportOpen} rosterId={rosterId} teamName={board.unit.name} onClose={() => setExportOpen(false)} />
      <Dialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Archive roster?"
        footer={
          <>
            <Button variant="secondary" className="!h-10 !w-auto px-4 !text-sm" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button className="!h-10 !w-auto px-5 !text-sm" loading={archiving} onClick={doArchive}>Archive</Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">An archived roster becomes read-only. Schedules already published to employees stay as they are.</p>
      </Dialog>
    </DndProvider>
  );
}
