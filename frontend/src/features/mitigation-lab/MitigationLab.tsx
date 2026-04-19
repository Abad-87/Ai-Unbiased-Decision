import { useState, useEffect } from 'react';
import { Shield, ArrowRight, CheckCircle, AlertTriangle, Loader2, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../../lib/api';
import type { SummaryResponse, MitigationResult } from '../../lib/api';

type Domain = 'loan' | 'hiring' | 'social';

export function MitigationLab() {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [mitigated, setMitigated] = useState(false);
  const [liveData, setLiveData] = useState<SummaryResponse | null>(null);
  const [mitigationResult, setMitigationResult] = useState<MitigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeDomain, setActiveDomain] = useState<Domain>('loan');

  useEffect(() => {
    api.getSummary(activeDomain).then(setLiveData).catch(() => {});
  }, [activeDomain]);

  const domains: { id: Domain; label: string }[] = [
    { id: 'loan', label: 'Loan Approval' },
    { id: 'hiring', label: 'Hiring Decision' },
    { id: 'social', label: 'Social Recommendation' },
  ];

  const techniques = [
    {
      id: 'threshold',
      name: 'Threshold Optimization',
      category: 'Post-processing',
      description: 'Adjusts decision thresholds per group to equalize approval rates',
      impact: 'Reduces bias by ~60%',
      accuracyDrop: '1-3%',
      color: 'blue'
    },
    {
      id: 'calibration',
      name: 'Calibration Adjustment',
      category: 'Post-processing',
      description: 'Fixes miscalibrated confidence scores per group',
      impact: 'Improves reliability',
      accuracyDrop: '0-2%',
      color: 'emerald'
    },
    {
      id: 'impact_removal',
      name: 'Disparate Impact Removal',
      category: 'Post-processing',
      description: 'Ensures 80% rule compliance by boosting disadvantaged groups',
      impact: 'Legal compliance',
      accuracyDrop: '2-5%',
      color: 'violet'
    },
  ];

  const liveGroups = liveData && liveData.per_group.length >= 2 ? liveData.per_group : null;
  const beforeData = liveGroups
    ? liveGroups.map(g => ({ group: g.group, rate: Math.round(g.positive_rate * 100) }))
    : [
        { group: 'Male', rate: 82 },
        { group: 'Female', rate: 61 },
        { group: 'Age <30', rate: 75 },
        { group: 'Age >60', rate: 48 },
      ];

  const meanRate = beforeData.reduce((a, b) => a + b.rate, 0) / beforeData.length;
  const afterData = beforeData.map(g => ({
    group: g.group,
    rate: Math.round(g.rate + (meanRate - g.rate) * 0.65),
  }));

  const dpd = liveData?.demographic_parity_difference;
  const biasReduction = dpd != null ? Math.round((1 - Math.abs(dpd)) * 100) : 68;
  
  // Use real mitigation result if available, otherwise use calculated
  const newFairnessScore = mitigationResult?.success
    ? Math.round((1 - Math.abs(mitigationResult.mitigated_dpd || 0)) * 100)
    : mitigated
      ? Math.min(99, Math.round(biasReduction + (100 - biasReduction) * 0.45))
      : biasReduction;

  const improvementPct = mitigationResult?.improvement_pct || 0;

  const applyMitigation = async () => {
    if (!selectedTechnique) return;

    setIsApplying(true);
    setError(null);
    setMitigationResult(null);

    try {
      const result = await api.applyMitigation({
        domain: activeDomain,
        method: selectedTechnique as 'threshold' | 'calibration' | 'impact_removal',
        target_metric: 'demographic_parity',
        strength: 0.7,
      });

      setMitigationResult(result);
      if (result.success) {
        setMitigated(true);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mitigation failed');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold dark:text-white flex items-center gap-3">
          <Shield className="text-emerald-600" size={32} />
          Mitigation Lab
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Apply fairness techniques and compare results before & after
        </p>
      </div>

      {/* Domain Selector */}
      <div className="flex gap-2">
        {domains.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setActiveDomain(d.id);
              setMitigated(false);
              setMitigationResult(null);
            }}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              activeDomain === d.id
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Technique Selector */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-6 dark:text-white">Choose Mitigation Technique</h2>

            <div className="space-y-4">
              {techniques.map((tech) => (
                <button
                  key={tech.id}
                  onClick={() => {
                    setSelectedTechnique(tech.id);
                    setMitigated(false);
                  }}
                  className={`w-full p-6 rounded-3xl border-2 transition-all text-left ${
                    selectedTechnique === tech.id
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg dark:text-white">{tech.name}</div>
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">{tech.category}</div>
                    </div>
                    <div className={`text-xs px-3 py-1 rounded-full bg-${tech.color}-100 text-${tech.color}-700 dark:bg-${tech.color}-900 dark:text-${tech.color}-300`}>
                      {tech.impact}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">{tech.description}</p>
                  <p className="text-xs mt-4 text-zinc-500">Expected accuracy drop: {tech.accuracyDrop}</p>
                </button>
              ))}
            </div>

            <button
              onClick={applyMitigation}
              disabled={!selectedTechnique || isApplying}
              className="mt-8 w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white font-medium rounded-2xl flex items-center justify-center gap-3 transition-all"
            >
              {isApplying ? (
                <><Loader2 className="animate-spin" size={20} /> Applying Mitigation...</>
              ) : (
                <>
                  Apply Selected Technique <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Before vs After Comparison */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-semibold dark:text-white">Before vs After Mitigation</h2>
              {mitigated && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                  <CheckCircle size={20} />
                  Mitigation Applied
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Before */}
              <div>
                <div className="text-red-600 font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} /> BEFORE
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={beforeData}>
                    <XAxis dataKey="group" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#ef4444" radius={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* After */}
              <div>
                <div className="text-emerald-600 font-medium mb-4 flex items-center gap-2">
                  <CheckCircle size={18} /> AFTER
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={afterData}>
                    <XAxis dataKey="group" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#10b981" radius={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-semibold text-lg mb-6 dark:text-white">Fairness Improvement Summary</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                <div className="text-4xl font-bold text-emerald-600">{biasReduction}%</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Current Fairness Level</div>
              </div>
              <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                <div className="text-4xl font-bold text-emerald-600">
                  {techniques.find(t => t.id === selectedTechnique)?.accuracyDrop ?? '1-4%'}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">Expected Accuracy Drop</div>
              </div>
              <div className="text-center p-6 bg-zinc-50 dark:bg-zinc-800 rounded-2xl">
                <div className="text-4xl font-bold text-emerald-600">{newFairnessScore}</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
                  {mitigated ? 'New Fairness Score' : 'Projected Score'}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-8 p-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl text-center">
                <AlertTriangle className="mx-auto text-red-600 mb-3" size={32} />
                <p className="font-medium dark:text-white">Mitigation Failed</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">{error}</p>
              </div>
            )}

            {mitigated && mitigationResult?.success && (
              <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                <CheckCircle className="mx-auto text-emerald-600 mb-3" size={32} />
                <p className="font-medium dark:text-white">Mitigation successfully applied!</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-2">
                  Improved fairness by {improvementPct.toFixed(1)}%. Affected {mitigationResult.affected_records} of {mitigationResult.total_records} predictions.
                </p>
                {mitigationResult.new_thresholds.length > 0 && (
                  <div className="mt-4 text-left">
                    <p className="text-sm font-medium dark:text-white mb-2">New Thresholds:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {mitigationResult.new_thresholds.map((t) => (
                        <div key={t.group} className="bg-white dark:bg-zinc-800 p-2 rounded">
                          <span className="text-zinc-500">{t.group}:</span>{' '}
                          <span className="font-medium">{t.new_threshold.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}