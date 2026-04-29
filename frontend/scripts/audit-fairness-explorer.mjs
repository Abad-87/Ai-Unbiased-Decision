import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const appUrl = process.env.AUDIT_APP_URL || 'http://127.0.0.1:5173/';
const outDir = path.resolve(process.cwd(), 'audit-output');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const domains = [
  { id: 'loan', label: 'Loan Approval' },
  { id: 'hiring', label: 'Hiring Decision' },
  { id: 'social', label: 'Social Recommend' },
];

function compact(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

async function text(locator, timeout = 1000) {
  return compact(await locator.innerText({ timeout }).catch(() => ''));
}

async function waitForNotVisible(locator, timeout = 180000) {
  await locator.waitFor({ state: 'hidden', timeout }).catch(() => {});
}

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: chromePath,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
});
const page = await context.newPage();

const report = {
  appUrl,
  startedAt: new Date().toISOString(),
  scan: {},
  domains: [],
  console: [],
  failedRequests: [],
  dialogs: [],
};

page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) {
    report.console.push({ type: msg.type(), text: msg.text().slice(0, 1000) });
  }
});

page.on('pageerror', (error) => {
  report.console.push({ type: 'pageerror', text: String(error.message || error).slice(0, 1000) });
});

page.on('response', (response) => {
  if (response.status() >= 400) {
    report.failedRequests.push({ status: response.status(), url: response.url() });
  }
});

page.on('requestfailed', (request) => {
  report.failedRequests.push({
    status: 'failed',
    url: request.url(),
    error: request.failure()?.errorText,
  });
});

page.on('dialog', async (dialog) => {
  report.dialogs.push({ type: dialog.type(), message: dialog.message().slice(0, 500) });
  if (/delete|older than 2 hours/i.test(dialog.message())) {
    await dialog.dismiss();
  } else {
    await dialog.accept().catch(() => dialog.dismiss());
  }
});

await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 60000 });

// Build scan context from files that already exist on the backend. No upload.
await page.getByRole('button', { name: 'Datasets & Models' }).click();
await page.waitForLoadState('networkidle').catch(() => {});
await page.getByRole('button', { name: /Scan All Files/i }).click({ timeout: 30000 });
await waitForNotVisible(page.getByText(/Running full-system scan/i), 240000);
await page.waitForTimeout(1500);

const scanText = await text(page.locator('main'), 2000);
report.scan = {
  hasScanReport: /scan report|scan complete|files scanned|domain/i.test(scanText.toLowerCase()),
  textSample: scanText.slice(0, 1500),
};

await page.getByRole('button', { name: 'Fairness Explorer' }).click();
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(2000);

for (const domain of domains) {
  const domainResult = {
    id: domain.id,
    label: domain.label,
    visible: false,
    rowCount: 0,
    rows: [],
    problems: [],
  };

  const beforeConsole = report.console.length;
  const beforeRequests = report.failedRequests.length;

  await page.locator('main').getByRole('button', { name: domain.label }).click({ timeout: 15000 });
  await page.waitForTimeout(1000);
  domainResult.visible = await page.getByText(`${domain.label} Parameters`).isVisible().catch(() => false);

  const rowButtons = page.locator('main button').filter({ hasText: /^Row \d+/ });
  domainResult.rowCount = await rowButtons.count();

  if (domainResult.rowCount === 0) {
    domainResult.problems.push('No scanned rows are visible for this domain in Fairness Explorer.');
  }

  for (let i = 0; i < domainResult.rowCount; i += 1) {
    const rowButton = page.locator('main button').filter({ hasText: /^Row \d+/ }).nth(i);
    const rowCardText = await text(rowButton, 1000);
    await rowButton.click({ timeout: 10000 });

    const resultCard = page.getByText('Prediction Result').first();
    await resultCard.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText('Feature Importance (SHAP)').first().waitFor({ state: 'visible', timeout: 12000 }).catch(async () => {
      await page.waitForTimeout(1500);
    });

    const main = page.locator('main');
    const mainText = await text(main, 2000);
    const hasPrediction = /Prediction Result/.test(mainText);
    const noPrediction = /No Prediction Yet/.test(mainText);
    const errorText = compact(
      await page.locator('main .text-red-700, main .text-red-300').first().innerText({ timeout: 1000 }).catch(() => '')
    );
    const confidenceMatch = mainText.match(/([0-9]+(?:\.[0-9]+)?)%\s+Confidence/);
    const biasRiskMatch = mainText.match(/Bias Risk Score\s+([0-9]+)\/100/);
    const idMatch = mainText.match(/ID:\s+([A-Za-z0-9-]+)/);
    const explanationMatch = mainText.match(/Decision Explanation\s+(.+?)(?:Submit Feedback|Actual outcome|$)/);
    const hasFeatureImportance = /Feature Importance \(SHAP\)/.test(mainText);

    const row = {
      index: i,
      rowCardText,
      hasPrediction,
      hasFeatureImportance,
      noPrediction,
      correlationId: idMatch?.[1] ?? null,
      confidence: confidenceMatch ? Number(confidenceMatch[1]) : null,
      biasRisk: biasRiskMatch ? Number(biasRiskMatch[1]) : null,
      error: errorText || null,
      explanation: explanationMatch ? compact(explanationMatch[1]).slice(0, 500) : null,
    };

    if (!hasPrediction) {
      domainResult.problems.push(`Row ${i + 1} did not show a Prediction Result.`);
    }
    if (noPrediction) {
      domainResult.problems.push(`Row ${i + 1} stayed on No Prediction Yet.`);
    }
    if (errorText) {
      domainResult.problems.push(`Row ${i + 1} showed error: ${errorText}`);
    }
    if (hasPrediction && !row.correlationId) {
      domainResult.problems.push(`Row ${i + 1} prediction has no visible correlation ID.`);
    }
    if (hasPrediction && !hasFeatureImportance && row.explanation && /Full SHAP explanation pending/i.test(row.explanation)) {
      domainResult.problems.push(`Row ${i + 1} explanation is still SHAP-pending/fallback.`);
    }

    domainResult.rows.push(row);
  }

  domainResult.newConsoleIssues = report.console.slice(beforeConsole);
  domainResult.newRequestIssues = report.failedRequests.slice(beforeRequests);
  if (domainResult.newRequestIssues.length > 0) {
    domainResult.problems.push(`${domainResult.newRequestIssues.length} failed request(s) while testing this domain.`);
  }
  if (domainResult.newConsoleIssues.some((item) => item.type === 'error' || item.type === 'pageerror')) {
    domainResult.problems.push('Console errors were emitted while testing this domain.');
  }

  await page.screenshot({
    path: path.join(outDir, `fairness-explorer-${domain.id}.png`),
    fullPage: true,
  });

  report.domains.push(domainResult);
}

report.finishedAt = new Date().toISOString();
await fs.writeFile(path.join(outDir, 'fairness-explorer-report.json'), JSON.stringify(report, null, 2));
await browser.close();

console.log(JSON.stringify({
  report: path.join(outDir, 'fairness-explorer-report.json'),
  scan: report.scan,
  domains: report.domains.map((domain) => ({
    label: domain.label,
    rowCount: domain.rowCount,
    problems: domain.problems,
    rows: domain.rows.map((row) => ({
      row: row.index + 1,
      hasPrediction: row.hasPrediction,
      confidence: row.confidence,
      biasRisk: row.biasRisk,
      error: row.error,
      explanation: row.explanation,
    })),
  })),
}, null, 2));
