import React, { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title, } from "chart.js";
import type { TooltipItem } from "chart.js";

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
interface HabitDashboardProps {
    period: PeriodKeys; // The period is now defined as a required prop
    setPeriod: (period: PeriodKeys) => void; // Assuming you pass a setter to update the state in the parent
}
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

const HabitDashboard:React.FC<HabitDashboardProps>= ({period}) => {

 
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

 

  return (
    // Main background is deep black
    <div className=" bg-[#0A0A0A] rounded-xl text-gray-100 flex flex-col  w-[30vw] " id="habits">
      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 h-full">
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
            <div key={s.id} className=" rounded-xl p-2 border border-[#303030] shadow-md shadow-black/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span
                    // Dot uses habit's color for distinction
                    className="inline-block w-4 h-4 rounded-full border border-gray-700/50" 
                    style={{ background: s.color }}
                  />
                  <span
                    className="font-bold text-xs text-white" 
                  >
                    {s.name}
                  </span>
                   
                </div>
                <div className="text-xs font-bold text-white">
                  {completed}
                  <span className="text-gray-400 font-normal text-xs"> / {s.total}</span>
                </div>
              </div>
              
              <div className="w-full mx-auto mt-4" style={{ height: "50px" }}>
                <Pie data={data} options={chartOptions} />
              </div>
              {/* Score display */}
               
            </div>
          );
        })}
      </div>

     
    </div>
  );
};

export default HabitDashboard;