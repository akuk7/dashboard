import "./App.css";

import BreakDashboard from "./components/BreakDashboard";
import BreakTracker from "./components/BreakTracker";
import DayCounter from "./components/DayCounter";
import Watchlist from "./components/WatchList";
import DigitalJournal from "./components/DigitalJournal";
import SpotifyPlayer from "./components/SpotifyPlayer";
import TodoKanban from "./components/TodoKanban";
import NavBar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import Habits from "./components/Habits";
// import DayCounter from './components/DayCounter'

function Dashboard() {
  return (
    <div className="flex flex-col items-center w-[99vw] justify-center my-20">
      <HeroSection />
      <NavBar/>
      <TodoKanban/>
      
      <div className="flex w-[85vw] justify-start mt-10 gap-6" id="breaks">
        <BreakTracker />
        <BreakDashboard />
        <div className="flex flex-col justify-between ml-auto">
          <DayCounter />
          <SpotifyPlayer />
        </div>
      </div>
      <Habits/>
      <div className="flex w-[85vw] justify-start mt-10 gap-6">
        <DigitalJournal />
        <Watchlist />
      </div>

    </div>
  );
}

export default Dashboard;
