// Natural language → cron parser, cron describer, and next-run calculator

const DAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const lower = timeStr.toLowerCase().trim();
  if (lower === 'noon') return { hour: 12, minute: 0 };
  if (lower === 'midnight') return { hour: 0, minute: 0 };

  // "9am", "9:30am", "9:30", "14:00"
  const m = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;

  let hour = parseInt(m[1]);
  const minute = m[2] ? parseInt(m[2]) : 0;
  const ampm = m[3];

  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Convert natural language schedule description to a cron expression, or null if unparseable. */
export function parseSchedule(input: string): string | null {
  const s = input.toLowerCase().trim();

  // Aliases
  if (s === 'every minute' || s === 'minutely') return '* * * * *';
  if (s === 'hourly' || s === 'every hour') return '0 * * * *';
  if (s === 'daily' || s === 'every day') return '0 0 * * *';
  if (s === 'weekly' || s === 'every week') return '0 0 * * 0';
  if (s === 'monthly' || s === 'every month') return '0 0 1 * *';

  // "every N minutes"
  let m = s.match(/^every\s+(\d+)\s+min(?:utes?)?$/);
  if (m) return `*/${m[1]} * * * *`;

  // "every N hours"
  m = s.match(/^every\s+(\d+)\s+hours?$/);
  if (m) return `0 */${m[1]} * * *`;

  // "every day at TIME" / "daily at TIME"
  m = s.match(/^(?:every\s+day|daily)\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[1]);
    if (t) return `${t.minute} ${t.hour} * * *`;
  }

  // "weekdays at TIME"
  m = s.match(/^weekdays?\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[1]);
    if (t) return `${t.minute} ${t.hour} * * 1-5`;
  }

  // "weekends at TIME"
  m = s.match(/^weekends?\s+at\s+(.+)$/);
  if (m) {
    const t = parseTime(m[1]);
    if (t) return `${t.minute} ${t.hour} * * 0,6`;
  }

  // "every DAY(s) at TIME" — e.g. "every Monday at 9am", "every Monday and Friday at 10am"
  m = s.match(/^every\s+(.+?)\s+at\s+(.+)$/);
  if (m) {
    const daysStr = m[1];
    const t = parseTime(m[2]);
    if (t) {
      const dayParts = daysStr.split(/\s+and\s+|,\s*|\s*,\s*/);
      const dayNums: number[] = [];
      for (const part of dayParts) {
        const d = DAY_MAP[part.trim()];
        if (d !== undefined) dayNums.push(d);
      }
      if (dayNums.length > 0) {
        return `${t.minute} ${t.hour} * * ${dayNums.join(',')}`;
      }
    }
  }

  // "every DAYNAME" (without time) — e.g. "every Monday"
  m = s.match(/^every\s+(\w+)$/);
  if (m) {
    const d = DAY_MAP[m[1]];
    if (d !== undefined) return `0 0 * * ${d}`;
  }

  // "at TIME daily" / "at TIME every day"
  m = s.match(/^at\s+(.+?)\s+(?:daily|every\s+day)$/);
  if (m) {
    const t = parseTime(m[1]);
    if (t) return `${t.minute} ${t.hour} * * *`;
  }

  return null;
}

function formatHourMin(hour: number, minute: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayM = String(minute).padStart(2, '0');
  return minute === 0 ? `${h} ${suffix}` : `${h}:${displayM} ${suffix}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Convert a cron expression to a human-readable string. */
export function describeCron(expr: string): string {
  const clean = expr.replace(/^#disabled:\s*/, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 5) return clean;
  const [min, hour, dom, month, dow] = parts;

  // Every minute
  if (min === '*' && hour === '*') return 'Every minute';

  // Every N minutes
  const minStep = min.match(/^\*\/(\d+)$/);
  if (minStep && hour === '*') return `Every ${minStep[1]} minute${minStep[1] === '1' ? '' : 's'}`;

  // Every hour
  if (min === '0' && hour === '*' && dom === '*' && month === '*' && dow === '*') return 'Every hour';
  if (min !== '*' && !min.startsWith('*/') && hour === '*') return `Every hour at :${min.padStart(2, '0')}`;

  // Every N hours
  const hourStep = hour.match(/^\*\/(\d+)$/);
  if (hourStep && min === '0') return `Every ${hourStep[1]} hour${hourStep[1] === '1' ? '' : 's'}`;

  const hasTime = min !== '*' && !min.startsWith('*/') && hour !== '*' && !hour.startsWith('*/');
  const timeStr = hasTime ? formatHourMin(parseInt(hour), parseInt(min)) : '';

  // Daily at time
  if (hasTime && dom === '*' && month === '*' && dow === '*') {
    return `Daily at ${timeStr}`;
  }

  // Weekdays
  if (hasTime && dom === '*' && month === '*' && (dow === '1-5' || dow === '1,2,3,4,5')) {
    return `Weekdays at ${timeStr}`;
  }

  // Weekends
  if (hasTime && dom === '*' && month === '*' && (dow === '0,6' || dow === '6,0' || dow === '0-6')) {
    return `Weekends at ${timeStr}`;
  }

  // Monthly on day N
  if (hasTime && dom !== '*' && !dom.startsWith('*/') && month === '*' && dow === '*') {
    return `Monthly on the ${ordinal(parseInt(dom))} at ${timeStr}`;
  }

  // Specific days of week
  if (hasTime && dom === '*' && month === '*' && dow !== '*') {
    const days = dow.split(',').map(d => {
      const rangeM = d.match(/^(\d+)-(\d+)$/);
      if (rangeM) return `${DAY_NAMES[parseInt(rangeM[1])]}–${DAY_NAMES[parseInt(rangeM[2])]}`;
      return DAY_NAMES[parseInt(d)] ?? d;
    }).join(', ');
    return `${days} at ${timeStr}`;
  }

  // Fallback
  return clean;
}

/** Check whether a cron field expression matches a given value. */
function matchField(value: number, expr: string, _min: number, max: number): boolean {
  if (expr === '*') return true;

  // */N step
  const stepM = expr.match(/^\*\/(\d+)$/);
  if (stepM) return value % parseInt(stepM[1]) === 0;

  for (const part of expr.split(',')) {
    const rangeM = part.match(/^(\d+)-(\d+)$/);
    if (rangeM) {
      const lo = parseInt(rangeM[1]);
      const hi = parseInt(rangeM[2]);
      if (value >= lo && value <= hi) return true;
      if (max === 7 && value === 0 && (lo <= 7 && hi >= 0)) continue; // handled below
    } else {
      const num = parseInt(part);
      if (num === value) return true;
      if (max === 7 && num === 7 && value === 0) return true; // Sunday = 0 or 7
    }
  }
  return false;
}

/**
 * Calculate the next run time after now for a given cron expression.
 * Returns null if the schedule is disabled or unparseable.
 */
export function getNextRun(cronExpr: string): Date | null {
  if (cronExpr.startsWith('#disabled')) return null;
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return null;

  const [minExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts;

  const next = new Date();
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  const limit = new Date(next.getTime() + 366 * 24 * 60 * 60 * 1000);

  while (next < limit) {
    // Month check
    if (!matchField(next.getMonth() + 1, monthExpr, 1, 12)) {
      next.setMonth(next.getMonth() + 1, 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Day check (Vixie cron: if both dom and dow specified, either can match)
    const hasDom = domExpr !== '*' && !domExpr.startsWith('*/');
    const hasDow = dowExpr !== '*' && !dowExpr.startsWith('*/');
    const domOk = matchField(next.getDate(), domExpr, 1, 31);
    const dowOk = matchField(next.getDay(), dowExpr, 0, 7);
    const dayOk = hasDom && hasDow ? domOk || dowOk : hasDom ? domOk : hasDow ? dowOk : true;

    if (!dayOk) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      continue;
    }

    // Hour check
    if (!matchField(next.getHours(), hourExpr, 0, 23)) {
      next.setHours(next.getHours() + 1, 0, 0, 0);
      continue;
    }

    // Minute check
    if (!matchField(next.getMinutes(), minExpr, 0, 59)) {
      next.setMinutes(next.getMinutes() + 1, 0, 0);
      continue;
    }

    return next;
  }

  return null;
}

/** Format a future Date as a relative "in Xm", "in Xh Ym", etc. string. */
export function formatNextRun(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return 'overdue';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'in <1m';
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs < 24) return rem > 0 ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `in ${days}d`;
}

/** Format an ISO timestamp as a relative "Xm ago", "Xh ago", etc. */
export function formatLastRun(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
