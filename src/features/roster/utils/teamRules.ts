export type WeightKey = 'nights' | 'weekends' | 'holidays' | 'shifts' | 'preference' | 'continuity' | 'overtime' | 'weekOffWork' | 'holidayWork' | 'minHours';

export const WEIGHT_DEFAULTS: Record<WeightKey, number> = {
  nights: 3, weekends: 2, holidays: 3, shifts: 1, preference: 4, continuity: 1.5, overtime: 50, weekOffWork: 20, holidayWork: 25, minHours: 2,
};

export const WEIGHT_INFO: { key: WeightKey; label: string; help: string }[] = [
  { key: 'nights', label: 'Night shifts', help: 'Higher spreads night shifts more evenly between people.' },
  { key: 'weekends', label: 'Weekends', help: 'Higher spreads weekend work more evenly.' },
  { key: 'holidays', label: 'Holidays', help: 'Higher spreads public-holiday work more evenly.' },
  { key: 'shifts', label: 'Total shifts', help: 'Higher keeps everyone close to the same number of shifts.' },
  { key: 'preference', label: 'Preferences', help: 'Higher follows what people asked for, such as preferred or avoided days.' },
  { key: 'continuity', label: 'Continuity', help: 'Higher keeps a person on the same kind of shift from day to day.' },
  { key: 'overtime', label: 'Overtime', help: 'Higher avoids overtime unless there is no other way to cover a shift.' },
  { key: 'weekOffWork', label: 'Weekly off days', help: 'Higher protects each person’s weekly off day.' },
  { key: 'holidayWork', label: 'Holiday duty', help: 'Higher avoids giving holiday duty to people who should be off.' },
  { key: 'minHours', label: 'Minimum hours', help: 'Higher works harder to give everyone their minimum weekly hours.' },
];
