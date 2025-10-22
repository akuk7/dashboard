export type BreakType = 'nap' | 'MD';

export interface BreakSession {
  id: string;
  type: BreakType;
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  date: string;
}

export interface DailyBreaks {
  [date: string]: BreakSession[];
}