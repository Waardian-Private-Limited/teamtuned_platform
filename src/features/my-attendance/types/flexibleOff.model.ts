/** The employee's flexible week off for one month: what the policy allows and the dates they picked. */
export interface FlexibleOff {
  /** False when the employee's week off is not flexible; the card is then hidden. */
  enabled: boolean;
  timezone: string;
  today: string;
  /** 'yyyy-MM' */
  month: string;
  quota: number;
  used: number;
  remaining: number;
  /** Picked dates, 'yyyy-MM-dd', oldest first. */
  dates: string[];
}
