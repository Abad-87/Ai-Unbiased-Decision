import { useState } from 'react';
import { CheckCircle, XCircle, Send, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface FeedbackFormProps {
  correlationId: string;
  predictionLabel?: string;
  domain: 'hiring' | 'loan' | 'social';
  onFeedbackSubmitted?: () => void;
}

export function FeedbackForm({ correlationId, domain, onFeedbackSubmitted }: FeedbackFormProps) {
  const [groundTruth, setGroundTruth] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    if (groundTruth === null) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await api.feedback({
        correlation_id: correlationId,
        ground_truth: groundTruth,
      });

      setResult({
        success: true,
        message: response.message || 'Ground truth recorded successfully!',
      });

      onFeedbackSubmitted?.();
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to submit feedback',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOutcomeOptions = () => {
    switch (domain) {
      case 'hiring':
        return [
          { value: 1, label: 'Candidate was Hired', icon: <CheckCircle size={18} className="text-emerald-600" /> },
          { value: 0, label: 'Candidate was Not Hired', icon: <XCircle size={18} className="text-red-600" /> },
        ];
      case 'loan':
        return [
          { value: 1, label: 'Loan was Repaid', icon: <CheckCircle size={18} className="text-emerald-600" /> },
          { value: 0, label: 'Loan was Defaulted', icon: <XCircle size={18} className="text-red-600" /> },
        ];
      case 'social':
        return [
          { value: 1, label: 'User Engaged with Content', icon: <CheckCircle size={18} className="text-emerald-600" /> },
          { value: 0, label: 'User Ignored Content', icon: <XCircle size={18} className="text-red-600" /> },
        ];
      default:
        return [
          { value: 1, label: 'Positive Outcome', icon: <CheckCircle size={18} className="text-emerald-600" /> },
          { value: 0, label: 'Negative Outcome', icon: <XCircle size={18} className="text-red-600" /> },
        ];
    }
  };

  const options = getOutcomeOptions();

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-3 mb-6">
        <AlertCircle className="text-emerald-600" size={24} />
        <h2 className="text-xl font-semibold dark:text-white">Submit Ground Truth</h2>
      </div>

      <p className="text-zinc-600 dark:text-zinc-400 mb-6">
        Help improve fairness metrics by reporting the actual outcome of this prediction.
        This enables Equalized Odds and Calibration calculations.
      </p>

      <div className="mb-6">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">What was the actual outcome?</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setGroundTruth(option.value)}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                groundTruth === option.value
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {option.icon}
              <span className="font-medium dark:text-white">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={groundTruth === null || isSubmitting}
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-400 text-white font-medium rounded-2xl flex items-center justify-center gap-3 transition-all"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={20} />
            Submit Ground Truth
          </>
        )}
      </button>

      {result && (
        <div className={`mt-4 p-4 rounded-2xl ${
          result.success 
            ? 'bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' 
            : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle size={18} /> : <XCircle size={18} />}
            <span className="font-medium">{result.message}</span>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
        Prediction ID: <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">{correlationId}</code>
      </p>
    </div>
  );
}
