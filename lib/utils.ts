import { format, startOfWeek, parse, addDays } from 'date-fns';

export function formatWeekStart(dateString: string): string {
  // Parse DD/MM/YYYY format
  const date = parse(dateString, 'dd/MM/yyyy', new Date());
  return format(date, 'MMM dd, yyyy');
}

export function getWeekStart(date: Date): Date {
  // Sunday is 0, so we need to adjust
  const day = date.getDay();
  const diff = date.getDate() - day; // Subtract days to get Sunday
  return startOfWeek(date, { weekStartsOn: 0 });
}

export function parseWeekStart(weekStartString: string): Date {
  // Parse DD/MM/YYYY format
  return parse(weekStartString, 'dd/MM/yyyy', new Date());
}

export function formatWeekRange(weekStartString: string): string {
  if (!weekStartString) return 'N/A';
  try {
    const weekStart = parseWeekStart(weekStartString);
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
  } catch {
    return weekStartString; // Return as-is if parsing fails
  }
}

export function sortWeeksChronologically(week1: string, week2: string): number {
  // Handle null/undefined cases
  if (!week1 && !week2) return 0;
  if (!week1) return 1;
  if (!week2) return -1;
  
  // Ensure both are strings
  const week1Str = String(week1);
  const week2Str = String(week2);
  
  try {
    const date1 = parseWeekStart(week1Str);
    const date2 = parseWeekStart(week2Str);
    return date1.getTime() - date2.getTime();
  } catch {
    // Fallback to string comparison if parsing fails
    return week1Str.localeCompare(week2Str);
  }
}

