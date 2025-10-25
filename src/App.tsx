import "./App.css";
import HabitDashboard from "./components/HabitDashboard";
import HabitTracker from "./components/HabitTracker";
import BreakDashboard from "./components/BreakDashboard";
import BreakTracker from "./components/BreakTracker";
import DayCounter from "./components/DayCounter";
import Watchlist from "./components/WatchList";
import DigitalJournal from "./components/DigitalJournal";
import SpotifyPlayer from "./components/SpotifyPlayer";
import TodoKanban from "./components/TodoKanban";
import NavBar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
// import DayCounter from './components/DayCounter'

function App() {
  return (
    <div className="flex flex-col items-center justify-center my-20">
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
      <HabitDashboard />
      <HabitTracker />
      <div className="flex w-[85vw] justify-start mt-10 gap-6">
        <DigitalJournal />
        <Watchlist />
      </div>

      {/* <img src='/pulp.jpg'/> */}
    </div>
  );
}

export default App;
