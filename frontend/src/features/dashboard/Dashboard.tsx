import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  Target,
  Zap,
  Briefcase,
  DollarSign,
  Share2,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { api } from '../../lib/api';
import type { RecentPrediction, SummaryResponse } from '../../lib/api';
import { loadFairnessSettings } from '../../lib/fairnessSettings';

type Domain = 'loan' | 'hiring' | 'social';

interface DomainConfig {
  id: Domain;
  label: string;
  icon: typeof DollarSign;
  accentClass: string;
  buttonClass: string;
  barColor: string;
  biasColor: string;
}

interface DomainInsightsState {
  summary: SummaryResponse | null;
  recent: RecentPrediction[];
  loading: boolean;
  error: boolean;
}

const DOMAINS: DomainConfig[] = [
  {
    id: 'loan',
    label: 'Loan Approval',
    icon: DollarSign,
    accentClass: 'text-emerald-600',
    buttonClass: 'bg-emerald-600 text-white',
    barColor: '#10b981',
    biasColor: '#f59e0b',
  },
  {
    id: 'hiring',
    label: 'Hiring Decision',
    icon: Briefcase,
    accentClass: 'text-blue-600',
    buttonClass: 'bg-blue-600 text-white',
    barColor: '#2563eb',
    biasColor: '#f97316',
  },
  {
    id: 'social',
    label: 'Social Recommend',
    icon: Share2,
    accentClass: 'text-violet-600',
    buttonClass: 'bg-violet-600 text-white',
    barColor: '#8b5cf6',
    biasColor: '#ec4899',
  },
];

function useDomainInsights(domain: Domain, refreshKey: number): DomainInsightsState {
  const [state, setState] = useState<DomainInsightsState>({
    summary: null,
    recent: [],
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({ ...prev, loading: true, error: false }));
    Promise.all([api.getSummary(domain), api.getRecent(domain, 24)])
      .then(([summary, recent]) => {
        if (cancelled) return;
        setState({
          summary,
          recent: recent.records,
          loading: false,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          summary: null,
          recent: [],
          loading: false,
          error: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [domain, refreshKey]);

  return state;
}

function formatTrendLabel(timestamp: string | null, index: number) {
  if (!timestamp) return `#${index + 1}`;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return `#${index + 1}`;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function normalizeFairnessScore(summary: SummaryResponse | null) {
  if (!summary) return null;
  const dpd = summary.demographic_parity_difference;
  if (dpd != null) {
    return Math.max(0, Math.round((1 - Math.abs(dpd)) * 100));
  }
  return summary.n_records > 0 ? 85 : null;
}

export function Dashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [activeDomain, setActiveDomain] = useState<Domain>('loan');
  const [settings] = useState(() => loadFairnessSettings());
  const { summary, recent, loading, error } = useDomainInsights(activeDomain, refreshKey);

  const activeDomainConfig = DOMAINS.find((domain) => domain.id === activeDomain) ?? DOMAINS[0];
  const ActiveIcon = activeDomainConfig.icon;
  const threshold = settings.threshold;

  const safeRecordCount = Number.isFinite(summary?.n_records) ? Number(summary?.n_records ?? 0) : 0;
  const safeGroups = Array.isArray(summary?.per_group)
    ? summary.per_group.filter((group) => group && typeof group.group === 'string')
    : [];
  const dpd = summary?.demographic_parity_difference ?? null;
  const eod = summary?.equal_opportunity_difference ?? null;
  const hasRecords = safeRecordCount > 0;
  const fairnessScore = normalizeFairnessScore(summary);
  const biasedPct = fairnessScore != null ? 100 - fairnessScore : null;
  const hasComparableGroups = safeGroups.length >= 2 && dpd != null;

  const metrics = [
    {
      label: 'Overall Fairness Score',
      value: loading ? '...' : fairnessScore != null ? String(fairnessScore) : error ? '-' : 'N/A',
      unit: '/100',
      warning: fairnessScore != null && fairnessScore < Math.round((1 - threshold) * 100),
    },
    {
      label: 'Demographic Parity Gap',
      value: loading ? '...' : dpd != null ? Math.abs(dpd).toFixed(2) : error ? '-' : 'N/A',
      unit: '',
      warning: dpd != null && Math.abs(dpd) > threshold,
    },
    {
      label: 'Equal Opportunity Diff',
      value: loading ? '...' : eod != null ? Math.abs(eod).toFixed(2) : error ? '-' : 'N/A',
      unit: '',
      warning: eod != null && Math.abs(eod) > threshold,
    },
    {
      label: 'Records Analysed',
      value: loading ? '...' : summary ? String(safeRecordCount) : error ? '-' : 'N/A',
      unit: '',
      warning: false,
    },
  ];

  const groupData = safeGroups.map((group) => ({
    group: group.group,
    positiveRate: Number.isFinite(group.positive_rate) ? Math.round(group.positive_rate * 100) : 0,
    confidence: Number.isFinite(group.avg_confidence) ? Math.round(group.avg_confidence * 100) : 0,
  }));

  const trendData = useMemo(() => {
    const ordered = [...recent].sort((a, b) => {
      const aTime = Date.parse(a.timestamp || '');
      const bTime = Date.parse(b.timestamp || '');
      return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
    });

    return ordered.map((record, index) => ({
      name: formatTrendLabel(record.timestamp, index),
      confidence: Math.round((record.confidence ?? 0) * 100),
      biasRisk: Math.round(((record.bias_risk?.score ?? 0) as number) * 100),
    }));
  }, [recent]);

  const pieData =
    fairnessScore != null && biasedPct != null
      ? [
          { name: 'Fair', value: fairnessScore, color: '#10b981' },
          { name: 'Biased Areas', value: biasedPct, color: '#ef4444' },
        ]
      : [{ name: 'No Data', value: 100, color: '#e4e4e7' }];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex gap-3 flex-wrap">
        {DOMAINS.map((domain) => {
          const Icon = domain.icon;
          const isActive = activeDomain === domain.id;
          return (
            <button
              key={domain.id}
              onClick={() => setActiveDomain(domain.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all ${
                isActive
                  ? domain.buttonClass
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Icon size={20} />
              {domain.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <ActiveIcon className={activeDomainConfig.accentClass} size={40} />
              <h1 className="text-4xl font-semibold tracking-tight dark:text-white">
                {activeDomainConfig.label} Model
              </h1>
              {loading && <Loader2 className="animate-spin text-zinc-400" size={24} />}
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg">Overall Fairness Score</p>
            <p className={`text-6xl font-bold mt-2 ${activeDomainConfig.accentClass}`}>
              {loading ? '...' : fairnessScore ?? 'N/A'}
              <span className="text-3xl text-zinc-400 dark:text-zinc-500">/100</span>
            </p>
            <div className="mt-4 flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={24} />
              <span className="font-medium">
                {loading
                  ? 'Loading fairness metrics...'
                  : summary
                    ? dpd != null && Math.abs(dpd) > threshold
                      ? `Bias detected - DPD ${Math.abs(dpd).toFixed(2)}`
                      : !hasComparableGroups
                        ? 'Predictions were found, but there are not enough distinct protected groups for a full comparison yet.'
                        : 'Fairness metrics are within the current threshold.'
                    : error
                      ? 'Failed to load fairness data.'
                      : 'No prediction data yet. Run a few predictions first.'}
              </span>
            </div>
          </div>

          <div className="w-64 h-64 shrink-0">
            <PieChart width={256} height={256}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={85}
                outerRadius={110}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-7 shadow-sm border border-zinc-100 dark:border-zinc-800"
          >
            <div className="flex justify-between items-start">
              <p className="text-zinc-600 dark:text-zinc-400">{metric.label}</p>
              {metric.warning && !loading && <AlertTriangle className="text-amber-500" size={22} />}
            </div>
            <p className="text-5xl font-semibold mt-6 dark:text-white">
              {metric.value}
              {metric.unit}
            </p>
            <div className="mt-6 flex items-center gap-2 text-emerald-600 text-sm">
              <TrendingUp size={16} />
              <span>Live metrics from {activeDomainConfig.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold dark:text-white">
              {activeDomain === 'loan' ? 'Approval' : activeDomain === 'hiring' ? 'Hiring' : 'Engagement'} Rate by Protected Group
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? 'Loading data...' : error ? 'Failed to load data' : `Showing ${safeRecordCount} records`}
            </p>
          </div>

          {hasRecords && groupData.length > 0 ? (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupData} barCategoryGap={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                  <XAxis dataKey="group" tick={{ fill: '#a1a1aa' }} />
                  <YAxis tick={{ fill: '#a1a1aa' }} />
                  <Tooltip />
                  <Bar dataKey="positiveRate" name="Decision Rate %" radius={12} fill={activeDomainConfig.barColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[360px] flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-center px-6">
              No grouped fairness data yet.
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold dark:text-white">Recent Confidence and Bias Trend</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? 'Loading trend...' : `${trendData.length} recent predictions`}
            </p>
          </div>

          {trendData.length > 0 ? (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} minTickGap={24} />
                  <YAxis tick={{ fill: '#a1a1aa' }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    name="Confidence %"
                    stroke={activeDomainConfig.barColor}
                    strokeWidth={3}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="biasRisk"
                    name="Bias risk %"
                    stroke={activeDomainConfig.biasColor}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[360px] flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-center px-6">
              No recent prediction trend yet.
            </div>
          )}
        </div>
      </div>

      {hasRecords && !hasComparableGroups && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-3xl p-6 flex items-start gap-4">
          <AlertTriangle className="text-amber-600 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">
              Protected group comparison needs more variety
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {activeDomainConfig.label} has {safeRecordCount} prediction records, but they do not include enough distinct
              protected attribute groups to calculate DPD or EOD. Predictions still load, but fairness comparison gets much
              stronger once values like gender, age group, region, or language are present across multiple groups.
            </p>
          </div>
        </div>
      )}

      {summary?.notes?.length ? (
        <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6">
          <h3 className="font-semibold dark:text-white mb-3">Analysis Notes</h3>
          <ul className="space-y-2">
            {summary.notes.map((note) => (
              <li key={note} className="text-sm text-zinc-600 dark:text-zinc-400 flex gap-2">
                <span className="text-emerald-600">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 p-8 rounded-3xl text-left transition-all group">
          <Target className="mb-6 text-emerald-600 group-hover:scale-110 transition-transform" size={32} />
          <div className="text-2xl font-semibold mb-2 dark:text-white">Run Full Bias Scan</div>
          <p className="text-zinc-600 dark:text-zinc-400">Detect bias across all protected attributes</p>
        </button>

        <button className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 p-8 rounded-3xl text-left transition-all group">
          <Zap className="mb-6 text-emerald-600 group-hover:scale-110 transition-transform" size={32} />
          <div className="text-2xl font-semibold mb-2 dark:text-white">Open What-If Explorer</div>
          <p className="text-zinc-600 dark:text-zinc-400">Test individual decisions in real time</p>
        </button>
      </div>
    </div>
  );
}
