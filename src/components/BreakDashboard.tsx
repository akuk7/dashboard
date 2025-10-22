import { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { BreakSession } from '../types/break';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BreakDashboard = () => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [viewType, setViewType] = useState<'total' | 'categorical'>('total');

  const getWeekDates = (offset: number) => {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay() + (offset * 7));
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  };

  const weekDates = useMemo(() => getWeekDates(currentWeekOffset), [currentWeekOffset]);

  const breaks = JSON.parse(localStorage.getItem('breaks') || '{}');

  const getData = () => {
    if (viewType === 'total') {
      return weekDates.map(date => {
        const dailyBreaks = breaks[date] || [];
        return dailyBreaks.reduce((acc: number, curr:BreakSession) => acc + curr.duration, 0) / 3600; // Convert to hours
      });
    } else {
      const categories: { [key: string]: number[] } = {
        nap: Array(7).fill(0),
        MD: Array(7).fill(0),
      };

      weekDates.forEach((date, index) => {
        const dailyBreaks = breaks[date] || [];
        dailyBreaks.forEach((breakSession: BreakSession) => {
          categories[breakSession.type][index] += breakSession.duration / 3600;
        });
      });

      return categories;
    }
  };

  const chartData = {
    labels: weekDates.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
    datasets: viewType === 'total' 
      ? [{
          label: 'Total Break Time (hours)',
          data: getData(),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        }]
      : Object.entries(getData()).map(([key, data]) => ({
          label: key,
          data,
          backgroundColor: key === 'nap' ? 'rgba(53, 162, 235, 0.5)' : 'rgba(255, 99, 132, 0.5)',
        })),
  };

  const isFirstWeek = useMemo(() => {
    const firstBreakDate = Object.keys(breaks).sort()[0];
    if (!firstBreakDate) return true;
    return weekDates[0] <= firstBreakDate;
  }, [weekDates, breaks]);

  const isLastWeek = useMemo(() => {
    return currentWeekOffset >= 0;
  }, [currentWeekOffset]);

  return (
    <div className="p-6 bg-white/10 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Break Time Analysis</h2>
        <div className="flex items-center gap-4">
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value as 'total' | 'categorical')}
            className="bg-gray-700 text-white rounded px-3 py-2"
          >
            <option value="total">Total</option>
            <option value="categorical">By Category</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              disabled={isFirstWeek}
              className={`p-2 rounded ${
                isFirstWeek ? 'text-gray-500' : 'text-white hover:bg-gray-700'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              disabled={isLastWeek}
              className={`p-2 rounded ${
                isLastWeek ? 'text-gray-500' : 'text-white hover:bg-gray-700'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
      <div className="h-[400px]">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Hours',
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default BreakDashboard;