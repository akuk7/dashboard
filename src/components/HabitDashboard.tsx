import React, { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title, } from "chart.js";
import type { TooltipItem } from "chart.js";
import { PlusCircle } from "lucide-react";
import AddHabit from "./AddHabit";
import type { Habit } from "../types/habit";
import supabase from "../lib/supabase";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const formatDate = (d: Date) => d.toISOString().split("T")[0];

const genRange = (days: number) => {
  const res: string[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() - i);
    res.push(formatDate(dt));
  }
  return res;
};

// Simplified type definition for the periods map
type PeriodKeys = 'week' | 'month' | 'year';
const periodDays: Record<PeriodKeys, number> = {
  week: 7,
  month: 30,
  year: 365,
};

// Define chart options (unchanged)
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function (context: TooltipItem<'pie'>): string {
          let label = context.label || "";
          if (label) {
            label += ": ";
          }
          const total = context.dataset.data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const value = context.parsed as number; // Safely cast parsed value to number
          const percentage = ((value / total) * 100).toFixed(1) + "%";
          return label + value + " (" + percentage + ")";
        },
      },
    },
  },
};

// Supabase Record Structure Type (assuming columns: habit_id, date, done)
type HabitRecordRow = {
    habit_id: string;
    date: string;
    done: boolean;
};

const HabitDashboard: React.FC = () => {
  const [showAdd, setShowAdd] = useState(false)
  const [period, setPeriod] = useState<PeriodKeys>('month') // Defaulted to 'month'
  const [habits, setHabits] = useState<Habit[]>([])
  // Records state remains the same for easy lookup
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>({})

  // 1. Fetch Habits on Mount
  const loadHabits = async () => {
    const { data: hData } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: false })
    // Ensure data conforms to Habit[] type
    setHabits((hData as Habit[]) || []) 
  }

  useEffect(() => {
    loadHabits()
  }, [])

  // 2. Fetch Records when Period Changes
  useEffect(() => {
    const loadRecords = async () => {
      const days = periodDays[period]
      const dates = genRange(days)
      
      const { data } = await supabase
        .from('habit_records')
        .select('habit_id,date,done')
        .in('date', dates)
      
      const map: Record<string, Record<string, boolean>> = {};
  ((data ?? []) as HabitRecordRow[]).forEach((record: HabitRecordRow) => {
    map[record.date] = map[record.date] || {};
    map[record.date][record.habit_id] = !!record.done;
  });
  
  setRecords(map);
    }
    loadRecords()
  }, [period])

  // 3. Compute Stats
  const statPerHabit = useMemo(() => {
    const days = periodDays[period]
    const dates = genRange(days)
    
    return habits.map(h => {
      const done = dates.reduce((acc,d) => acc + (records[d] && records[d][h.id] ? 1 : 0), 0)
      return { id: h.id, name: h.name, color: h.color, done, total: dates.length }
    })
  }, [habits, records, period])

  // 4. Handle Habit Add (simply reloads habits from DB)
  const onAddHabit = () => {
    loadHabits()
    setShowAdd(false)
  }

  return (
    <div className="rounded-lg text-white p-5 flex gap-5">
      {/* <div className="flex justify-between items-center mb-4"> */}
   
        <div className="flex flex-col items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKeys)}
            className="bg-gray-700 rounded px-3 py-2 text-white border border-transparent focus:border-blue-500 transition"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last 365 days</option>
          </select>

          <button
            onClick={() => setShowAdd(true)}
            className="ml-2 inline-flex items-center gap-2 px-3 py-2 bg-blue-500 rounded hover:bg-blue-600 transition"
          >
            <PlusCircle size={20} /> Add Habit
          </button>
        </div>
      {/* </div> */}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {statPerHabit.map((s) => {
          const completed = s.done;
          const remaining = Math.max(0, s.total - completed); // Use s.total
          const doneColor = s.color || "#60a5fa";
          const remainingColor = "#373631";

          const data = {
            labels: ["Done", "Remaining"],
            datasets: [
              {
                data: [completed, remaining],
                backgroundColor: [doneColor, remainingColor],
                borderColor: [doneColor, remainingColor],
                borderWidth: 1,
                hoverOffset: 4,
              },
            ],
          };
          return (
            <div key={s.id} className="bg-gray-900 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ background: s.color }}
                  />
                  <span
                    className="font-medium text-base"
                    style={{ color: s.color }}
                  >
                    {s.name}
                  </span>
                </div>
                <div className="text-sm text-gray-300">
                  {completed}/{s.total}
                </div>
              </div>
              <div className="w-full mx-auto" style={{ height: "140px" }}>
                <Pie data={data} options={chartOptions} />
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddHabit onClose={() => setShowAdd(false)} onAdd={onAddHabit} />}
    </div>
  );
};

export default HabitDashboard;