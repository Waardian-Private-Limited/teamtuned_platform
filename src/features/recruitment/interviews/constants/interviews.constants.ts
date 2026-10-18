import type { InterviewMode, InterviewStatus, Recommendation } from '../types/interviews.dto';

export const INTERVIEW_MODE_OPTIONS: { value: InterviewMode; label: string }[] = [
  { value: 'in_person', label: 'In person (offline)' },
  { value: 'video', label: 'Video (online)' },
  { value: 'phone', label: 'Phone' },
];

export const INTERVIEW_MODE_LABEL: Record<string, string> = {
  video: 'Video',
  in_person: 'In person',
  phone: 'Phone',
};

export const INTERVIEW_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const INTERVIEW_STATUS_FILTER: { value: InterviewStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No-show' },
];

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const RECOMMENDATION_OPTIONS: { value: Recommendation; label: string }[] = [
  { value: 'strong_no', label: 'Strong no' },
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
  { value: 'strong_yes', label: 'Strong yes' },
];

export const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_no: 'Strong no',
  no: 'No',
  yes: 'Yes',
  strong_yes: 'Strong yes',
};

export const RANGE_PRESETS = [
  { value: 'week', label: 'This week' },
  { value: 'next7', label: 'Next 7 days' },
  { value: 'custom', label: 'Custom' },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]['value'];

export const QUESTION_TYPE_OPTIONS = [
  { value: 'single', label: 'Single choice' },
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'text', label: 'Text answer' },
] as const;
