import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const appUrl = process.env.AUDIT_APP_URL || 'http://127.0.0.1:5173/';
const outDir = path.resolve(process.cwd(), 'audit-output');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const tabs = [
  'Dashboard',
  'Hiring Prediction',
  'Social Recommend',
  'Datasets & Models',
  'Bias Detection',
  'Fairness Explorer',
  'Mitigation Lab',
  'Reports & Audit',
  'Settings',
];

const destructiveTexts = /delete|remove|sign out/i;
const slowTexts = /new scan|run full bias scan|apply selected technique/i;

function cleanName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function visibleText(locator) {
  return (await locator.innerText({ timeout: 1000 }).catch(() => '')).replace(/\s+/g, ' ').trim();
}

async function clickAndRecord(locator, label, result, options = {}) {
  try {
    await locator.click({ timeout: options.timeout ?? 4000 });
    result.clicked.push(label);
    await options.page?.waitForTimeout(options.pause ?? 300);
  } catch (error) {
    result.clickFailures.push({ label, error: String(error.message || error).slice(0, 400) });
  }
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
  tabs: [],
  console: [],
  failedRequests: [],
  dialogs: [],
};

page.on('console', (msg) => {
  const type = msg.type();
  if (['error', 'warning'].includes(type)) {
    report.console.push({ type, text: msg.text().slice(0, 1000) });
  }
});

page.on('pageerror', (error) => {
  report.console.push({ type: 'pageerror', text: String(error.message || error).slice(0, 1000) });
});

page.on('response', (response) => {
  const status = response.status();
  if (status >= 400) {
    report.failedRequests.push({ status, url: response.url() });
  }
});

page.on('requestfailed', (request) => {
  report.failedRequests.push({ status: 'failed', url: request.url(), error: request.failure()?.errorText });
});

page.on('dialog', async (dialog) => {
  report.dialogs.push({ type: dialog.type(), message: dialog.message().slice(0, 500) });
  if (/delete|older than 2 hours/i.test(dialog.message())) {
    await dialog.dismiss();
  } else {
    await dialog.accept().catch(() => dialog.dismiss());
  }
});

await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, '00-home.png'), fullPage: true });

// Top bar checks.
const search = page.getByPlaceholder(/search metrics/i);
await search.fill('fairness');
await search.clear();

const signup = page.getByRole('button', { name: /sign up/i });
if (await signup.isVisible().catch(() => false)) {
  await signup.click();
  await page.getByPlaceholder('Name').fill('Local Auditor');
  await page.getByPlaceholder('Email').fill('auditor@example.local');
  await page.getByRole('button', { name: /save profile/i }).click();
  await page.waitForTimeout(500);
}

for (const tab of tabs) {
  const result = {
    name: tab,
    ok: true,
    heading: '',
    clicked: [],
    clickFailures: [],
    emptyStates: [],
    screenshot: `${cleanName(tab)}.png`,
  };

  const beforeConsole = report.console.length;
  const beforeRequests = report.failedRequests.length;

  await page.getByRole('button', { name: tab }).click({ timeout: 10000 }).catch(async () => {
    await page.getByText(tab, { exact: true }).click({ timeout: 10000 });
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1000);

  result.heading = await visibleText(page.locator('main h1, main h2').first());
  const mainText = await visibleText(page.locator('main'));
  if (/no .*data|no .*prediction|failed|error|n\/a\/100/i.test(mainText)) {
    result.emptyStates.push(mainText.slice(0, 1000));
  }

  const buttons = page.locator('main button:visible');
  const count = Math.min(await buttons.count(), 18);
  const labels = [];
  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    const label = (await visibleText(button)) || (await button.getAttribute('title').catch(() => '')) || `button-${i}`;
    labels.push(label);
  }

  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (!label || slowTexts.test(label)) continue;
    const button = page.locator('main button:visible').filter({ hasText: label }).first();
    const target = (await button.count()) ? button : page.locator('main button:visible').nth(i);
    await clickAndRecord(target, label, result, {
      page,
      timeout: destructiveTexts.test(label) ? 2000 : 4000,
      pause: 250,
    });
  }

  await page.screenshot({ path: path.join(outDir, result.screenshot), fullPage: true });

  result.newConsoleIssues = report.console.slice(beforeConsole);
  result.newRequestIssues = report.failedRequests.slice(beforeRequests);
  result.ok = result.clickFailures.length === 0
    && result.newConsoleIssues.filter((item) => item.type === 'error' || item.type === 'pageerror').length === 0
    && result.newRequestIssues.length === 0;
  report.tabs.push(result);
}

report.finishedAt = new Date().toISOString();
await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();

console.log(JSON.stringify({
  report: path.join(outDir, 'report.json'),
  screenshots: outDir,
  tabSummary: report.tabs.map((tab) => ({
    name: tab.name,
    ok: tab.ok,
    clickFailures: tab.clickFailures.length,
    requestIssues: tab.newRequestIssues.length,
    consoleIssues: tab.newConsoleIssues.length,
    emptyStates: tab.emptyStates.length,
  })),
}, null, 2));
