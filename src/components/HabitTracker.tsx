import React, { useEffect, useMemo, useState } from "react";
import type { Habit } from "../types/habit";
import { Check } from "lucide-react";
import supabase from "../lib/supabase";

const formatDate = (d: Date) => d.toISOString().split("T")[0];

const generateDates = (days: number) => {
  const arr: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(formatDate(d));
  }
  return arr;
};

type HabitRecordRow = {
  habit_id: string;
  date: string;
  done: boolean;
};

const HabitTracker: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>(
    {}
  );

  const dates = useMemo(() => generateDates(15), []);

  useEffect(() => {
    const loadData = async () => {
      const { data: hData, error: hErr } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: false });

      if (hErr) console.error("Error loading habits:", hErr);
      setHabits((hData as Habit[]) || []);

      const { data: rData, error: rErr } = await supabase
        .from("habit_records")
        .select("habit_id,date,done")
        .in("date", dates);

      if (rErr) console.error("Error loading records:", rErr);

      const map: Record<string, Record<string, boolean>> = {};
      (rData as HabitRecordRow[] || []).forEach((row) => {
        map[row.date] = map[row.date] || {};
        map[row.date][row.habit_id] = !!row.done;
      });
      setRecords(map);
    };
    loadData();
  }, [dates]);

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
    } else {
      const { error } = await supabase
        .from("habit_records")
        .upsert([{ habit_id: habitId, date, done: true }]);
      if (error) return console.error("Error upserting record:", error);

      setRecords((prev) => ({
        ...prev,
        [date]: { ...(prev[date] || {}), [habitId]: true },
      }));
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
    <div className="p-4 md:p-8">
      <div className="bg-[#121212] rounded-xl border border-[#303030] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px] md:min-w-[700px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-[#0A0A0A] text-left px-3 md:px-4 py-2 md:py-3 w-32 md:w-40 text-gray-100 font-semibold border-r border-[#303030] text-sm md:text-base">
                  Habit
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="p-1 md:p-2 text-center text-[10px] md:text-xs text-gray-300 font-medium w-10 md:w-16"
                  >
                    {new Date(d).getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {habits.map((h) => (
                <tr key={h.id} className="border-t border-[#303030]">
                  <td className="sticky left-0 bg-[#0A0A0A] px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-white border-r border-[#303030]">
                    {h.name}
                  </td>
                  {dates.map((d) => {
                    const checked = !!(records[d] && records[d][h.id]);
                    const bgColor = h.color || "#60a5fa";
                    return (
                      <td key={d} className="p-0.5 md:p-1 text-center">
                        <button
                          onClick={() => toggle(d, h.id)}
                          style={{
                            backgroundColor: `${bgColor}30`,
                            border:
                              d === formatDate(new Date()) ? "1px solid #444" : "none",
                          }}
                          className="inline-flex items-center justify-center 
                                     w-6 h-6 md:w-12 md:h-12 
                                     rounded-md md:rounded-lg 
                                     hover:opacity-90 transition-opacity"
                        >
                          <Check
                            className="w-4 h-4 md:w-8 md:h-8"
                            style={{
                              color: checked ? bgColor : "transparent",
                              stroke: checked ? bgColor : "transparent",
                              strokeWidth: checked ? 3 : 0,
                            }}
                          />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HabitTracker;
