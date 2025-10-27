import { useState } from "react";
import HabitDashboard from "./HabitDashboard";
import HabitTracker from "./HabitTracker";
import AddHabit from "./AddHabit";
import { PlusCircle } from "lucide-react";
type PeriodKeys = 'week' | 'month' | 'year';
const Habits:React.FC = () => {
      const [period, setPeriod] = useState<PeriodKeys>('month')
        const [showAdd, setShowAdd] = useState(false)
         const onAddHabit = () => {
  
    setShowAdd(false)
  }
  return (
    <div className=" w-[85vw]   mt-10 gap-6" >
        <div className="flex justify-between items-center mb-2 border-b border-[#303030] pb-2">
    <h3 className="text-xl self-end font-bold text-white tracking-tight" id="habits">Habit Dashboard</h3>
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
      <div className="flex flex-row justify-between align-top">

      <HabitDashboard period={period} setPeriod={setPeriod}/>
      <HabitTracker />
      </div>
       {showAdd && <AddHabit onClose={() => setShowAdd(false)} onAdd={onAddHabit} />}
      </div>)}
export default Habits;    