import { Settings as SettingsIcon, Shield, Users, Save, Moon, Sun, Palette } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '../../components/ThemeProvider';

export function Settings() {
  const [protectedAttributes, setProtectedAttributes] = useState([
    { name: 'Gender', enabled: true },
    { name: 'Age Group', enabled: true },
    { name: 'Region', enabled: false },
    { name: 'Income Bracket', enabled: false },
  ]);

  const [threshold, setThreshold] = useState(0.20);
  const [autoMitigation, setAutoMitigation] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const toggleAttribute = (index: number) => {
    const updated = [...protectedAttributes];
    updated[index].enabled = !updated[index].enabled;
    setProtectedAttributes(updated);
  };

  const saveSettings = () => {
    alert("✅ Settings saved successfully!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold dark:text-white flex items-center gap-3">
          <SettingsIcon className="text-emerald-600" size={32} />
          Settings
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Configure fairness parameters and protected attributes
        </p>
      </div>

      {/* Appearance — Black Mode / White Mode */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="text-emerald-600" size={24} />
          <h2 className="text-xl font-semibold dark:text-white">Appearance</h2>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
          Switch between <strong>White Mode</strong> (light) and <strong>Black Mode</strong> (dark).
          All text, backgrounds, buttons, cards, and UI elements adjust automatically for
          readability and contrast.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { if (theme !== 'light') toggleTheme(); }}
            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
              theme === 'light'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-md'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center">
              <Sun className="text-amber-500" size={26} />
            </div>
            <div className="text-left">
              <p className="font-semibold dark:text-white">White Mode</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Bright, high-contrast UI</p>
            </div>
            {theme === 'light' && (
              <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </button>

          <button
            onClick={() => { if (theme !== 'dark') toggleTheme(); }}
            className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
              theme === 'dark'
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 shadow-md'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Moon className="text-blue-300" size={26} />
            </div>
            <div className="text-left">
              <p className="font-semibold dark:text-white">Black Mode</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Low-light, easy on eyes</p>
            </div>
            {theme === 'dark' && (
              <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
          Tip: you can also toggle using the <Sun size={12} className="inline" />/<Moon size={12} className="inline" /> button in the top navigation bar. Your choice is remembered across sessions.
        </p>
      </div>

      {/* Protected Attributes */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="text-emerald-600" size={24} />
          <h2 className="text-xl font-semibold dark:text-white">Protected Attributes</h2>
        </div>

        <div className="space-y-4">
          {protectedAttributes.map((attr, index) => (
            <div key={index} className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
              <div className="flex items-center gap-4">
                <Users className="text-zinc-500" size={22} />
                <div>
                  <p className="font-medium dark:text-white">{attr.name}</p>
                  <p className="text-sm text-zinc-500">Used for bias detection</p>
                </div>
              </div>
              <button
                onClick={() => toggleAttribute(index)}
                className={`px-6 py-2 rounded-2xl text-sm font-medium transition-all ${
                  attr.enabled 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {attr.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fairness Threshold */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold mb-6 dark:text-white">Fairness Threshold</h2>
        
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
              Maximum Acceptable Disparity
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.05"
                max="0.50"
                step="0.01"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-600"
              />
              <div className="font-mono text-2xl font-semibold w-20 text-emerald-600">
                {threshold}
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-2">Lower value = stricter fairness requirements</p>
          </div>
        </div>
      </div>

      {/* Auto Mitigation */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold dark:text-white">Auto Mitigation</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Automatically suggest and apply mitigation when high bias is detected
            </p>
          </div>
          <button
            onClick={() => setAutoMitigation(!autoMitigation)}
            className={`px-8 py-3 rounded-2xl font-medium transition-all ${
              autoMitigation 
                ? 'bg-emerald-600 text-white' 
                : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            {autoMitigation ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          className="flex items-center gap-3 px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-2xl transition-all"
        >
          <Save size={20} />
          Save Settings
        </button>
      </div>
    </div>
  );
}