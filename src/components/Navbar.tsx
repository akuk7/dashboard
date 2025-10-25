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
} from "lucide-react";

interface NavItem {
  id: string;
  title: string;
  icon: React.ElementType;
}

// Placeholder array for all your dashboard components.
// Update the 'id' field once you define the final anchor IDs on your main layout.
const NAV_ITEMS: NavItem[] = [
    { id: "home", title: "Home", icon: Home },
  { id: "todo", title: "ToDo", icon: ListTodo },
   { id: "breaks", title: "Breaks", icon: Clock },
  { id: "breaks", title: "Music", icon: Music },
  { id: "habits", title: "Habits", icon: CheckSquare },
  { id: "journal", title: "Journal", icon: BookOpen },
  { id: "journal", title: "Movies", icon: Clapperboard },
];

const NavBar: React.FC = () => {
  return (
    // Fixed Top Nav Bar: Thin (h-10), high-contrast, dark background
    <nav className="fixed top-0 left-0 w-full bg-[#0A0A0A] border-b border-[#303030] z-50 shadow-lg">
      <div className="flex justify-between items-center h-10 px-6">
        {/* Logo / Brand Name (Thin, High-Contrast) */}
        <div className="flex items-center gap-2 text-sm font-extrabold text-white tracking-widest uppercase">
          <Menu className="w-4 h-4 text-gray-400" />
          MY DASHBOARD
        </div>

        {/* Navigation Links (Small font, thin style) */}
        <div className="flex space-x-6">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`} // Links to anchor IDs in your main layout
              // Styling for very small font (text-xs) and small icons (w-3 h-3)
              className="flex items-center text-xs font-medium text-gray-400 hover:text-white transition-colors duration-200"
            >
              <item.icon className="w-3 h-3 mr-1" />
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
