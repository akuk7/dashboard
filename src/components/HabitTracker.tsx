import React, { useEffect, useMemo, useState } from "react";
import type { Habit } from "../types/habit";
import { Check, Pencil } from "lucide-react";
import supabase from "../lib/supabase";
import { addDaysIST, datesEndingTodayIST, dayOfMonth, dayOfWeekIST, todayIST, toISTDateString } from "../lib/dateUtils";

type HabitRecordRow = {
  habit_id: string;
  date: string;
  done: boolean;
};

type PeriodKeys = 'week' | 'month' | 'year';
const PERIOD_DAYS: Record<PeriodKeys, number> = { week: 7, month: 30, year: 365 };
const TRACKER_DAYS = 15;

type Props = {
  period: PeriodKeys;
  refreshToken?: number;
  onChange?: () => void;
  onEditHabit?: (habit: Habit) => void;
};

const HabitTracker: React.FC<Props> = ({ period, refreshToken, onChange, onEditHabit }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>(
    {}
  );

  const trackerDates = useMemo(() => datesEndingTodayIST(TRACKER_DAYS).reverse(), []);
  // Covers both the fixed 15-day tracker grid and whichever stats period is selected -
  // both ranges end today, so fetching the larger one covers the smaller for free.
  const recordDates = useMemo(
    () => datesEndingTodayIST(Math.max(TRACKER_DAYS, PERIOD_DAYS[period])),
    [period]
  );

  useEffect(() => {
    const loadData = async () => {
      const { data: hData, error: hErr } = await supabase
        .from("habits")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (hErr) console.error("Error loading habits:", hErr);
      setHabits((hData as Habit[]) || []);

      const { data: rData, error: rErr } = await supabase
        .from("habit_records")
        .select("habit_id,date,done")
        .in("date", recordDates);

      if (rErr) console.error("Error loading records:", rErr);

      const map: Record<string, Record<string, boolean>> = {};
      (rData as HabitRecordRow[] || []).forEach((row) => {
        map[row.date] = map[row.date] || {};
        map[row.date][row.habit_id] = !!row.done;
      });
      setRecords(map);
    };
    loadData();
  }, [recordDates, refreshToken]);

  const statPerHabit = useMemo(() => {
    const today = todayIST();
    const daysInPeriod = PERIOD_DAYS[period];
    const stats: Record<string, { done: number; total: number }> = {};

    habits.forEach((h) => {
      const habitStart = toISTDateString(h.created_at);
      const datesToCheck: string[] = [];

      for (let i = 0; i < daysInPeriod; i++) {
        const d = addDaysIST(today, -i);
        if (d < habitStart) break;
        datesToCheck.push(d);
      }

      const done = datesToCheck.reduce((acc, d) => {
        const dayOfWeek = dayOfWeekIST(d);
        const isScheduled = h.frequency ? h.frequency.includes(dayOfWeek) : true;
        const isDone = records[d] && records[d][h.id];
        return acc + (isDone && isScheduled ? 1 : 0);
      }, 0);

      const total = datesToCheck.filter((d) => {
        const dayOfWeek = dayOfWeekIST(d);
        return h.frequency ? h.frequency.includes(dayOfWeek) : true;
      }).length;

      stats[h.id] = { done, total };
    });

    return stats;
  }, [habits, records, period]);

  const toggle = async (date: string, habitId: string) => {
    const isChecked = !!(records[date] && records[date][habitId]);

    if (isChecked) {
      const { error } = await supabase
        .from("habit_records")
        .delete()
        .match({ habit_id: habitId, date });

      if (error) return console.error("Error deleting record:", error);

      setRecords((prev) => {
        const next = { ...prev };
        if (next[date]) delete next[date][habitId];
        return next;
      });
      onChange?.();
    } else {
      const { error } = await supabase
        .from("habit_records")
        .upsert([{ habit_id: habitId, date, done: true }]);
      if (error) return console.error("Error upserting record:", error);

      setRecords((prev) => ({
        ...prev,
        [date]: { ...(prev[date] || {}), [habitId]: true },
      }));
      onChange?.();
    }
  };

  if (habits.length === 0) {
    return (
      <div className="p-6 bg-[#121212] rounded-xl text-gray-400 border border-[#303030]">
        <h3 className="text-xl font-semibold mb-2 text-white">Habits</h3>
        <p className="text-sm">No habits yet. Add one from the Habit Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-[#121212] rounded-xl border border-[#303030] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-150 md:min-w-175">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[#0A0A0A] text-left px-3 md:px-4 py-2 md:py-3 w-28 md:w-36 text-gray-100 font-semibold border-r border-[#303030] text-sm md:text-base">
                  Habit
                </th>
                {trackerDates.map((d) => (
                  <th
                    key={d}
                    className="p-1 md:p-2 text-center text-[10px] md:text-xs text-gray-300 font-medium w-8 md:w-10"
                  >
                    {dayOfMonth(d)}
                  </th>
                ))}
                <th className="p-1 md:p-2 pl-3 md:pl-4 text-left text-[10px] md:text-xs text-gray-300 font-medium w-55 md:w-95 border-l border-[#303030]">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => {
                const stat = statPerHabit[h.id] || { done: 0, total: 0 };
                const pct = stat.total ? Math.round((stat.done / stat.total) * 100) : 0;
                const barColor = h.color || "#60a5fa";

                return (
                <tr key={h.id} className="border-t border-[#303030]">
                  <td className="sticky left-0 bg-[#0A0A0A] px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white border-r border-[#303030]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: h.color }} />
                        <span className="truncate">{h.name}</span>
                      </div>
                      {onEditHabit && (
                        <button
                          onClick={() => onEditHabit(h)}
                          className="text-gray-500 hover:text-white flex-shrink-0"
                          title="Edit habit"
                        >
                          <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  {trackerDates.map((d) => {
                    const dayOfWeek = dayOfWeekIST(d);
                    const habitStart = toISTDateString(h.created_at);

                    // Check if this habit is supposed to be followed on this day
                    // AND if the day is not before habit creation
                    const isScheduled = (h.frequency ? h.frequency.includes(dayOfWeek) : true) && (d >= habitStart);

                    const checked = !!(records[d] && records[d][h.id]);
                    const bgColor = h.color || "#60a5fa";

                    return (
                      <td key={d} className="p-0.5 md:p-1.5 text-center">
                        <button
                          // Only allow toggle if it's a scheduled day
                          onClick={() => isScheduled && toggle(d, h.id)}
                          disabled={!isScheduled}
                          style={{
                            // Dim the box if it's not a scheduled day
                            backgroundColor: isScheduled ? `${bgColor}30` : '#1a1a1a',
                            border: d === todayIST() && isScheduled ? "1px solid #666" : "none",
                            cursor: isScheduled ? 'pointer' : 'not-allowed',
                            opacity: isScheduled ? 1 : 0.3,
                          }}
                          className="inline-flex items-center justify-center w-3 h-3 md:w-7 md:h-7 rounded-md md:rounded-lg transition-all"
                        >
                          {isScheduled && (
                            <Check
                              className="w-2 h-2 md:w-3 md:h-3"
                              style={{
                                color: checked ? bgColor : "transparent",
                                stroke: checked ? bgColor : "transparent",
                                strokeWidth: checked ? 2 : 0,
                              }}
                            />
                          )}
                          {!isScheduled && (
                            <div className="w-1 h-1 bg-gray-800 rounded-full" /> // Subtle dot for skipped days
                          )}
                        </button>
                      </td>
                    );
                  })}
                  {/* Progress bar for the selected period, collinear with this habit's own checkbox row */}
                  <td className="p-1 md:p-1.5 pl-3 md:pl-4 border-l border-[#303030]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] md:text-xs text-gray-400 w-8 md:w-10 text-right flex-shrink-0">
                        {stat.done}/{stat.total}
                      </span>
                      <div className="flex-1 h-3 md:h-7 bg-[#0A0A0A] border border-[#303030] rounded-md md:rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-md md:rounded-lg transition-all"
                          style={{ width: `${pct}%`, backgroundColor: `${barColor}30` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;
