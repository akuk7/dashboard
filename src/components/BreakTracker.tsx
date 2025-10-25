import React, { useState, useEffect } from 'react';
import { Play, Square, Clock, Pause } from 'lucide-react';
import supabase from '../lib/supabase';

type BreakType = 'Nap' | 'MD'|'Screen';

const formatDate = (d: Date) => d.toISOString().split('T')[0];

const BreakTracker: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // Time in seconds
  const [selectedType, setSelectedType] = useState<BreakType>('Nap');
  const [startTime, setStartTime] = useState<Date | null>(null);

  useEffect(() => {
    let interval: number | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const startBreak = () => {
    setStartTime(new Date());
    setIsRunning(true);
  };
  
  const pauseBreak = () => {
      setIsRunning(false);
  }

  const stopBreak = async () => {
    if (time > 0 && startTime) {
      const endTime = new Date();
      const durationSeconds = time;
      const date = formatDate(startTime);

      const newRecord = {
        id: crypto.randomUUID(),
        type: selectedType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration: durationSeconds,
        date: date,
      };
      
      const { error } = await supabase.from('breaks').insert([newRecord]);

      if (error) {
        console.error('Error saving break record to Supabase:', error);
        alert('Failed to save break time. Check console.');
        return;
      }
    }
    
    // Reset state regardless of save success (for simplicity)
    setIsRunning(false);
    setTime(0);
    setStartTime(null);
  };

  // Format time (HH:MM:SS)
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(t => t.toString().padStart(2, '0'))
      .join(':');
  };
  
  // Calculate rotation for the clock hand
  const rotationDegrees = (time % 60) * 6; 

  return (
    // Monochromatic Card Container
    <div className="p-6 bg-[#121212] rounded-xl border border-[#303030] shadow-md text-white max-w-lg ">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white border-b border-[#303030] pb-3">
        <Clock className="w-5 h-5 text-gray-400" /> Break Tracker
      </h3>

      {/* Break Type Selector */}
      <div className="flex justify-center gap-3 mb-6">
        {(['Nap', 'MD','Screen'] as BreakType[]).map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            disabled={isRunning}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedType === type
                ? 'bg-white text-black border border-white'
                : 'bg-[#1D2330] text-gray-400 border border-[#303030]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Clock/Stopwatch UI */}
      <div className="flex flex-col items-center gap-4">
        {/* Analog Clock UI based on time (for visual flair) */}
        <div className="w-40 h-40 border-4 border-gray-600 rounded-full flex items-center justify-center relative bg-[#0A0A0A]">
          <div className="w-2 h-2 bg-white rounded-full absolute z-10" />
          
          {/* Second Hand (simulated by rotation) */}
          <div 
            className="w-1 h-16 absolute bottom-1/2 left-1/2 -ml-0.5 transform origin-bottom rounded-t-full"
            style={{ 
                transform: `rotate(${rotationDegrees}deg)`, 
                backgroundColor: isRunning ? 'white' : '#444444' 
            }}
          />

          {/* Time Display Overlay */}
          <div className='absolute text-2xl font-mono font-bold text-white z-20'>
            {formatTime(time)}
          </div>
        </div>

        {/* Stopwatch Status */}
        <p className="text-gray-400 text-sm">{isRunning ? `Tracking ${selectedType}...` : 'Ready to start'}</p>
        
        {/* Control Buttons */}
        <div className="flex gap-4 mt-2">
          <button
            onClick={isRunning ? pauseBreak : startBreak}
            className={`px-6 py-3 rounded-full font-bold transition flex items-center gap-2 ${
              !isRunning 
                ? (time === 0 ? 'bg-white text-black hover:bg-gray-200 shadow-md shadow-white/10' : 'bg-gray-700 text-white hover:bg-gray-600')
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
          >
            {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Pause' : (time > 0 ? 'Resume' : 'Start')}
          </button>

          <button
            onClick={stopBreak}
            disabled={time === 0}
            className="px-6 py-3 rounded-full font-bold transition flex items-center gap-2 bg-[#1D2330] text-gray-400 hover:bg-[#303030] border border-[#303030]"
          >
            <Square className="w-5 h-5" /> Stop & Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakTracker;