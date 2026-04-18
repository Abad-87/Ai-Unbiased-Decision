import { useState } from 'react';
import { FileText, Download, Calendar, Eye, CheckCircle } from 'lucide-react';

export function Reports() {
  const [selectedReport, setSelectedReport] = useState<number | null>(null);

  const reports = [
    {
      id: 1,
      date: "April 17, 2026",
      model: "Loan Approval Model v2.3",
      fairnessScore: 78,
      biasReduced: "68%",
      status: "Completed",
      summary: "Mild bias detected in Age > 60 and Female groups. Reweighting technique applied."
    },
    {
      id: 2,
      date: "April 15, 2026",
      model: "Loan Approval Model v2.2",
      fairnessScore: 64,
      biasReduced: "42%",
      status: "Completed",
      summary: "High bias detected in Gender and Region. Threshold adjustment recommended."
    },
    {
      id: 3,
      date: "April 10, 2026",
      model: "Loan Approval Model v2.1",
      fairnessScore: 71,
      biasReduced: "55%",
      status: "Completed",
      summary: "Moderate bias in Age groups. Adversarial debiasing applied successfully."
    }
  ];

  const handleExport = (id: number, format: string) => {
    alert(`📄 Exporting Report #${id} as ${format.toUpperCase()}...`);
  };

  const viewReport = (id: number) => {
    setSelectedReport(id);
    alert(`📋 Opening detailed report #${id} (Full PDF preview would appear here in production)`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold dark:text-white flex items-center gap-3">
            <FileText className="text-emerald-600" size={32} />
            Reports & Audit Log
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Export compliance-ready fairness reports and view audit history
          </p>
        </div>
        <button 
          onClick={() => alert("Generating new comprehensive audit report...")}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center gap-2 font-medium"
        >
          Generate New Report
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Total Reports</div>
          <div className="text-4xl font-semibold dark:text-white mt-2">12</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Avg. Fairness Score</div>
          <div className="text-4xl font-semibold text-emerald-600 mt-2">74</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Mitigations Applied</div>
          <div className="text-4xl font-semibold dark:text-white mt-2">8</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Last Audit</div>
          <div className="text-4xl font-semibold dark:text-white mt-2">Today</div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-xl font-semibold mb-6 dark:text-white">Audit History</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-zinc-700">
                <th className="text-left py-5 text-zinc-600 dark:text-zinc-400 font-medium">Date</th>
                <th className="text-left py-5 text-zinc-600 dark:text-zinc-400 font-medium">Model</th>
                <th className="text-left py-5 text-zinc-600 dark:text-zinc-400 font-medium">Fairness Score</th>
                <th className="text-left py-5 text-zinc-600 dark:text-zinc-400 font-medium">Bias Reduced</th>
                <th className="text-left py-5 text-zinc-600 dark:text-zinc-400 font-medium">Summary</th>
                <th className="text-center py-5 text-zinc-600 dark:text-zinc-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  <td className="py-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-zinc-400" />
                      {report.date}
                    </div>
                  </td>
                  <td className="py-6 font-medium dark:text-white">{report.model}</td>
                  <td className="py-6">
                    <span className="font-semibold dark:text-white">{report.fairnessScore}</span>
                    <span className="text-zinc-400">/100</span>
                  </td>
                  <td className="py-6">
                    <span className="text-emerald-600 font-medium">{report.biasReduced}</span>
                  </td>
                  <td className="py-6 text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                    {report.summary}
                  </td>
                  <td className="py-6">
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => viewReport(report.id)}
                        className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        title="View Report"
                      >
                        <Eye size={20} className="text-zinc-600 dark:text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleExport(report.id, 'pdf')}
                        className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        title="Export PDF"
                      >
                        <Download size={20} className="text-zinc-600 dark:text-zinc-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Note */}
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex items-start gap-6">
        <CheckCircle className="text-emerald-600 mt-1" size={28} />
        <div>
          <h3 className="font-semibold dark:text-white">Regulatory Compliance Ready</h3>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            All reports include full methodology, raw metrics, mitigation logs, and before/after comparisons. 
            Suitable for internal audits and regulatory submissions.
          </p>
        </div>
      </div>
    </div>
  );
}