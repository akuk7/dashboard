import React from "react";
import {
  Menu,
  ListTodo,
  BookOpen,
  CheckSquare,
  Clock,
  Clapperboard,
  Music,
  Home,
  LogOut,
  Newspaper,
  Terminal,
} from "lucide-react";

// 💡 NEW: Import the Supabase client (adjust the path if needed)
import { supabase } from "../lib/supabase";

interface NavItem {
  id: string;
  title: string;
  icon: React.ElementType;
}

interface NavBarProps {
  newspaperUrl: string | null;
  isNewspaperLoading: boolean;
  leetcodeUrl: string | null;
  isLeetCodeLoading: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", title: "Home", icon: Home },
  { id: "todo", title: "ToDo", icon: ListTodo },
  { id: "breaks", title: "Breaks", icon: Clock },
  { id: "music", title: "Music", icon: Music },
  { id: "habits", title: "Habits", icon: CheckSquare },
  { id: "journal", title: "Journal", icon: BookOpen },
  { id: "movies", title: "Movies", icon: Clapperboard },
  { id: "newspaper", title: "Newspaper", icon: Newspaper },
  { id: "leetcode", title: "LeetCode", icon: Terminal },
];

const NavBar: React.FC<NavBarProps> = ({
  newspaperUrl,
  isNewspaperLoading,
  leetcodeUrl,
  isLeetCodeLoading
}) => {

  // 💡 NEW: Supabase Logout Function
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      alert("Logout failed. Please try again.");
    } else {
      console.log("User successfully logged out.");
    }
  };

  const handleNewspaperClick = (e: React.MouseEvent) => {
    if (isNewspaperLoading) {
      e.preventDefault();
      alert("Newspaper link is still loading... Please wait a moment.");
      return;
    }

    if (!newspaperUrl) {
      e.preventDefault();
      alert("Could not retrieve the newspaper link for today. Please try again later.");
      return;
    }

    // Open in new tab
    window.open(newspaperUrl, '_blank');
  };

  const handleLeetCodeClick = (e: React.MouseEvent) => {
    if (isLeetCodeLoading) {
      e.preventDefault();
      alert("LeetCode daily problem is still being fetched... Please wait.");
      return;
    }

    if (!leetcodeUrl) {
      e.preventDefault();
      alert("Could not find today's LeetCode problem. LeetCode's site might be blocking the fetch.");
      return;
    }

    window.open(leetcodeUrl, '_blank');
  };

  return (
    // Fixed Top Nav Bar: Thin (h-10), high-contrast, dark background
    <nav className="fixed top-0 left-0 w-full bg-[#0A0A0A] border-b border-[#303030] z-50 shadow-lg">
      {/* Container is now split into three sections: Left (Logo), Center (Nav Links), Right (Logout) */}
      <div className="flex justify-between items-center h-10 px-6">

        {/* LEFT: Logo / Brand Name */}
        <div className="flex items-center gap-2 text-sm font-extrabold text-white tracking-widest uppercase">
          <Menu className="w-4 h-4 text-gray-400" />
          MY DASHBOARD
        </div>

        {/* CENTER: Navigation Links */}
        <div className="flex space-x-6">
          {NAV_ITEMS.map((item) => {
            const isSpecial = item.id === 'newspaper' || item.id === 'leetcode';
            const isLoading = item.id === 'newspaper' ? isNewspaperLoading : (item.id === 'leetcode' ? isLeetCodeLoading : false);
            const handleClick = item.id === 'newspaper' ? handleNewspaperClick : handleLeetCodeClick;

            return isSpecial ? (
              <button
                key={item.id}
                onClick={handleClick}
                className={`flex items-center text-xs font-medium transition-colors duration-200 ${isLoading ? 'text-gray-600 cursor-wait' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <item.icon className={`w-3 h-3 mr-1 ${isLoading ? 'animate-pulse' : ''}`} />
                {item.title}
                {isLoading && <span className="ml-1 text-[8px] opacity-70">(...)</span>}
              </button>
            ) : (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="flex items-center text-xs font-medium text-gray-400 hover:text-white transition-colors duration-200"
              >
                <item.icon className="w-3 h-3 mr-1" />
                {item.title}
              </a>
            );
          })}
        </div>

        {/* RIGHT: Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center text-xs font-medium text-red-400 hover:text-red-300 transition-colors duration-200 ml-6"
          aria-label="Logout"
        >
          <LogOut className="w-3 h-3 mr-1" />
          Logout
        </button>

      </div>
    </nav>
  );
};

export default NavBar;