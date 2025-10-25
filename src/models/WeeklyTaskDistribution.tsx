import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import supabase from "../lib/supabase";
import type { TodoStatus } from "../types/TodoTypes";

ChartJS.register(ArcElement, Tooltip, Legend);

// Define colors for the chart segments
const CHART_COLORS = {
    'TODO': '#3B82F6',       // Blue
    'IN_PROGRESS': '#ac6bd2', // Darker Blue
    'DONE': '#10B981',       // Green
    'DEFAULT': '#4B5563',    // Gray
};

// Helper to find the start of the current week (Sunday)
const getCurrentSundayDate = () => {
    const d = new Date();
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const day = d.getDay(); 
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0); 
    return d.toISOString();
};

const WeeklyTaskDistribution: React.FC = () => {
    const [taskCounts, setTaskCounts] = useState<Record<TodoStatus, number>>({
        TODO: 0, IN_PROGRESS: 0, DONE: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const loadWeeklyTaskCounts = useCallback(async () => {
        setIsLoading(true);
        const currentSunday = getCurrentSundayDate();
        
        // Fetch ALL tasks created this week (since Sunday)
        const { data, error } = await supabase
            .from('todos')
            .select('status')
            .gte('created_at', currentSunday); 
            
        if (error) {
            console.error("Chart data error:", error);
            setIsLoading(false);
            return;
        }

        const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
        (data as {status: TodoStatus}[] || []).forEach(row => {
            if (row.status in counts) {
                counts[row.status] += 1;
            }
        });
        setTaskCounts(counts);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadWeeklyTaskCounts();
    }, [loadWeeklyTaskCounts]);

    // --- CHART DATA GENERATOR ---
    const chartData = useMemo(() => {
        const data = [taskCounts.TODO, taskCounts.IN_PROGRESS, taskCounts.DONE];
        const backgroundColors = [CHART_COLORS.TODO, CHART_COLORS.IN_PROGRESS, CHART_COLORS.DONE];
        
        return {
            labels: ['To Do', 'In Progress', 'Done'],
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderColor: '#0A0A0A',
                borderWidth: 5,
            }]
        };
    }, [taskCounts]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                display: true,
                position: 'bottom' as const,
                labels: {
                    color: 'white',
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: ({ label, raw }: any) => {
                        const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percent = ((raw as number / total) * 100).toFixed(1);
                        return `${label}: ${raw} (${percent}%)`;
                    }
                }
            }
        },
        layout: {
            padding: 10
        }
    }), [chartData]);
    
    const totalTasks = taskCounts.TODO + taskCounts.IN_PROGRESS + taskCounts.DONE;
    const pendingTasks = taskCounts.TODO + taskCounts.IN_PROGRESS;

    return (
        <div className="bg-[#121212] rounded-xl p-4 border border-[#303030] shadow-xl flex flex-col justify-center items-center h-[500px]">
            <h4 className="text-lg font-bold mb-4 border-b border-[#303030] pb-2 w-full text-center">
                Weekly Workload Distribution
            </h4>
            
            {isLoading ? (
                <div className="text-center p-10 text-gray-500">Calculating weekly tasks...</div>
            ) : (
                <div className="h-full w-full flex flex-col justify-center items-center relative p-4">
                    <div className="h-64 w-full flex flex-col justify-center items-center relative">
                        <Doughnut data={chartData} options={chartOptions} />
                        <div >
                            <span className="text-3xl font-extrabold text-white">
                                {totalTasks}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">&nbsp;&nbsp;&nbsp;Total Tasks This Week</span>
                        </div>
                        <div >
                            <span className="text-3xl font-extrabold text-white">
                                {pendingTasks}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">&nbsp;&nbsp;&nbsp; Tasks Pending This Week</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyTaskDistribution;