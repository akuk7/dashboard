import React, { useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title, } from "chart.js";
import type { TooltipItem } from "chart.js";
import { PlusCircle } from "lucide-react";
import AddHabit from "./AddHabit";
import type { Habit } from "../types/habit";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const HABITS_KEY = "habits";
const HABIT_RECORDS_KEY = "habitRecords";

const readHabits = (): Habit[] => {
  try {
    return JSON.parse(localStorage.getItem(HABITS_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveHabit = (h: Habit) => {
  const cur = readHabits();
  localStorage.setItem(HABITS_KEY, JSON.stringify([h, ...cur]));
};

const readRecords = (): Record<string, Record<string, boolean>> => {
  try {
    return JSON.parse(localStorage.getItem(HABIT_RECORDS_KEY) || "{}");
  } catch {
    return {};
  }
};

const formatDate = (d: Date) => d.toISOString().split("T")[0];

/**
 * Generates an array of formatted date strings for the last 'days' days,
 * including today. The logic is correct for "Last N days including today."
 */
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

const periods = {
  week: 7,
  month: 30,
  year: 365,
} as const;

// Define chart options to disable the Chart.js built-in legend and title
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false, // Disables the default chart legend (Done/Remaining labels)
    },
    title: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function (context: TooltipItem<'pie'>): string {
          // 'any' can be replaced with TooltipItem<'pie', number>
          let label = context.label || "";
          if (label) {
            label += ": ";
          }
          const total = context.dataset.data.reduce(
            (a: number, b: number) => a + b,
            0
          );
          const value = context.parsed;
          const percentage = ((value / total) * 100).toFixed(1) + "%";
          return label + value + " (" + percentage + ")";
        },
      },
    },
  },
};

const HabitDashboard: React.FC = () => {
  const [showAdd, setShowAdd] = useState(false);
  const [period, setPeriod] = useState<keyof typeof periods>("month"); // Defaulting to 'month' to match your image count 13/30 and 8/30
  const habits = useMemo(() => readHabits(), []);
  const records = useMemo(() => readRecords(), []);

  // The logic here is correct for calculating data for the last N days.
  const days = periods[period];
  const dates = useMemo(() => genRange(days), [days]);

  const statPerHabit = useMemo(() => {
    const res: { id: string; name: string; color?: string; done: number }[] =
      [];
    habits.forEach((h) => {
      let done = 0;
      dates.forEach((d) => {
        if (records[d] && records[d][h.id]) done++;
      });
      res.push({ id: h.id, name: h.name, color: h.color, done });
    });
    return res;
  }, [habits, dates, records]);

  const onAdd = (h: Habit) => {
    saveHabit(h);
    window.location.reload();
  };

  return (
    // Reduced overall padding from p-6 to p-4
    <div className="p-4 bg-white/5 rounded-lg text-white">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Habit Dashboard</h3>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as keyof typeof periods)}
            className="bg-gray-700 rounded px-3 py-2 text-white border border-transparent focus:border-blue-500 transition" // Added text-white for visibility
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statPerHabit.map((s) => {
          const completed = s.done;
          const remaining = Math.max(0, dates.length - completed);

          // Background colors: Habit color for Done, a dark grey for Remaining
          const doneColor = s.color || "#60a5fa";
          const remainingColor = "#374151";

          const data = {
            labels: ["Done", "Remaining"],
            datasets: [
              {
                data: [completed, remaining],
                backgroundColor: [doneColor, remainingColor],
                borderColor: [doneColor, remainingColor],
                // Making the chart border slightly transparent to blend with the dark background
                borderWidth: 1,
                hoverOffset: 4,
              },
            ],
          };
          return (
            // Reduced padding from p-4 to p-3 to remove unwanted space
            <div key={s.id} className="bg-gray-800 rounded p-3">
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
                {/* Score display */}
                <div className="text-sm text-gray-300">
                  {completed}/{dates.length}
                </div>
              </div>

              {/* Removed the custom HTML legend block */}

              {/* Pie Chart: Increased size and passed options */}
              <div className="w-full mx-auto" style={{ height: "140px" }}>
                <Pie data={data} options={chartOptions} />
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && <AddHabit onClose={() => setShowAdd(false)} onAdd={onAdd} />}
    </div>
  );
};

export default HabitDashboard;
