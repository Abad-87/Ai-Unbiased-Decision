import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { ConnectionStatus } from './ConnectionStatus';

interface TopNavbarProps {
  onNewScan: () => void;
}

export function TopNavbar({ onNewScan }: TopNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 h-16 flex items-center px-6 justify-between shadow-sm">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search metrics, cases, or groups..."
            className="w-full pl-11 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-emerald-500 rounded-2xl text-sm focus:outline-none dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend connection indicator */}
        <ConnectionStatus />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all duration-200 hover:scale-110 text-zinc-700 dark:text-zinc-300"
        >
          {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
        </button>

        {/* Notification Bell */}
        <button className="relative p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-700 dark:text-zinc-300">
          <Bell size={22} />
          <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">3</span>
        </button>

        {/* New Scan Button */}
        <button
          onClick={onNewScan}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          New Scan
        </button>
      </div>
    </header>
  );
}