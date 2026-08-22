import "./App.css";

import DayCounter from "./components/DayCounter";
import Watchlist from "./components/WatchList";
import DigitalJournal from "./components/DigitalJournal";
import SpotifyPlayer from "./components/SpotifyPlayer";
import TodoKanban from "./components/TodoKanban";
import NavBar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import Habits from "./components/Habits";
import Transactions from "./components/Transactions";
import Workouts from "./components/Workouts";
import { useState, useEffect } from "react";
import { fetchTheHinduLink } from "./lib/newspaperService";
import { fetchLeetCodeDailyLink } from "./lib/leetcodeService";
// import DayCounter from './components/DayCounter'

function Dashboard() {
  const [newspaperUrl, setNewspaperUrl] = useState<string | null>(null);
  const [isNewspaperLoading, setIsNewspaperLoading] = useState(true);
  const [leetcodeUrl, setLeetcodeUrl] = useState<string | null>(null);
  const [isLeetCodeLoading, setIsLeetCodeLoading] = useState(true);

  useEffect(() => {
    const loadNewspaper = async () => {
      try {
        const url = await fetchTheHinduLink();
        setNewspaperUrl(url);
      } catch (err) {
        console.error("Dashboard: Newspaper fetch failed:", err);
      } finally {
        setIsNewspaperLoading(false);
      }
    };

    const loadLeetCode = async () => {
      try {
        const url = await fetchLeetCodeDailyLink();
        setLeetcodeUrl(url);
      } catch (err) {
        console.error("Dashboard: LeetCode fetch failed:", err);
      } finally {
        setIsLeetCodeLoading(false);
      }
    };

    loadNewspaper();
    loadLeetCode();
  }, []);

  return (
    <div className="flex flex-col items-center w-[99vw] justify-center my-20">
      <HeroSection />
      <NavBar
        newspaperUrl={newspaperUrl}
        isNewspaperLoading={isNewspaperLoading}
        leetcodeUrl={leetcodeUrl}
        isLeetCodeLoading={isLeetCodeLoading}
      />
      <TodoKanban />

      <div className="flex w-[85vw] items-stretch mt-10 gap-4">
        <DayCounter />
        <SpotifyPlayer />
      </div>
      <Habits />
      <Transactions />
      <Workouts />
      <div className="flex w-[85vw] justify-start mt-10 gap-6">
        <DigitalJournal />
        <Watchlist />
      </div>

    </div>
  );
}

export default Dashboard;
