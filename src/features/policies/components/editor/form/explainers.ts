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
    const rule: string[] = [
      timingMode === 'flexible'
        ? `Pre-populates flexible shift of ${n(c.flexibleHours, 8)} working hours/day with ${duration(c.breakMinutes)} break.`
        : `Pre-populates shift from ${clock(c.shiftStartTime)} to ${clock(c.shiftEndTime)} with ${duration(c.breakMinutes)} break.`,
    ];
    const mode = s(c.weeklyOffMode, 'fixed_days');
    if (mode === 'flexible') {
      rule.push(`Flexible weekly off: up to ${n(c.flexibleDaysPerMonth, 4)} off-days per month, assigned by manager.`);
    } else if (mode === 'roster') {
      const offDays = n(c.rosterOffDaysPerWeek, 1);
      rule.push(`Roster weekly off: ${offDays} off-day${offDays === 1 ? '' : 's'} assigned per week / rota cycle.`);
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

const LEAVE_RULE: Record<string, (c: Config) => CardSummary> = {
  entitlement(c) {
    const mode = s(c.mode, 'yearly');
    if (mode === 'none') return { rule: ['This leave type is not granted under this policy.'] };
    if (mode === 'unlimited') return { rule: ['Unlimited — no balance is tracked for this leave type.'] };
    const timing = s(c.creditTiming) === 'end_of_period' ? 'at the end' : 'at the start';
    if (mode === 'monthly') {
      return {
        rule: [
          `${n(c.daysPerMonth)} day${n(c.daysPerMonth) === 1 ? '' : 's'} credited every month, ${timing} of the month.`,
          n(c.maxBalance) > 0 ? `The balance never goes above ${n(c.maxBalance)} days.` : 'There is no ceiling on the balance.',
        ],
        example: `Example: someone joining in July has ${n(c.daysPerMonth) * 6} day${n(c.daysPerMonth) * 6 === 1 ? '' : 's'} by the end of December.`,
      };
    }
    return {
      rule: [
        `${n(c.daysPerYear)} days for the whole year, credited ${timing} of the leave year.`,
        n(c.maxBalance) > 0 ? `The balance never goes above ${n(c.maxBalance)} days.` : 'There is no ceiling on the balance.',
      ],
      example: `Example: a full-year employee gets all ${n(c.daysPerYear)} days on day one.`,
    };
  },

  leaveYear(c) {
    const basis = s(c.basis, 'calendar');
    if (basis === 'joining_anniversary') {
      return { rule: ['Each employee’s leave year runs from their own joining date.'] };
    }
    if (basis === 'calendar') {
      return { rule: ['The leave year runs January to December.'] };
    }
    // financial and custom both run off startMonth/startDay — financial
    // just ships a sensible default (April) an admin can still override,
    // since the financial-year start varies by country.
    const startMonth = n(c.startMonth, 4);
    const endMonth = ((startMonth + 10) % 12) + 1;
    const startName = MONTH_NAMES[startMonth - 1] || 'April';
    const endName = MONTH_NAMES[endMonth - 1] || 'March';
    return {
      rule: [`The leave year runs ${startName} to ${endName}, starting on day ${n(c.startDay, 1)}.`],
    };
  },

  proration: (c) => ({
    rule: [
      prorationLine('joined mid-year', s(c.joiningMonth, 'prorate'), n(c.joiningCutoffDay)),
      prorationLine('leaving mid-year', s(c.exitMonth, 'prorate'), n(c.exitCutoffDay)),
    ],
  }),

  carryForward(c) {
    if (!b(c.enabled) || s(c.carryMode) === 'all_collapse') {
      return {
        rule: ['Unused leave does not carry over — the balance resets and all remaining days collapse when the leave year ends.'],
        example: 'Example: 4 days left in December are gone on 1 January.',
      };
    }
    const mode = s(c.carryMode, 'full_balance');
    const cap = n(c.maxDays);
    return {
      rule: [
        mode === 'capped' && cap > 0
          ? `Up to ${cap} unused days carry into the next leave year; anything above that collapses.`
          : 'The whole unused balance carries into the next leave year.',
        n(c.expiryMonths) > 0 ? `Carried days expire ${n(c.expiryMonths)} month${n(c.expiryMonths) === 1 ? '' : 's'} into the new year if unused.` : 'Carried days do not expire.',
      ],
      example: mode === 'capped' && cap > 0
        ? `Example: ${cap + 3} days unused at year end — ${cap} carry over, 3 collapse.`
        : undefined,
    };
  },

  request(c) {
    const rule = [
      `A request can be ${n(c.minDays)} day${n(c.minDays) === 1 ? '' : 's'} at the smallest${n(c.maxDays) > 0 ? ` and ${n(c.maxDays)} at the largest` : ', with no upper limit'}.`,
      n(c.maxRequestsPerMonth) > 0 ? `At most ${n(c.maxRequestsPerMonth)} request${n(c.maxRequestsPerMonth) === 1 ? '' : 's'} a month.` : 'There is no limit on how many requests a month.',
      n(c.noticeDays) > 0 ? `It must be raised at least ${n(c.noticeDays)} day${n(c.noticeDays) === 1 ? '' : 's'} in advance.` : 'It can be raised the same day.',
      b(c.allowHalfDay) ? 'Half days are allowed.' : 'Half days are not allowed — only whole days.',
    ];
    if (n(c.maxBackdatedDays) > 0) rule.push(`Past dates can be applied for up to ${n(c.maxBackdatedDays)} day${n(c.maxBackdatedDays) === 1 ? '' : 's'} back.`);
    if (n(c.attachmentAfterDays) > 0) rule.push(`A request longer than ${n(c.attachmentAfterDays)} day${n(c.attachmentAfterDays) === 1 ? '' : 's'} needs a document attached.`);
    return { rule };
  },

  whenExhausted: (c) => ({
    rule: [
      s(c.strategy) === 'loss_of_pay'
        ? 'Once the balance is empty, further leave is allowed but unpaid (loss of pay).'
        : 'Once the balance is empty, further requests for this leave type are refused.',
    ],
  }),

  encashOnExit(c) {
    if (!b(c.enabled)) return { rule: ['The unused balance is not paid out when an employee leaves.'] };
    const basis = n(c.salaryComponentId) === 0 ? 'Gross (all active components)' : 'the selected salary component';
    return {
      rule: [
        n(c.maxDays) > 0
          ? `Up to ${n(c.maxDays)} unused days are paid out on exit, at ${basis} salary.`
          : `The whole unused balance is paid out on exit, at ${basis} salary.`,
      ],
    };
  },
};

function prorationLine(who: string, rule: string, cutoffDay: number): string {
  switch (rule) {
    case 'full': return `Someone ${who} still gets the full year’s leave.`;
    case 'none': return `Someone ${who} gets nothing for that part-month.`;
    case 'half_if_joined_after_cutoff': return `Someone joining after the ${ordinal(cutoffDay)} gets half that month’s share.`;
    case 'half_if_left_before_cutoff': return `Someone leaving on or before the ${ordinal(cutoffDay)} gets half that month’s share.`;
    default: return `Someone ${who} gets leave in proportion to the days they were employed.`;
  }
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
