import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BarChart } from 'lucide-react';
import supabase from '../lib/supabase';

// --- Chart.js Imports ---
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
  
} from 'chart.js';
import type { TooltipItem, Tick } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Updated types
type BreakType = 'Nap' | 'MD' | 'Screen';
type FilterType = 'Total' | BreakType;

interface BreakRecordRow {
  date: string;
  type: BreakType;
  duration: number; // in seconds
}

// Function to get the date of the Monday for a given date
const getMonday = (date: Date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

// Format seconds into Hh Mmin (e.g., "1h 30min")
const formatDuration = (seconds: number) => {
  if (seconds === 0) return '0 min';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let output = '';
  if (hours > 0) output += `${hours}h `;
  if (minutes > 0 || hours === 0) output += `${minutes}min`;
  return output.trim();
};

const formatDate = (d: Date) => d.toISOString().split('T')[0];

// --- Chart Configuration ---

const CHART_COLORS: Record<BreakType, { color: string, border: string }> = {
    'Nap': { color: '#C084FC', border: '#9333ea' },   // Purple
    'MD': { color: '#FBBF24', border: '#f59e0b' },    // Amber
    'Screen': { color: '#6EE7B7', border: '#10b981' }, // Light Green/Teal
};

const chartOptions = (filter: FilterType) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        // Show legend ONLY if Total is selected (to display the color codes for the stacks)
        legend: {
            display: filter === 'Total' ? true : false, 
            labels: { color: '#fff', usePointStyle: true }
        },
        tooltip: {
            callbacks: {
                label: function(context: TooltipItem<'bar'>): string {
                    const value = context.parsed.y ?? 0;
                    const duration = typeof value === 'number' ? value : 0; 
                    const label = context.dataset.label || '';
                    return `${label}: ${formatDuration(duration)}`;
                }
            },
            bodyFont: { family: 'monospace' }
        },
    },
    scales: {
        x: {
            // Stacked for Total view (to see breakdown) and Single Category view
            stacked: true, 
            grid: { color: '#303030' },
            ticks: { color: '#ddd' }
        },
        y: {
            stacked: true, // Always stacked for correct visual representation, even if only one dataset is present
            grid: { color: '#303030' },
            ticks: {
                color: '#ddd',
                callback: function(value: number | string | Tick): string { 
                    return formatDuration(value as number); 
                }
            },
            title: {
                display: true,
                text: 'Break Duration (Time)',
                color: '#ddd'
            }
        }
    }
});


// --- Component ---

const BreakDashboard: React.FC = () => {
    const [weekOffset, setWeekOffset] = useState(0); 
    const [filter, setFilter] = useState<FilterType>('Total');
    const [weeklyRecords, setWeeklyRecords] = useState<BreakRecordRow[]>([]);
    const [isFirstWeek, setIsFirstWeek] = useState(false); 

    // Date Calculation (omitted for brevity, assume correct)
    const { weekStart, weekEnd, weekDatesArray, weekDatesStrings } = useMemo(() => {
        const today = new Date();
        const currentMonday = getMonday(today);
        
        const targetDate = new Date(currentMonday);
        targetDate.setDate(currentMonday.getDate() + (weekOffset * 7));
        
        const start = getMonday(targetDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        
        const weekDates: { day: string, fullDate: string }[] = [];
        const weekStrings: string[] = [];

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateString = formatDate(d);
            weekDates.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), fullDate: dateString });
            weekStrings.push(dateString);
        }

        return { 
            weekStart: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
            weekEnd: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
            weekDatesArray: weekDates,
            weekDatesStrings: weekStrings
        };
    }, [weekOffset]);
    
    // Data Fetching Effect (omitted for brevity, assume correct)
    useEffect(() => {
        const loadRecords = async () => {
            const { data, error } = await supabase
                .from('breaks')
                .select('date, type, duration')
                .in('date', weekDatesStrings);

            if (error) {
                console.error('Error fetching breaks:', error);
                setWeeklyRecords([]);
                return;
            }

            setWeeklyRecords(data as BreakRecordRow[] || []);
            
            if (weekOffset <= 0) {
                const minDate = weekDatesStrings[6]; 
                const { count } = await supabase
                    .from('breaks')
                    .select('*', { count: 'exact' })
                    .lt('date', minDate);

                setIsFirstWeek(count === 0);
            }
        };
        loadRecords();
    }, [weekOffset, weekDatesStrings]);

    // --- Data Processing for Chart.js ---
    const chartData = useMemo(() => {
        const labels = weekDatesArray.map(d => d.day);
        
        const processedData = weekDatesArray.map(day => {
            const recordsForDay = weeklyRecords.filter(r => r.date === day.fullDate);
            
            const totals = recordsForDay.reduce((acc, r) => {
                acc[r.type] = (acc[r.type] || 0) + r.duration;
                return acc;
            }, { Nap: 0, MD: 0, Screen: 0 } as Record<BreakType, number>);

            return totals;
        });

        const datasets = [];
        
        // Define all break types
        const breakTypes: BreakType[] = ['Nap', 'MD', 'Screen'];

        if (filter === 'Total') {
            // Total View: Push all three categories to create the stacked bar
            breakTypes.forEach(type => {
                datasets.push({
                    label: type,
                    data: processedData.map(d => d[type]),
                    backgroundColor: CHART_COLORS[type].color,
                    borderColor: CHART_COLORS[type].border,
                    borderWidth: 1,
                    stack: 'Stack 1' // All datasets share the same stack ID
                });
            });
        } else {
            // Individual View (Nap, MD, or Screen): Push ONLY the selected category
            const type = filter as BreakType;
            
            // To ensure the bar is only the height of the filtered type, 
            // we push the selected type's data as a single dataset.
            datasets.push({
                label: type,
                data: processedData.map(d => d[type]),
                backgroundColor: CHART_COLORS[type].color,
                borderColor: CHART_COLORS[type].border,
                borderWidth: 1,
                stack: 'Stack 1' // Stacked setting ensures correct Y-axis behavior
            });
            
            // OPTIONAL: Add zero-value datasets for other categories to maintain stacking alignment if needed, 
            // but for single-filter view, one dataset is cleaner. The key is setting stacked: true 
            // in chartOptions to allow a single bar dataset to consume the full stack width.
        }

        return { labels, datasets };
    }, [weeklyRecords, weekDatesArray, filter]);


    const handleWeekChange = (direction: 'prev' | 'next') => {
        setWeekOffset(prev => prev + (direction === 'next' ? 1 : -1));
    };

    const isCurrentWeek = weekOffset === 0;

    return (
        <div className="p-6 bg-[#121212] rounded-xl border border-[#303030] shadow-md text-white">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white border-b border-[#303030] pb-3">
                <BarChart className="w-5 h-5 text-gray-400" /> Break Dashboard
            </h3>

            {/* Week Navigation */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => handleWeekChange('prev')}
                    disabled={isFirstWeek && weekOffset <= 0} 
                    className={`p-2 rounded-full transition ${
                        (isFirstWeek && weekOffset <= 0) 
                            ? 'text-gray-600' 
                            : 'bg-[#1D2330] text-gray-300 hover:bg-[#303030]'
                    }`}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <span className="text-lg font-semibold text-white">
                    {weekStart} - {weekEnd} {isCurrentWeek ? '(Current Week)' : ''}
                </span>
                
                <button
                    onClick={() => handleWeekChange('next')}
                    disabled={isCurrentWeek} 
                    className={`p-2 rounded-full transition ${
                        isCurrentWeek 
                            ? 'text-gray-600' 
                            : 'bg-[#1D2330] text-gray-300 hover:bg-[#303030]'
                    }`}
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Filter Selector */}
            <div className="flex justify-start gap-4 mb-6 border-b border-[#303030] pb-4">
                {(['Total', 'Nap', 'MD', 'Screen'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            filter === f
                                ? 'bg-white text-black border border-white'
                                : 'bg-[#1D2330] text-gray-400 border border-[#303030]'
                        }`}
                    >
                        {f} 
                    </button>
                ))}
            </div>

            {/* Chart.js Visualization */}
            <div className="h-64 pt-4">
                {/* Note: filter is passed to chartOptions to conditionally control axis/legend */}
                <Bar data={chartData} options={chartOptions(filter)} />
            </div>
        </div>
    );
};

export default BreakDashboard;