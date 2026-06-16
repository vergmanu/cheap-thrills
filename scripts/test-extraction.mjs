function parseTime(hourStr, minStr, period) {
  const hour = parseInt(hourStr, 10);
  const min = minStr ? parseInt(minStr, 10) : 0;
  if (min > 59) return null;
  if (period && period.toLowerCase() === 'pm' && hour < 12) return String(hour + 12).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  if (period && period.toLowerCase() === 'am' && hour === 12) return '00:' + String(min).padStart(2, '0');
  if (hour > 23) return null;
  return String(hour).padStart(2, '0') + ':' + String(min).padStart(2, '0');
}

const DAYS_PATTERN = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend|daily|all day)/gi;
const DEAL_KEYWORDS = ['draft', 'beer', 'cocktail', 'margarita', 'wine', 'appetizer', 'happy hour', 'special', 'discount', 'off', 'deal', 'promotion'];

const testLines = [
  'Mon–Thu: 4–6:30 pm',
  'Fri–Sun: 4–6 pm',
  'Happy Hour Monday-Friday 3pm-6pm',
  'Daily specials: 5:00-7:00pm draft beer $4',
  'HAPPY HOURS',
  'Mon: 11:30 am–4 pm lunch',
  'Tuesday-Friday 4-7pm $5 cocktails',
];

for (const line of testLines) {
  const lower = line.toLowerCase();
  const dayMatches = lower.match(DAYS_PATTERN) || [];
  const hasDeal = DEAL_KEYWORDS.some(kw => lower.includes(kw));
  const hasDay = dayMatches.length > 0;

  if (!hasDeal && !hasDay) { console.log('SKIP (no signal):  ', line); continue; }
  if (!line.match(/\d/))   { console.log('SKIP (no digits):  ', line); continue; }

  const rangeRx = /(\d{1,2})(?::(\d{2}))?\s*(?:(am|pm))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*(?:(am|pm))?/gi;
  const m = rangeRx.exec(line);
  if (m) {
    const startPeriod = m[3] || m[6];
    const start = parseTime(m[1], m[2], startPeriod);
    const end   = parseTime(m[4], m[5], m[6]);
    console.log('MATCH:             ', line);
    console.log('  day:', dayMatches[0] || 'Unknown', '| start:', start, '| end:', end);
  } else {
    console.log('NO TIME RANGE:     ', line, '| day:', dayMatches[0] || 'none');
  }
}
