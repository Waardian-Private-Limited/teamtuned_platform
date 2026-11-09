import type { LeadStatus, PoolSort } from '../types/pool.types';

export const POOL_FEATURE = 'TALENT_POOL_FEATURE';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  called: 'Spoke',
  no_answer: 'No answer',
  interested: 'Interested',
  not_interested: 'Not interested',
  call_back: 'Call back',
  moved: 'Moved to position',
};

/** Outcomes offered after a call, in the order people pick them. */
export const CALL_OUTCOMES: LeadStatus[] = ['called', 'no_answer', 'interested', 'call_back', 'not_interested'];

/** Status tabs on the pool page: leads first, then what is left over. */
export const LEAD_TABS: LeadStatus[] = ['new', 'call_back', 'interested', 'called', 'no_answer', 'not_interested', 'moved'];

export const SORT_LABELS: Record<PoolSort, string> = {
  recent: 'Recently updated',
  follow_up: 'Follow-up date',
  contacted: 'Last contacted',
  name: 'Name',
};

/** Suggestions for where a lead came from; any text is allowed. */
export const SOURCE_SUGGESTIONS = ['Walk-in', 'Phone call', 'WhatsApp', 'Naukri', 'LinkedIn', 'Indeed', 'Job fair', 'Consultant', 'Old records'];
