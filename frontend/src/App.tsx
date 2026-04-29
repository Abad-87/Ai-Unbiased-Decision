import { lazy, Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { RetentionGuard } from './components/RetentionGuard';

const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then((module) => ({ default: module.Dashboard })));
const BiasDetection = lazy(() =>
  import('./features/bias-detection/BiasDetection').then((module) => ({ default: module.BiasDetection }))
);
const FairnessExplorer = lazy(() =>
  import('./features/fairness-explorer/FairnessExplorer').then((module) => ({ default: module.FairnessExplorer }))
);
const MitigationLab = lazy(() =>
  import('./features/mitigation-lab/MitigationLab').then((module) => ({ default: module.MitigationLab }))
);
const Reports = lazy(() => import('./features/reports/Reports').then((module) => ({ default: module.Reports })));
const Datasets = lazy(() => import('./features/datasets/Datasets').then((module) => ({ default: module.Datasets })));
const Settings = lazy(() => import('./features/settings/Settings').then((module) => ({ default: module.Settings })));
const HiringPrediction = lazy(() =>
  import('./features/hiring-prediction/HiringPrediction').then((module) => ({ default: module.HiringPrediction }))
);
const SocialRecommendation = lazy(() =>
  import('./features/social-recommendation/SocialRecommendation').then((module) => ({ default: module.SocialRecommendation }))
);

type Page =
  | 'dashboard'
  | 'datasets'
  | 'bias-detection'
  | 'fairness-explorer'
  | 'mitigation-lab'
  | 'reports'
  | 'settings'
  | 'hiring-prediction'
  | 'social-recommendation';

function PageSkeleton() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading workspace...</span>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [scanTrigger, setScanTrigger] = useState(0);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [fairnessAutoRunToken, setFairnessAutoRunToken] = useState(0);

  const handleNewScan = () => {
    setActivePage('datasets');
    setScanTrigger((n) => n + 1);
  };

  const handleScanComplete = () => {
    setDataRefreshKey((n) => n + 1);
    setActivePage('fairness-explorer');
    setFairnessAutoRunToken((n) => n + 1);
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard refreshKey={dataRefreshKey} />;
      case 'datasets':
        return <Datasets scanTrigger={scanTrigger} onScanComplete={handleScanComplete} />;
      case 'bias-detection':
        return <BiasDetection refreshKey={dataRefreshKey} onScanComplete={handleScanComplete} />;
      case 'fairness-explorer':
        return <FairnessExplorer autoRunToken={fairnessAutoRunToken} />;
      case 'mitigation-lab':
        return <MitigationLab />;
      case 'reports':
        return <Reports refreshKey={dataRefreshKey} />;
      case 'settings':
        return <Settings />;
      case 'hiring-prediction':
        return <HiringPrediction />;
      case 'social-recommendation':
        return <SocialRecommendation />;
      default:
        return <Dashboard refreshKey={dataRefreshKey} />;
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <RetentionGuard />
        <TopNavbar onNewScan={handleNewScan} />
        <main className="flex-1 overflow-auto p-6 bg-zinc-50 dark:bg-zinc-950">
          <Suspense fallback={<PageSkeleton />}>{renderPage()}</Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
