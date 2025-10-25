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
    legend: { display: false },
    title: { display: false },
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
          const value = context.parsed as number;
          const percentage = ((value / total) * 100).toFixed(1) + "%";
          return label + value + " (" + percentage + ")";
        },
      },
    },
  },
};

type HabitRecordRow = {
    habit_id: string;
    date: string;
    done: boolean;
};

const HabitDashboard: React.FC = () => {
  const [showAdd, setShowAdd] = useState(false)
  const [period, setPeriod] = useState<PeriodKeys>('month') 
  const [habits, setHabits] = useState<Habit[]>([])
  const [records, setRecords] = useState<Record<string, Record<string, boolean>>>({})

  const loadHabits = async () => {
    const { data: hData } = await supabase
      .from('habits')
      .select('*')
      .order('created_at', { ascending: false })
    setHabits((hData as Habit[]) || []) 
  }

  useEffect(() => {
    loadHabits()
  }, [])

  useEffect(() => {
    const loadRecords = async () => {
     const days = periodDays[period];
  const dates = genRange(days);
  const { data, error } = await supabase
    .from('habit_records')
    .select('habit_id,date,done')
    .in('date', dates);

  if (error) {
    console.error('Error loading records:', error);
    return;
  }

  const map: Record<string, Record<string, boolean>> = {};
  ((data ?? []) as HabitRecordRow[]).forEach((record: HabitRecordRow) => {
    map[record.date] = map[record.date] || {};
    map[record.date][record.habit_id] = !!record.done;
  });
  
  setRecords(map);

    }
    loadRecords()
  }, [period])

  const statPerHabit = useMemo(() => {
    const days = periodDays[period]
    const dates = genRange(days)
    
    return habits.map(h => {
      const done = dates.reduce((acc,d) => acc + (records[d] && records[d][h.id] ? 1 : 0), 0)
      return { id: h.id, name: h.name, color: h.color, done, total: dates.length }
    })
  }, [habits, records, period])

  const onAddHabit = () => {
    loadHabits()
    setShowAdd(false)
  }

  return (
    // Main background is deep black
    <div className="my-6 bg-[#0A0A0A] rounded-xl text-gray-100  w-[85vw] " id="habits">
      <div className="flex justify-between items-center mb-6 border-b border-[#303030] pb-4">
        <h3 className="text-2xl font-bold text-white tracking-tight">Habit Dashboard</h3>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKeys)}
            // Selector: Darker background, white border on focus
            className="bg-[#121212] border border-[#303030] rounded-lg px-4 py-2 text-gray-300 focus:border-white transition text-sm"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last 365 days</option>
          </select>

          <button
            onClick={() => setShowAdd(true)}
            // Add Habit button: White/Gray only
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffffff] text-black rounded-lg font-medium "
          >
            <PlusCircle size={18} /> Add Habit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {statPerHabit.map((s) => {
          const completed = s.done;
          const remaining = Math.max(0, s.total - completed);
          const doneColor = s.color || "#60a5fa";
          const remainingColor = "#1D2330"; // Dark color for remaining slice

          const data = {
            labels: ["Done", "Remaining"],
            datasets: [
              {
                data: [completed, remaining],
                backgroundColor: [doneColor, remainingColor],
                borderColor: doneColor, 
                borderWidth: 1,
                hoverOffset: 8,
              },
            ],
          };
          return (
            // Individual Habit Card: Slightly lighter background with border
            <div key={s.id} className="bg-[#121212] rounded-xl p-5 border border-[#303030] shadow-md shadow-black/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    // Dot uses habit's color for distinction
                    className="inline-block w-4 h-4 rounded-full border border-gray-700/50" 
                    style={{ background: s.color }}
                  />
                  <span
                    className="font-bold text-lg text-white" 
                  >
                    {s.name}
                  </span>
                </div>
                {/* Score display */}
                <div className="text-xl font-bold text-white">
                  {completed}
                  <span className="text-gray-400 font-normal text-sm"> / {s.total}</span>
                </div>
              </div>
              
              <div className="w-full mx-auto mt-4" style={{ height: "160px" }}>
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