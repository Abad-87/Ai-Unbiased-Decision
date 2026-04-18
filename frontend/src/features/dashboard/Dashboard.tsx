import { AlertTriangle, TrendingUp, Target, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const metrics = [
  { label: "Overall Fairness Score", value: "78", unit: "/100", status: "warning" as const },
  { label: "Demographic Parity Gap", value: "0.19", unit: "", status: "fair" as const },
  { label: "Equal Opportunity Diff", value: "0.12", unit: "", status: "fair" as const },
  { label: "Disparate Impact", value: "0.81", unit: "", status: "warning" as const },
];

const groupData = [
  { group: "Male", approval: 82 },
  { group: "Female", approval: 61 },
  { group: "Age < 30", approval: 75 },
  { group: "Age > 60", approval: 48 },
];

const pieData = [
  { name: "Fair", value: 78, color: "#10b981" },
  { name: "Biased Areas", value: 22, color: "#ef4444" },
];

export function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight mb-3 dark:text-white">Loan Approval Model</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">Overall Fairness Score</p>
            <p className="text-6xl font-bold text-emerald-600 mt-2">78<span className="text-3xl text-zinc-400 dark:text-zinc-500">/100</span></p>
            <div className="mt-4 flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={24} />
              <span className="font-medium">Mild bias detected in gender and age groups</span>
            </div>
          </div>

          <div className="w-64 h-64 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={110}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-7 shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="flex justify-between items-start">
              <p className="text-zinc-600 dark:text-zinc-400">{metric.label}</p>
              {metric.status === "warning" && <AlertTriangle className="text-amber-500" size={22} />}
            </div>
            <p className="text-5xl font-semibold mt-6 dark:text-white">{metric.value}{metric.unit}</p>
            <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm">
              <TrendingUp size={16} />
              <span>Improved from last scan</span>
            </div>
          </div>
        ))}
      </div>

      {/* Group Comparison Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold dark:text-white">Approval Rate by Protected Group</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Red bars indicate potential bias</p>
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={groupData} barCategoryGap={40}>
            <XAxis dataKey="group" tick={{ fill: '#a1a1aa' }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="approval" radius={12} fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => alert('Bias scan started!')}
          className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 p-8 rounded-3xl text-left transition-all group"
        >
          <Target className="mb-6 text-emerald-600 group-hover:scale-110 transition-transform" size={32} />
          <div className="text-2xl font-semibold mb-2 dark:text-white">Run Full Bias Scan</div>
          <p className="text-zinc-600 dark:text-zinc-400">Detect bias across all protected attributes</p>
        </button>

        <button 
          onClick={() => alert('Opening Fairness Explorer...')}
          className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 p-8 rounded-3xl text-left transition-all group"
        >
          <Zap className="mb-6 text-emerald-600 group-hover:scale-110 transition-transform" size={32} />
          <div className="text-2xl font-semibold mb-2 dark:text-white">Open What-If Explorer</div>
          <p className="text-zinc-600 dark:text-zinc-400">Test individual decisions in real-time</p>
        </button>
      </div>
    </div>
  );
}