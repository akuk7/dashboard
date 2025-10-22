import { useState, useEffect } from 'react';
import { Play, Pause, SquareStop } from 'lucide-react';
import type { BreakType, BreakSession } from '../types/break';

const BreakTracker = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedType, setSelectedType] = useState<BreakType>('nap');
  const [startTime, setStartTime] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startBreak = () => {
    setIsRunning(true);
    setStartTime(new Date().toISOString());
  };

  const stopBreak = () => {
    setIsRunning(false);
    if (startTime) {
      const endTime = new Date().toISOString();
      const newBreak: BreakSession = {
        id: Date.now().toString(),
        type: selectedType,
        startTime,
        endTime,
        duration: seconds,
        date: new Date().toISOString().split('T')[0],
      };

      // Save to localStorage
      const existingBreaks = JSON.parse(localStorage.getItem('breaks') || '{}');
      const date = new Date().toISOString().split('T')[0];
      existingBreaks[date] = [...(existingBreaks[date] || []), newBreak];
      localStorage.setItem('breaks', JSON.stringify(existingBreaks));
    }
    setSeconds(0);
    setStartTime(null);
  };

  return (
    <div className="p-6 bg-white/10 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Break Tracker</h2>
      <div className="flex gap-4 mb-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as BreakType)}
          className="bg-gray-700 text-white rounded px-3 py-2"
          disabled={isRunning}
        >
          <option value="nap">Nap</option>
          <option value="MD">MD</option>
        </select>
        <div className="text-3xl font-mono">{formatTime(seconds)}</div>
      </div>
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={startBreak}
            className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Play size={20} /> Start
          </button>
        ) : (
          <button
            onClick={() => setIsRunning(false)}
            className="bg-yellow-500 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Pause size={20} /> Pause
          </button>
        )}
        {seconds > 0 && (
          <button
            onClick={stopBreak}
            className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <SquareStop size={20} /> Stop
          </button>
        )}
      </div>
    </div>
  );
};

export default BreakTracker;