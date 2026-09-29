// Plain-English read-back of a configured card: what the rule does to an
// employee, and one worked example built from the values actually set.
//
// The form shows controls; this says what those controls mean for a person
// on Monday morning. Keyed by `${section}.${group}` — a card with no
// explainer simply shows no summary.

type Config = Record<string, unknown>;

export interface CardSummary {
  rule: string[];
  example?: string;
}

function n(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function s(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
function b(value: unknown): boolean {
  return value === true;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "09:10:00" -> "9:10 am" */
export function clock(value: unknown): string {
  const raw = s(value, '00:00:00');
  const [hRaw, mRaw] = raw.split(':');
  const hour = n(hRaw);
  const minute = String(n(mRaw)).padStart(2, '0');
  const suffix = hour >= 12 ? 'pm' : 'am';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

/** 90 -> "1h 30m" */
export function duration(minutes: unknown): string {
  const total = Math.max(0, Math.round(n(minutes)));
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function ordinal(value: number): string {
  const rest = value % 100;
  if (rest >= 11 && rest <= 13) return `${value}th`;
  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

const DEDUCTION = { half_day: 'half day', full_day: 'full day', nothing: 'nothing' } as const;
function deduction(action: unknown): string {
  return DEDUCTION[s(action, 'nothing') as keyof typeof DEDUCTION] || 'nothing';
}

const RESET = { month: 'every month', payroll_cycle: 'every payroll cycle', never: 'never' } as const;
const PAYOUT = { none: 'nothing', comp_off: 'comp off', paid: 'extra pay', employee_choice: 'comp off or extra pay, employee picks' } as const;

function payoutLine(c: Config, label: string): string[] {
  const payout = s(c.payout, 'none');
  if (payout === 'none') return [`${label} is tracked but not paid out.`];
  const lines: string[] = [`${label} earns ${PAYOUT[payout as keyof typeof PAYOUT]}.`];
  if (payout === 'paid' || payout === 'employee_choice') {
    lines.push(
      s(c.payMode) === 'flat_amount'
        ? `Paid at a flat ${n(c.amountPerHour)} per hour.`
        : `Paid at ${n(c.multiplier, 1)}x the hourly rate from ${n(c.salaryComponentId) === 0 ? 'Gross (all active components)' : 'the selected salary component'}.`
    );
  }
  if (payout === 'comp_off' || payout === 'employee_choice') {
    lines.push(
      c.compOffHalfDayMinutes !== undefined
        ? `${duration(c.compOffHalfDayMinutes)} earns a half-day comp off, ${duration(c.compOffFullDayMinutes)} a full day.`
        : 'Half-day vs full-day comp off follows the credit rule above.'
    );
    const expiryMode = s(c.compOffExpiryMode, 'days');
    if (expiryMode === 'same_month') {
      lines.push('Earned comp-off must be used within the same calendar month or it expires.');
    } else if (expiryMode === 'same_payroll_cycle') {
      lines.push('Earned comp-off must be used within the current payroll cycle or it expires.');
    } else if (expiryMode === 'never') {
      lines.push('Earned comp-off never expires.');
    } else {
      const expiry = n(c.compOffExpiryDays, 60);
      lines.push(`Earned comp-off must be used within ${expiry} days or it expires.`);
    }
  }
  if (b(c.requiresApproval)) lines.push('Nothing counts until it is approved.');
  return lines;
}

const WORK_RULES: Record<string, (c: Config) => CardSummary> = {
  shiftMatching(c) {
    if (!b(c.autoShiftMatch)) {
      return { rule: ['Every check-in is judged against the shift the employee was assigned.'] };
    }
    const window = n(c.shiftMatchThresholdMinutes, 60);
    return {
      rule: [
        `A check-in within ±${duration(window)} of another active shift's start is judged against that shift instead.`,
        'Outside that window the assigned shift still applies.',
      ],
      example: `Example: assigned General 9:00 am, Afternoon shift starts 2:00 pm. In at ${clock(subMinutes('14:00:00', Math.min(15, window)))} — counted on the Afternoon shift, not hours late.`,
    };
  },

  rosterRules(c) {
    const rest = n(c.minRestHoursBetweenShifts, 8);
    const rule: string[] = [
      rest > 0
        ? `The roster planner flags two shifts less than ${rest} hour${rest === 1 ? '' : 's'} apart.`
        : 'No minimum rest is enforced between shifts.',
      b(c.allowDoubleShift) ? 'Two shifts on the same calendar day are allowed.' : 'At most one shift per calendar day.',
    ];
    if (b(c.allowShiftSwap)) {
      rule.push(
        `Employees can swap shifts with peers up to ${n(c.swapCutoffHours, 12)} hour${n(c.swapCutoffHours, 12) === 1 ? '' : 's'} before shift start${b(c.swapRequiresApproval) ? ', once a manager approves' : ', with no approval step'}.`
      );
    } else {
      rule.push('Shift swaps are off; only managers change the roster.');
    }
    return {
      rule,
      example: rest > 0 ? `Example: Night shift ends 6:00 am — a Morning shift at 9:00 am the same day is flagged (only 3 hours rest).` : undefined,
    };
  },

  lateEarlyMarks(c) {
    const trigger = s(c.trigger, 'grace_minutes');
    if (trigger === 'off') {
      return { rule: ['Late arrivals and early exits are not marked at all on this policy.'] };
    }
    const rule: string[] = [];
    if (trigger === 'grace_minutes') {
      rule.push(`An employee is late once they check in more than ${duration(c.graceMinutes)} after their own shift start.`);
      if (b(c.markEarlyOnCheckOut)) rule.push(`Leaving more than ${duration(c.graceMinutes)} before shift end is an early exit.`);
    } else {
      if (b(c.markLateOnCheckIn)) rule.push(`Anyone checking in after ${clock(c.lateAfterTime)} is marked late, whatever their shift.`);
      if (b(c.markEarlyOnCheckOut)) rule.push(`Checking out before ${clock(c.earlyBeforeTime)} is an early exit.`);
    }
    if (!b(c.markLateOnCheckIn)) rule.push('Late arrivals are not counted.');
    const halfDay = s(c.halfDayAlsoCountsAs, 'nothing');
    rule.push(
      halfDay === 'nothing'
        ? 'A day already counted as a half day does not also use up a late or early mark.'
        : `A day already counted as a half day also uses up ${halfDay === 'both' ? 'a late mark and an early mark' : halfDay === 'late_mark' ? 'a late mark' : 'an early mark'}.`
    );

    const example = trigger === 'grace_minutes'
      ? `Example: shift starts 9:00 am, grace ${duration(c.graceMinutes)}. In at ${clock(addMinutes('09:00:00', n(c.graceMinutes) - 2))} — fine. In at ${clock(addMinutes('09:00:00', n(c.graceMinutes) + 5))} — late mark.`
      : `Example: in at ${clock(subMinutes(s(c.lateAfterTime), 5))} — fine. In at ${clock(addMinutes(s(c.lateAfterTime), 5))} — late mark.`;
    return { rule, example };
  },

  latePenalty: (c) => markPenalty(c, 'late mark', 'late'),
  earlyPenalty: (c) => markPenalty(c, 'early exit', 'early'),

  dayClassification(c) {
    const basis = s(c.basis, 'worked_percent');
    switch (basis) {
      case 'always_full_day':
        return {
          rule: ['Any day with a check-in counts as a full day, however few hours were worked.'],
          example: 'Example: in at 9:00 am, out at 11:00 am — still a full day.',
        };
      case 'worked_minutes':
        return {
          rule: [
            `${duration(c.fullDayMinutes)} worked or more is a full day.`,
            `${duration(c.halfDayMinutes)} to ${duration(c.fullDayMinutes)} is a half day; anything less is absent.`,
          ],
          example: `Example: ${duration(n(c.halfDayMinutes) + 30)} worked — half day. ${duration(n(c.fullDayMinutes) + 15)} worked — full day.`,
        };
      case 'clock_time':
        return {
          rule: [
            `Checking in after ${clock(c.halfDayIfInAfter)} or checking out before ${clock(c.fullDayIfOutBefore)} makes the day a half day.`,
            `Must work at least ${duration(c.minWorkedMinutesForHalfDay ?? 240)} to qualify for a half day; anything less is marked absent.`,
          ],
          example: `Example: in at ${clock(addMinutes(s(c.halfDayIfInAfter), 20))} and worked at least ${duration(c.minWorkedMinutesForHalfDay ?? 240)} — half day. Less than ${duration(c.minWorkedMinutesForHalfDay ?? 240)} worked is absent.`,
        };
      default:
        return {
          rule: [
            `Working ${n(c.fullDayPercent)}% of the shift or more is a full day.`,
            `${n(c.halfDayPercent)}% to ${n(c.fullDayPercent)}% is a half day; below ${n(c.halfDayPercent)}% the day is absent.`,
          ],
          example: `Example: on an 8h shift, ${duration((n(c.fullDayPercent) / 100) * 480)} worked is a full day, ${duration((n(c.halfDayPercent) / 100) * 480)} is a half day.`,
        };
    }
  },

  lateExtension(c) {
    if (!b(c.enabled)) return { rule: ['Late minutes cannot be made up by staying back.'] };
    const isMultiplier = s(c.mode) === 'multiplier';
    const rule: string[] = [
      isMultiplier
        ? `Once someone is more than ${duration(c.triggerAfterMinutes)} late, they owe ${n(c.multiplier, 1)}x those minutes at the end of the day.`
        : `Late minutes are counted in blocks of ${duration(c.slotMinutes)}; each block owes ${duration(c.extensionMinutes)} extra.`,
    ];
    const graceDays = n(c.graceDaysAllowed, 3);
    rule.push(`Not making it up is allowed ${graceDays} time${graceDays === 1 ? '' : 's'} before a penalty applies.`);
    rule.push(
      b(c.penaltyEnabled)
        ? `After the grace days are used up, it is marked a ${deduction(c.penaltyAction)}.`
        : 'No penalty is applied even after the grace days are used up.'
    );
    const late = Math.max(n(c.triggerAfterMinutes) + 10, 15);
    return {
      rule,
      example: isMultiplier
        ? `Example: ${duration(late)} late means staying ${duration(late * n(c.multiplier, 1))} past shift end to clear it.`
        : `Example: ${duration(n(c.slotMinutes) * 2)} late is 2 blocks — ${duration(n(c.extensionMinutes) * 2)} owed before checkout.`,
    };
  },

  checkIn(c) {
    const rule = [
      b(c.blockLateCheckIn)
        ? `Check-in is blocked once someone is more than ${duration(c.blockAfterMinutes)} late — they cannot mark attendance at all.`
        : 'An employee can check in at any time, however late.',
      n(c.maxSessionsPerDay) <= 1
        ? 'One check-in and check-out per day.'
        : `Up to ${n(c.maxSessionsPerDay)} check-ins a day, so breaks can be punched out and back in.`,
    ];
    const example = b(c.blockLateCheckIn)
      ? `Example: on a 9:00 am shift, arriving at ${clock(addMinutes('09:00:00', n(c.blockAfterMinutes) + 10))} leaves no way to check in — the day needs regularization.`
      : undefined;
    return { rule, example };
  },

  checkOut(c) {
    switch (s(c.mode, 'required')) {
      case 'optional':
        return { rule: ['Checking out is optional — a missing checkout is treated as a full shift worked.'] };
      case 'auto_close':
        return {
          rule: [`A forgotten checkout closes itself ${duration(c.autoCloseAfterMinutes)} after shift end.`],
          example: `Example: shift ends 6:00 pm, no checkout — the day is closed at ${clock(addMinutes('18:00:00', n(c.autoCloseAfterMinutes)))}.`,
        };
      default:
        return { rule: ['A checkout is required — until it happens the day stays open and unscored.'] };
    }
  },

  attendanceCapture(c) {
    const methodNames: Record<string, string> = {
      qr_face_geofencing: 'QR scan + Face recognition + GPS geofencing',
      qr_geofencing: 'QR scan + GPS geofencing',
      face_geofencing: 'Face recognition + GPS geofencing',
      qr_or_face_geofencing: 'QR scan or Face recognition + GPS geofencing',
      biometric_device: 'Biometric hardware terminal (fingerprint / facial)',
      biometric_or_mobile: 'Biometric device or Mobile app',
      web_or_mobile: 'Web portal or Mobile app',
      open_punch: 'Any device (web, mobile, kiosk, biometric)',
    };
    const primary = methodNames[s(c.primaryMethod, 'qr_face_geofencing')] || s(c.primaryMethod);
    const rule: string[] = [`Primary check-in method: ${primary}.`];
    const allowedDevices = [
      b(c.allowBiometricDevice) ? 'Biometric terminals' : null,
      b(c.allowMobileApp) ? 'Mobile app' : null,
      b(c.allowWebPunch) ? 'Web portal' : null,
    ].filter(Boolean);
    if (allowedDevices.length > 0) {
      rule.push(`Allowed punch channels: ${allowedDevices.join(', ')}.`);
    }
    const verifications = [
      b(c.requireGeofencing) ? 'Site GPS geofence' : null,
      b(c.requireFaceRecognition) ? 'AI face recognition' : null,
      b(c.requireQrScan) ? 'Site QR code scan' : null,
    ].filter(Boolean);
    if (verifications.length > 0) {
      rule.push(`Required verifications: ${verifications.join(' + ')}.`);
    }
    if (b(c.allowRemotePunch)) {
      rule.push('Remote punch is permitted outside registered geofences for travel or field work.');
    }
    return {
      rule,
      example: `Example: employees punch using ${primary}.`,
    };
  },

  defaultSchedule(c) {
    if (!b(c.enabled)) return { rule: ['No default schedule pre-populated; shift is chosen per employee.'] };
    const timingMode = s(c.timingMode, 'fixed_time');
    if (timingMode === 'roster') {
      const offDays = n(c.rosterOffDaysPerWeek, 1);
      return {
        rule: [
          'Each date gets its own shift (or an off day) from the roster planner — no fixed timings are pre-populated.',
          `Weekly offs come from the roster: ${offDays} off-day${offDays === 1 ? '' : 's'} expected per week.`,
          'A date nobody rostered is marked Unscheduled, not judged against a default shift.',
        ],
        example: 'Example: Mon Morning 06:00–14:00, Tue Night 22:00–06:00, Wed off — each day is judged against its own shift.',
      };
    }
    const rule: string[] = [
      timingMode === 'flexible'
        ? `Pre-populates flexible shift of ${n(c.flexibleHours, 8)} working hours/day with ${duration(c.breakMinutes)} break.`
        : `Pre-populates shift from ${clock(c.shiftStartTime)} to ${clock(c.shiftEndTime)} with ${duration(c.breakMinutes)} break.`,
    ];
    const mode = s(c.weeklyOffMode, 'fixed_days');
    if (mode === 'flexible') {
      rule.push(`Flexible weekly off: up to ${n(c.flexibleDaysPerMonth, 4)} off-days per month, assigned by manager.`);
    } else {
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
      const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
      const patternLabel: Record<string, string> = {
        every_week: 'every week',
        alternate: 'alternate weeks (1st, 3rd, 5th)',
        '1st_and_3rd': '1st & 3rd week',
        '2nd_and_4th': '2nd & 4th week',
        specific_weeks: 'specific weeks',
      };
      const offDays: string[] = [];
      for (let i = 0; i < dayKeys.length; i++) {
        const day = (c[dayKeys[i]] || {}) as Config;
        const offType = s(day.offType, 'working');
        if (offType === 'working') continue;
        let pat = patternLabel[s(day.pattern, 'every_week')] || 'every week';
        if (s(day.pattern) === 'specific_weeks') {
          const weeks: string[] = [];
          if (b(day.specificWeek1)) weeks.push('W1');
          if (b(day.specificWeek2)) weeks.push('W2');
          if (b(day.specificWeek3)) weeks.push('W3');
          if (b(day.specificWeek4)) weeks.push('W4');
          if (b(day.specificWeek5)) weeks.push('W5');
          pat = weeks.length ? weeks.join('+') : 'none';
        }
        if (offType === 'full_off') {
          offDays.push(`${dayLabels[i]} full off (${pat})`);
        } else {
          const session = s(day.halfDaySession, 'morning');
          offDays.push(`${dayLabels[i]} half-day ${session} off (${pat})`);
        }
      }
      if (offDays.length > 0) {
        rule.push(`Weekly offs: ${offDays.join(', ')}.`);
        rule.push('Note: For months with 29–31 days, 5th week days are counted in alternate and specific week patterns.');
      } else {
        rule.push('No weekly off days configured — employees work all 7 days.');
      }
    }
    rule.push('Can be customized individually when adding or editing an employee.');
    return {
      rule,
      example: `Example: onboarding an employee auto-selects ${clock(c.shiftStartTime)}–${clock(c.shiftEndTime)} shift.`,
    };
  },

  overtime(c) {
    if (!b(c.enabled)) return { rule: ['Extra hours beyond the shift are not tracked as overtime.'] };
    const dailyCapOn = c.dailyCapEnabled !== false;
    const weeklyCapOn = c.weeklyCapEnabled !== false;
    let capLine = 'No daily or weekly cap — every extra minute counts as overtime.';
    if (dailyCapOn && weeklyCapOn) capLine = `Capped at ${duration(c.dailyCapMinutes)} a day and ${duration(c.weeklyCapMinutes)} a week.`;
    else if (dailyCapOn) capLine = `Capped at ${duration(c.dailyCapMinutes)} a day — no weekly cap.`;
    else if (weeklyCapOn) capLine = `Capped at ${duration(c.weeklyCapMinutes)} a week — no daily cap.`;
    const rule = [
      `Overtime starts after ${duration(c.minBlockMinutes)} beyond the shift — shorter stay-backs earn nothing.`,
      capLine,
      ...payoutLine(c, 'Overtime'),
    ];
    if (b(c.weeklyThresholdEnabled)) {
      rule.push(`Cumulative weekly hours above ${n(c.weeklyThresholdHours, 40)} hours also qualify as overtime.`);
    }
    if (b(c.cutoffEnabled)) {
      rule.push(`Extra time worked after ${clock(c.cutoffTime)} is not counted as overtime.`);
    }
    const cappedExample = dailyCapOn ? Math.min(n(c.minBlockMinutes) + 60, n(c.dailyCapMinutes)) : n(c.minBlockMinutes) + 60;
    return {
      rule,
      example: `Example: 8h shift, ${duration(480 + n(c.minBlockMinutes) + 60)} worked — ${duration(cappedExample)} counts as overtime.`,
    };
  },

  shortPermission(c) {
    if (!b(c.enabled)) return { rule: ['Short permissions or gate passes are not allowed on this policy.'] };
    return {
      rule: [
        `Employees can take up to ${n(c.maxHoursPerRequest, 2)} hours of personal time away, up to ${n(c.maxRequestsPerMonth, 2)} times per month.`,
        b(c.requiresApproval) ? 'Requires manager approval before leaving.' : 'Applies automatically with no approval required.',
        'Does not count as a half day or deduct early exit penalty.',
      ],
      example: 'Example: leaving 1h early for an appointment counts as permission instead of early exit penalty.',
    };
  },

  consecutiveAbsence(c) {
    if (!b(c.enabled)) return { rule: ['Consecutive unnotified absence tracking is off.'] };
    const actionLabel =
      s(c.action) === 'auto_suspend'
        ? 'Account access is suspended pending review'
        : s(c.action) === 'notify_manager'
        ? 'Manager and HR are alerted immediately'
        : 'A formal warning is triggered';
    return {
      rule: [
        `An employee absent for ${n(c.thresholdDays, 7)} consecutive days without applied leave is flagged.`,
        `${actionLabel}.`,
      ],
      example: `Example: missing ${n(c.thresholdDays, 7)} days in a row with zero check-ins or leaves triggers absconding review.`,
    };
  },

  weekendHolidayWork(c) {
    if (!b(c.enabled)) return { rule: ['Weekend and holiday work is not tracked or compensated separately.'] };
    const target =
      s(c.appliesTo) === 'week_off_only'
        ? 'week offs'
        : s(c.appliesTo) === 'holiday_only'
        ? 'public holidays'
        : 'both week offs and public holidays';
    const comp = s(c.compensation, 'comp_off');
    const rule: string[] = [`Working on ${target} is tracked.`];
    const payType = s(c.payType, 'same_day_pay');
    let payDesc = '1x normal daily wage';
    if (payType === 'multiplier') {
      payDesc = `${n(c.payMultiplier, 2)}x normal wage`;
    } else if (payType === 'fixed_amount') {
      payDesc = `fixed ₹${n(c.fixedAmount, 500)} per day`;
    } else if (payType === 'per_day_plus_extra') {
      payDesc = `regular per-day wage + ₹${n(c.extraAmount, 500)} extra`;
    }

    if (comp === 'paid') {
      rule.push(`Paid at ${payDesc}.`);
    } else if (comp === 'employee_choice') {
      rule.push(`Employee can choose between ${payDesc} or compensatory off.`);
    } else {
      rule.push('Compensated with comp-off credit.');
    }
    if (comp === 'comp_off' || comp === 'employee_choice') {
      rule.push(`${n(c.halfDayMinHours, 4)}h worked earns a half-day comp-off, ${n(c.fullDayMinHours, 8)}h earns a full-day comp-off.`);
      const expiryMode = s(c.compOffExpiryMode, 'days');
      if (expiryMode === 'same_month') {
        rule.push('Earned comp-off lapses at the end of the same month.');
      } else if (expiryMode === 'same_payroll_cycle') {
        rule.push('Earned comp-off lapses at the end of the payroll cycle.');
      } else if (expiryMode === 'never') {
        rule.push('Earned comp-off never lapses.');
      } else {
        rule.push(`Earned comp-off must be taken within ${n(c.compOffExpiryDays, 60)} days.`);
      }
    }
    if (b(c.requiresApproval)) rule.push('Requires manager approval.');
    return {
      rule,
      example: 'Example: working 8 hours on a Sunday earns a full-day comp-off.',
    };
  },

  nightOvertime(c) {
    if (!b(c.enabled)) return { rule: ['Work in the night window is treated as ordinary time.'] };
    const windowStartDesc = s(c.startMode) === 'shift_end' ? 'immediately after regular shift end' : `from ${clock(c.windowStart)}`;
    const rule = [
      `Night overtime window runs ${windowStartDesc} to ${clock(c.windowEnd)}.`,
      s(c.qualifyBy) === 'still_working_after'
        ? `It counts when the employee is still checked in past ${clock(c.stillWorkingAfter)}.`
        : `It counts once ${duration(c.minMinutesInWindow)} have been worked inside that window.`,
    ];
    if (s(c.creditMode) === 'clock_time') {
      rule.push(
        `Working past ${clock(c.halfDayIfWorkingPast || '00:30:00')} earns a half-day; working past ${clock(c.fullDayIfWorkingPast || '02:00:00')} earns a full day.`
      );
    } else {
      rule.push(`${duration(c.halfDayCreditAfterMinutes)} earns half-day credit, ${duration(c.fullDayCreditAfterMinutes)} a full day.`);
    }
    rule.push(
      s(c.whenOverlapsOvertime) === 'whole_stretch'
        ? 'When work extends into the night window, the entire continuous stretch pays at the premium night rate.'
        : 'Only hours physically falling inside the night window pay at the night rate; earlier hours stay ordinary overtime.'
    );
    rule.push(...payoutLine(c, 'Night overtime'));
    if (b(c.adjustAgainstNextDayAbsence)) rule.push('A late start the next morning is offset against the night worked.');
    return {
      rule,
      example:
        s(c.creditMode) === 'clock_time'
          ? `Example: working past ${clock(c.fullDayIfWorkingPast || '02:00:00')} grants a full-day credit.`
          : `Example: worked 6:00 pm to 1:00 am with an 8h shift ending 6:00 pm — ${s(c.whenOverlapsOvertime) === 'whole_stretch' ? '7h all at the night rate' : `${duration(180)} at the night rate and ${duration(240)} as ordinary overtime`}.`,
    };
  },

  regularization(c) {
    if (!b(c.allowed)) return { rule: ['Employees cannot fix a missed punch themselves — an admin has to correct it.'] };
    return {
      rule: [
        `An employee can fix a wrong or missed punch up to ${n(c.backDaysAllowed)} day${n(c.backDaysAllowed) === 1 ? '' : 's'} back, before ${clock(c.cutoffTime)} on the day they raise it.`,
        `Up to ${n(c.maxPerMonth)} request${n(c.maxPerMonth) === 1 ? '' : 's'} a month.`,
        b(c.requiresApproval) ? 'Each one needs approval before the day changes.' : 'Requests apply immediately, with no approval.',
      ],
      example: `Example: a missed checkout on the 5th can still be fixed on the ${ordinal(5 + n(c.backDaysAllowed))} — after that only an admin can.`,
    };
  },

  sandwich(c) {
    if (!b(c.enabled)) return { rule: ['A week off or holiday between two absences is still paid.'] };
    const counted = [b(c.countWeekOff) ? 'Week offs' : null, b(c.countHoliday) ? 'holidays' : null].filter(Boolean).join(' and ');
    return {
      rule: [counted ? `${counted} falling between two absent days become unpaid too.` : 'Neither week offs nor holidays are counted, so the rule has no effect as configured.'],
      example: 'Example: absent Friday and Monday with Saturday and Sunday off — all four days are unpaid.',
    };
  },
};

function markPenalty(c: Config, noun: string, kind: 'late' | 'early'): CardSummary {
  const allowance = n(c.allowance);
  const action = deduction(c.afterAllowance);
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  if (action === 'nothing') {
    return { rule: [`${Noun}s are recorded but never deducted.`] };
  }
  return {
    rule: [
      `${allowance} ${noun}${allowance === 1 ? '' : 's'} ${allowance === 1 ? 'is' : 'are'} free; every one after that costs a ${action}.`,
      `The count resets ${RESET[s(c.resetEvery, 'month') as keyof typeof RESET]}.`,
    ],
    example: `Example: ${kind} on the 3rd, 9th and 14th with an allowance of ${allowance} — ${allowance >= 3 ? `nothing is deducted until the ${ordinal(allowance + 1)} one` : `the ${ordinal(allowance + 1)} one is deducted as a ${action}`}.`,
  };
}

const PAYROLL: Record<string, (c: Config, section: Config) => CardSummary> = {
  cycle(c, section) {
    const frequency = s(section.frequency, 'monthly');
    const rule: string[] = [];
    if (frequency === 'monthly') {
      rule.push(`Each payout covers day ${n(c.startDay)} to ${s(c.endDayMode) === 'last_day' ? 'the last day of the month' : `day ${n(c.endDay)}`}.`);
    } else if (frequency === 'semi_monthly') {
      rule.push(`Two payouts a month: the 1st to the ${ordinal(n(c.firstHalfEndDay))}, then the ${ordinal(n(c.firstHalfEndDay) + 1)} to month end.`);
    } else {
      rule.push(`${frequency === 'weekly' ? 'Weekly' : 'Fortnightly'} cycles, weeks starting ${s(c.weekStartsOn, 'Mon')}.`);
    }
    rule.push(
      n(c.attendanceCutoffDay) > 0
        ? `Attendance is counted up to the ${ordinal(n(c.attendanceCutoffDay))}; anything after that is paid in the next cycle.`
        : 'Attendance is counted for the whole cycle, with no cut-off.'
    );
    return {
      rule,
      example: n(c.attendanceCutoffDay) > 0
        ? `Example: leave approved on the ${ordinal(n(c.attendanceCutoffDay) + 2)} shows up in next month's payslip, not this one.`
        : undefined,
    };
  },

  payDay(c) {
    const mode = s(c.mode, 'fixed_day');
    const when = mode === 'days_after_cycle_end'
      ? `${n(c.daysAfterCycleEnd)} day${n(c.daysAfterCycleEnd) === 1 ? '' : 's'} after the cycle ends`
      : mode === 'last_working_day'
        ? 'on the last working day of the cycle'
        : `on the ${ordinal(n(c.day))} of the month`;
    const adjust = s(c.ifHolidayOrWeekend, 'previous_working_day');
    return {
      rule: [
        `Salary goes out ${when}.`,
        adjust === 'no_change'
          ? 'It is not moved when that falls on a holiday or week off.'
          : `If that lands on a holiday or week off, it moves to the ${adjust === 'next_working_day' ? 'next' : 'previous'} working day.`,
      ],
      example: adjust === 'no_change' ? undefined : `Example: a pay day falling on a Sunday is paid on ${adjust === 'next_working_day' ? 'Monday' : 'Friday'}.`,
    };
  },

  payslipRelease: (c) => ({
    rule: [
      n(c.daysAfterPayDay) === 0
        ? 'Payslips are visible on pay day itself.'
        : `Payslips become visible ${n(c.daysAfterPayDay)} day${n(c.daysAfterPayDay) === 1 ? '' : 's'} after pay day.`,
    ],
  }),

  payableDays(c) {
    const basis = s(c.basis, 'calendar_days');
    const fixedDays = n(c.fixedDaysCount, basis === 'fixed_26' ? 26 : 30);
    const text: Record<string, string> = {
      calendar_days: 'A day of salary is the monthly salary divided by the real number of days in that month (28-31).',
      working_days: 'A day of salary is the monthly salary divided by the working days in that month, so week offs and holidays do not dilute it.',
      fixed_days: `Every month is treated as a fixed ${fixedDays} days.`,
      fixed_30: `Every month is treated as a fixed ${fixedDays} days.`,
      fixed_26: `Every month is treated as a fixed ${fixedDays} days.`,
    };
    const rule: string[] = [text[basis] || text.calendar_days];
    if (b(c.limitPayableDays)) {
      const mode = s(c.maxPayableDaysMode, 'current_month_days');
      if (mode === 'current_month_days') {
        rule.push('Payable days are capped at actual calendar days in that month (28–31 max). Extra days worked collapse.');
      } else {
        const cap = n(c.customMaxPayableDays, 30);
        rule.push(`Payable days are capped at ${cap} days maximum. Extra days worked collapse.`);
      }
    } else {
      rule.push('Payable days cap is disabled — employees can receive 35, 40+ paid days if extra shifts or weekend work are completed.');
    }
    return {
      rule,
      example: basis === 'fixed_days' || basis === 'fixed_30' || basis === 'fixed_26'
        ? `Example: on 30,000 monthly salary, one unpaid day costs ${Math.round(30000 / fixedDays)}.`
        : undefined,
    };
  },

  proration: (c) => ({
    rule: [
      s(c.newJoiner) === 'joining_date'
        ? 'A new joiner is paid from their joining date for that first part-month.'
        : 'A new joiner is paid for the days they actually completed in the first month.',
      s(c.exit) === 'last_working_day'
        ? 'A leaver is paid up to their last working day.'
        : 'A leaver is paid for the days they actually completed.',
      s(c.midCycleSalaryChange) === 'split_prorated'
        ? 'A salary change mid-cycle splits that cycle: old rate before the change, new rate after.'
        : 'A salary change mid-cycle only takes effect from the next cycle.',
    ],
    example: 'Example: joining on the 16th of a 30-day month earns roughly half that month’s salary.',
  }),

  rounding: (c) => ({
    rule: [
      s(c.mode) === 'none'
        ? 'Net pay is not rounded.'
        : `Net pay is rounded ${s(c.mode) === 'nearest' ? 'to the nearest' : s(c.mode)} value at ${n(c.decimals)} decimal place${n(c.decimals) === 1 ? '' : 's'}.`,
    ],
  }),

  fullAndFinal: (c) => ({
    rule: [
      b(c.recoverNoticeShortfall)
        ? 'Unserved notice period is recovered from the final settlement.'
        : 'Unserved notice period is not recovered.',
      b(c.encashLeaveOnExit)
        ? 'Encashable leave is paid out in the final settlement.'
        : 'Leave balance is not paid out on exit.',
      `Gratuity applies after ${n(c.gratuityAfterYears)} year${n(c.gratuityAfterYears) === 1 ? '' : 's'} of service.`,
    ],
  }),
};

function cap(value: unknown): { on: boolean; value: number } {
  const c = (value || {}) as Config;
  return { on: b(c.enabled), value: n(c.value) };
}
function days(value: number): string {
  return `${value} day${value === 1 ? '' : 's'}`;
}
function list(values: unknown): string {
  const items = Array.isArray(values) ? values.map((v) => optionLabelLower(String(v))) : [];
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}
function optionLabelLower(value: string): string {
  return value.replace(/_/g, ' ');
}

const ALL_GENDERS = 3;
const ALL_MARITAL = 4;
const ALL_EMPLOYMENT = 3;

const LEAVE_RULE: Record<string, (c: Config) => CardSummary> = {
  eligibility(c) {
    const rule: string[] = [];
    const genders = Array.isArray(c.genders) ? c.genders : [];
    const marital = Array.isArray(c.maritalStatuses) ? c.maritalStatuses : [];
    const employment = Array.isArray(c.employmentTypes) ? c.employmentTypes : [];
    if (genders.length < ALL_GENDERS) rule.push(`Only for ${list(genders)} employees.`);
    if (marital.length < ALL_MARITAL) rule.push(`Only for employees who are ${list(marital)}.`);
    if (employment.length < ALL_EMPLOYMENT) rule.push(`Only for ${list(employment)} employees.`);
    const wait = cap(c.waitingPeriod);
    if (wait.on) rule.push(`Usable ${days(wait.value)} after the ${s(c.waitingCountedFrom) === 'confirmation_date' ? 'confirmation' : 'joining'} date.`);
    switch (s(c.duringProbation)) {
      case 'earn_not_use': rule.push('Builds up during probation but can only be used once confirmed.'); break;
      case 'no_earning': rule.push('Nothing is credited during probation.'); break;
      case 'blocked': rule.push('Not available during probation.'); break;
    }
    switch (s(c.duringNoticePeriod)) {
      case 'capped': rule.push(`At most ${days(n(c.noticePeriodMaxDays))} during the notice period.`); break;
      case 'blocked': rule.push('Not available during the notice period.'); break;
    }
    return { rule: rule.length ? rule : ['Every employee on this policy can take it.'] };
  },

  entitlement(c) {
    const mode = s(c.mode, 'yearly');
    const timing = s(c.creditTiming) === 'end_of_period' ? 'at the end' : 'at the start';
    const ceiling = cap(c.maxBalance);
    const ceilingLine = ceiling.on ? `The balance never goes above ${days(ceiling.value)}.` : 'There is no ceiling on the balance.';
    switch (mode) {
      case 'none':
        return { rule: ['No regular credit. The balance only comes from elsewhere, e.g. comp-off earned or an admin adjustment.'] };
      case 'unlimited':
        return { rule: ['Unlimited — no balance is tracked for this leave type.'] };
      case 'per_event':
        return {
          rule: [`Each occasion grants ${days(n(c.daysPerEvent))}; there is no running balance.`],
          example: 'Example: use the limits step to say how many occasions are allowed (e.g. once in the whole employment).',
        };
      case 'earned_by_work':
        return {
          rule: [`${days(n(c.creditPerBlock))} credited for every ${n(c.workedDaysPerCredit)} days worked (${optionLabelLower(s(c.workedDaysInclude, 'present_only'))}).`, ceilingLine],
          example: `Example: 240 days worked earns ${Math.floor(240 / Math.max(1, n(c.workedDaysPerCredit))) * n(c.creditPerBlock)} days.`,
        };
      case 'monthly':
        return {
          rule: [`${days(n(c.daysPerMonth))} credited every month, ${timing} of the month.`, ceilingLine],
          example: `Example: someone joining in July has ${n(c.daysPerMonth) * 6} days by the end of December.`,
        };
      case 'half_yearly':
      case 'quarterly': {
        const parts = mode === 'quarterly' ? 4 : 2;
        return {
          rule: [`${days(n(c.daysPerYear))} a year, credited as ${days(n(c.daysPerYear) / parts)} ${timing} of each ${mode === 'quarterly' ? 'quarter' : 'half-year'}.`, ceilingLine],
        };
      }
      default:
        return {
          rule: [`${days(n(c.daysPerYear))} for the whole year, credited ${timing} of the leave year.`, ceilingLine],
          example: `Example: a full-year employee gets all ${n(c.daysPerYear)} days on day one.`,
        };
    }
  },

  tenureSlabs(c) {
    if (!b(c.enabled)) return { rule: ['The same amount every year, whatever the length of service.'] };
    const slabs = (Array.isArray(c.slabs) ? c.slabs : []) as Config[];
    return { rule: slabs.map((slab) => `From ${n(slab.fromYears)} years of service: ${days(n(slab.daysPerYear))} a year.`) };
  },

  leaveYear(c) {
    const basis = s(c.basis, 'calendar');
    if (basis === 'joining_anniversary') return { rule: ['Each employee’s leave year runs from their own joining date.'] };
    if (basis === 'calendar') return { rule: ['The leave year runs January to December.'] };
    const startMonth = n(c.startMonth, 4);
    const endMonth = ((startMonth + 10) % 12) + 1;
    return { rule: [`The leave year runs ${MONTH_NAMES[startMonth - 1]} to ${MONTH_NAMES[endMonth - 1]}, starting on day ${n(c.startDay, 1)}.`] };
  },

  joining(c) {
    switch (s(c.mode, 'prorate_days')) {
      case 'full_year': return { rule: ['A mid-year joiner gets the full year’s amount.'] };
      case 'next_cycle': return { rule: ['A mid-year joiner gets nothing until the next leave year starts.'] };
      case 'after_probation':
        return { rule: [b(c.backfillProbation) ? 'Credit starts on confirmation and includes the probation months.' : 'Credit starts on the confirmation date; probation months earn nothing.'] };
      case 'month_cutoff':
        return {
          rule: [
            `Joining on or before the ${ordinal(n(c.cutoffDay))}: the joining month counts in full.`,
            `Joining after it: the joining month gives ${s(c.afterCutoff) === 'half_month' ? 'half a month’s share' : 'nothing'}.`,
          ],
          example: `Example: on 12 days a year, joining on the ${ordinal(Math.min(28, n(c.cutoffDay) + 1))} of July gives ${s(c.afterCutoff) === 'half_month' ? '5.5' : '5'} days for the year.`,
        };
      default:
        return {
          rule: ['A mid-year joiner gets the share of the year left from their joining date.'],
          example: 'Example: on 12 days a year, joining on 1 July gives 6 days.',
        };
    }
  },

  request(c) {
    const rule: string[] = [];
    const unit = s(c.smallestUnit, 'half_day');
    rule.push(unit === 'full_day' ? 'Whole days only.' : unit === 'hour' ? 'Can be taken by the hour.' : 'Half days are allowed.');
    const min = cap(c.minPerRequest);
    const max = cap(c.maxPerRequest);
    if (min.on || max.on) rule.push(`Each request is ${min.on ? `at least ${days(min.value)}` : ''}${min.on && max.on ? ' and ' : ''}${max.on ? `at most ${days(max.value)}` : ''}.`);
    const notice = cap(c.notice);
    rule.push(notice.on ? `Apply at least ${days(notice.value)} in advance.` : 'Can be applied for the same day.');
    const longer = (c.longerLeaveNotice || {}) as Config;
    if (b(longer.enabled)) {
      for (const slab of (Array.isArray(longer.slabs) ? longer.slabs : []) as Config[]) {
        rule.push(`Leave longer than ${days(n(slab.longerThanDays))} needs ${days(n(slab.noticeDays))}’ notice.`);
      }
    }
    const past = cap(c.pastDates);
    rule.push(!past.on ? 'Any past date can be applied for.' : past.value === 0 ? 'Past dates cannot be applied for.' : `Past dates up to ${days(past.value)} back.`);
    const future = cap(c.futureDates);
    if (future.on) rule.push(`Can be applied up to ${days(future.value)} ahead.`);
    const attach = s(c.attachment, 'never');
    if (attach === 'always') rule.push('A supporting document is always needed.');
    if (attach === 'longer_than') rule.push(`A supporting document is needed beyond ${days(n(c.attachmentAfterDays))}.`);
    if (!b(c.requiresApproval)) rule.push('Approved automatically.');
    else {
      const auto = cap(c.autoApprove);
      rule.push(auto.on ? `Requests up to ${days(auto.value)} are approved automatically; longer ones need approval.` : 'Every request needs approval.');
    }
    return { rule };
  },

  block(c) {
    switch (s(c.rule, 'any')) {
      case 'exact_days': return { rule: [`Every request must be exactly ${days(n(c.blockDays))} — taken all together.`] };
      case 'min_block': return { rule: [`Every request must be at least ${days(n(c.blockDays))} in one go.`] };
      case 'whole_balance': return { rule: ['The whole available balance must be taken in one request.'] };
      default: return { rule: ['Can be split into requests of any length.'] };
    }
  },

  dayCounting(c) {
    const rule = [
      s(c.weekOffsInside) === 'count' ? 'Week offs inside the leave are charged.' : 'Week offs inside the leave are not charged.',
      s(c.holidaysInside) === 'count' ? 'Holidays inside the leave are charged.' : 'Holidays inside the leave are not charged.',
    ];
    const sandwich = s(c.sandwich, 'follow_policy');
    rule.push(sandwich === 'on' ? 'Sandwich rule on: a week off or holiday between two leaves is charged too.' : sandwich === 'off' ? 'Sandwich rule off for this leave.' : 'Sandwich rule follows the policy’s work-rules setting.');
    return { rule };
  },

  frequency(c) {
    const lines: Array<[string, string]> = [
      ['requestsPerMonth', 'request(s) a month'],
      ['requestsPerQuarter', 'request(s) a quarter'],
      ['requestsPerYear', 'request(s) a leave year'],
      ['requestsLifetime', 'request(s) in the whole employment'],
      ['daysPerMonth', 'day(s) a month'],
      ['daysLifetime', 'day(s) in the whole employment'],
    ];
    const rule = lines.filter(([key]) => cap(c[key]).on).map(([key, what]) => `At most ${cap(c[key]).value} ${what}.`);
    const gap = cap(c.gapBetweenRequests);
    if (gap.on) rule.push(`At least ${days(gap.value)} between two requests.`);
    return { rule: rule.length ? rule : ['No limits on how often.'] };
  },

  clubbing(c) {
    const rule: string[] = [];
    const mode = s(c.mode, 'allow_all');
    if (mode === 'block_listed') rule.push(`Cannot be taken right next to the listed leave types — ${days(n(c.minGapDays))} of work needed in between.`);
    else if (mode === 'allow_only_listed') rule.push('Can only be taken right next to the listed leave types.');
    else rule.push('Can be taken next to any other leave.');
    if (s(c.nextToHoliday) === 'blocked') rule.push('Cannot be taken right before or after a holiday or week off.');
    return { rule, example: s(c.nextToHoliday) === 'blocked' ? 'Example: a Friday or Monday next to a weekend is refused.' : undefined };
  },

  whenExhausted(c) {
    switch (s(c.strategy, 'reject')) {
      case 'loss_of_pay': return { rule: ['Days beyond the balance are allowed but unpaid (loss of pay).'] };
      case 'negative_balance': return { rule: [`The balance can go up to ${days(n(c.maxNegativeDays))} below zero; the next credit fills it.`] };
      case 'use_other_leave':
        return { rule: [`Days beyond the balance come from the listed leave types in order; then they are ${s(c.afterFallback) === 'reject' ? 'refused' : 'unpaid (loss of pay)'}.`] };
      default: return { rule: ['A request larger than the balance is refused.'] };
    }
  },

  carryForward(c) {
    if (!b(c.enabled) || s(c.carryMode) === 'all_collapse') {
      return { rule: ['Unused leave does not carry over — it all lapses when the leave year ends.'], example: 'Example: 4 days left in December are gone on 1 January.' };
    }
    const expiry = cap(c.expiry);
    const rule = [
      s(c.carryMode) === 'capped'
        ? `Up to ${days(n(c.maxDays))} carry into the next year; the rest ${n(c.excessGoesTo) > 0 ? 'moves to another leave type' : 'lapses'}.`
        : 'The whole unused balance carries into the next year.',
      expiry.on ? `Carried days expire ${expiry.value} month${expiry.value === 1 ? '' : 's'} into the new year if unused.` : 'Carried days do not expire.',
    ];
    return { rule };
  },

  yearEndEncashment(c) {
    if (!b(c.enabled)) return { rule: ['Nothing is paid out at year end.'] };
    const max = cap(c.maxDays);
    return {
      rule: [
        `At year end, the balance above ${days(n(c.keepMinBalance))} is paid out${max.on ? `, up to ${days(max.value)}` : ''}.`,
        `Paid at ${n(c.salaryComponentId) === 0 ? 'Gross (all active components)' : 'the selected salary component'}.`,
      ],
    };
  },

  exit(c) {
    const rule: string[] = [];
    switch (s(c.mode, 'prorate_days')) {
      case 'full_year': rule.push('A leaver keeps the full year’s amount.'); break;
      case 'month_cutoff':
        rule.push(`Leaving on or after the ${ordinal(n(c.cutoffDay))}: the exit month counts in full; before it, the month gives ${s(c.beforeCutoff) === 'half_month' ? 'half a month’s share' : 'nothing'}.`);
        break;
      default: rule.push('A leaver keeps the share of the year up to their exit date.');
    }
    rule.push(s(c.excessUsed) === 'recover_in_settlement' ? 'Leave used beyond that share is deducted in the final settlement.' : 'Leave used beyond that share is not recovered.');
    return { rule };
  },

  encashOnExit(c) {
    if (!b(c.enabled)) return { rule: ['The unused balance is not paid out when an employee leaves.'] };
    const max = cap(c.maxDays);
    const basis = n(c.salaryComponentId) === 0 ? 'Gross (all active components)' : 'the selected salary component';
    return { rule: [`${max.on ? `Up to ${days(max.value)} of` : 'The whole'} unused balance is paid out on exit, at ${basis} salary.`] };
  },

  absenceAdjustment(c) {
    if (!b(c.enabled)) return { rule: ['Not used for absences with no leave applied — those stay loss of pay unless another leave type covers them.'] };
    return {
      rule: [
        `At payroll, an absent day with no leave applied is taken from this balance (order ${n(c.priority, 1)} among leave types that do this); what no balance covers is loss of pay.`,
        s(c.mode) === 'automatic' ? 'Applied automatically.' : 'Proposed in the payroll run for HR to confirm.',
        b(c.halfDays) ? 'Half-day absences are covered too.' : 'Half-day absences stay loss of pay.',
        b(c.penaltyDays) ? 'Late / early-exit penalty deductions are covered too.' : 'Late / early-exit penalties stay a pay cut.',
      ],
      example: 'Example: 2 unapplied absences with 1 day left here — 1 comes from this leave, the other from the next leave type in order, or loss of pay.',
    };
  },

  changeHandling(c) {
    const rule: string[] = [];
    switch (s(c.openCycles, 'split_prorate')) {
      case 'recalc_full': rule.push('The new rule applies to the whole current leave year.'); break;
      case 'next_cycle_only': rule.push('Balances this leave year stay as they are; the new rule starts next leave year.'); break;
      case 'increase_only': rule.push('Balances only ever go up from a change, never down.'); break;
      default: rule.push('The old rule counts up to the effective date and the new rule after it.');
    }
    switch (s(c.whenBelowUsed, 'floor_at_zero')) {
      case 'allow_negative': rule.push('If that is less than already used, the balance goes negative and future credit fills it.'); break;
      case 'recover_as_lop': rule.push('If that is less than already used, the excess is deducted as loss of pay.'); break;
      default: rule.push('If that is less than already used, the balance stops at zero — leave already taken is never taken back.');
    }
    rule.push(s(c.pendingRequests) === 'recheck_new_rules' ? 'Requests awaiting approval are checked again under the new rules.' : 'Requests awaiting approval keep the rules they were raised under.');
    const removed: Record<string, string> = {
      usable_till_year_end: 'stays usable until the leave year ends',
      lapse_now: 'lapses on the effective date',
      encash: 'is paid out',
      move_to_type: 'moves to another leave type',
    };
    rule.push(`A leave type taken out of the policy: its balance ${removed[s(c.removedLeaveType, 'usable_till_year_end')]}.`);
    return {
      rule,
      example: s(c.openCycles, 'split_prorate') === 'split_prorate'
        ? 'Example: 12 days a year raised to 24 from 1 July gives 18 days for this year.'
        : undefined,
    };
  },
};

/** One line under a leave type's name: its credit and the rules in force. */
export function summarizeLeaveRule(rule: Config): string {
  const e = (rule.entitlement || {}) as Config;
  const parts: string[] = [];
  switch (s(e.mode, 'yearly')) {
    case 'monthly': parts.push(`${n(e.daysPerMonth)}/month`); break;
    case 'per_event': parts.push(`${days(n(e.daysPerEvent))} per occasion`); break;
    case 'earned_by_work': parts.push(`${n(e.creditPerBlock)} per ${n(e.workedDaysPerCredit)} days worked`); break;
    case 'unlimited': parts.push('Unlimited'); break;
    case 'none': parts.push('No regular credit'); break;
    default: parts.push(`${n(e.daysPerYear)} days/year`);
  }
  const block = (rule.block || {}) as Config;
  if (s(block.rule) === 'exact_days') parts.push(`exactly ${days(n(block.blockDays))} at a time`);
  if (s(block.rule) === 'min_block') parts.push(`min ${days(n(block.blockDays))} at a time`);
  const freq = (rule.frequency || {}) as Config;
  if (cap(freq.requestsLifetime).on) parts.push(`${cap(freq.requestsLifetime).value}× per career`);
  const el = (rule.eligibility || {}) as Config;
  if (Array.isArray(el.genders) && el.genders.length < ALL_GENDERS) parts.push(`${list(el.genders)} only`);
  const adj = (rule.absenceAdjustment || {}) as Config;
  if (b(adj.enabled)) parts.push(`covers absences (#${n(adj.priority, 1)})`);
  const cf = (rule.carryForward || {}) as Config;
  if (['yearly', 'half_yearly', 'quarterly', 'monthly', 'earned_by_work'].includes(s(e.mode, 'yearly'))) {
    parts.push(b(cf.enabled) && s(cf.carryMode) !== 'all_collapse' ? 'carries forward' : 'lapses at year end');
  }
  return parts.join(' · ');
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + (m || 0) + Math.round(minutes) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`;
}
function subMinutes(time: string, minutes: number): string {
  return addMinutes(time, -minutes);
}

/**
 * The summary for one card: `section` is the config section key, `group`
 * the card's key inside it, `value` that card's current values and
 * `sectionValue` the whole section (a payroll card can depend on the
 * section-level frequency).
 */
export function explainCard(section: string, group: string, value: unknown, sectionValue: unknown): CardSummary | null {
  const config = (value || {}) as Config;
  try {
    if (section === 'workRules') return WORK_RULES[group]?.(config) ?? null;
    if (section === 'payrollCycle') return PAYROLL[group]?.(config, (sectionValue || {}) as Config) ?? null;
    if (section === 'leave') return LEAVE_RULE[group]?.(config) ?? null;
    return null;
  } catch {
    // A summary is a convenience: a malformed draft config must never stop
    // the form it describes from rendering.
    return null;
  }
}
