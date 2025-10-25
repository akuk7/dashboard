import React, { useState, useEffect } from 'react';


// --- CONFIGURATION ---
// Date of Birth: May 19th, 2002, 7:07 PM IST (+05:30)
const DOB = new Date('2002-05-19T19:07:00+05:30'); 

// Milestones to track
const MILESTONES = [25, 30, 40, 60];

// --- CALCULATION LOGIC ---

interface DayCount {
    days: number;
    passed: boolean;
}

/**
 * Calculates the number of full days remaining until a specific milestone birthday.
 */
const calculateDaysRemaining = (targetAge: number): DayCount => {
    // 1. Calculate the target date
    const targetYear = DOB.getFullYear() + targetAge;
    const targetDate = new Date(DOB);
    targetDate.setFullYear(targetYear);

    // 2. Adjust targetDate if month/day for the next year has passed
    const now = new Date();
    if (targetDate.getTime() < now.getTime()) {
        return { days: 0, passed: true };
    }
    
    // 3. Get difference from now
    const diffTime = targetDate.getTime() - now.getTime();
    
    // 4. Convert milliseconds to full days (86400000 ms per day)
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { days, passed: false };
};

// --- COMPONENT ---

const DayCounter: React.FC = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, setTick] = useState(0); 
    
    useEffect(() => {
        // Update the component every second to keep the time calculation fresh
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 1000); 
        return () => clearInterval(interval);
    }, []);

    const dayCounts = MILESTONES.map(age => ({
        age,
        ...calculateDaysRemaining(age),
    }));

    const ACCENTS = ['#303030', '#444444', '#606060', '#888888']; 

    return (
        <div className=" bg-[#0A0A0A] rounded-xl text-gray-100">
            

            {/* CHANGED GRID LAYOUT: 1 column on small, 2 columns on medium, and 2 columns on large screens */}
            <div className="w-[400px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {dayCounts.map((milestone, index) => {
                    const accentColor = ACCENTS[index % ACCENTS.length];
                    const daysDisplay = milestone.passed ? 'ACHIEVED' : milestone.days.toLocaleString();

                    return (
                        <div 
                            key={milestone.age} 
                            className="py-3 px-4 rounded-xl bg-[#121212] border border-[#303030] transition-all duration-300"
                            style={{ 
                                boxShadow: `0 0 20px -5px ${accentColor}20`,
                                borderLeft: `4px solid ${accentColor}`
                            }}
                        >
                            <div className="text-sm font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                                {milestone.age} Years Old
                            </div>
                            
                            <div className="text-5xl font-extrabold text-white font-mono leading-none">
                                {daysDisplay}
                            </div>
                            
                            <div className="mt-2 text-sm text-gray-500">
                                {milestone.passed ? `Milestone reached.` : `Days Remaining`}
                            </div>
                        </div>
                    );
                })}
            </div>
            
    
        </div>
    );
};

export default DayCounter;