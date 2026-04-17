import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, appendFile, mkdir, writeFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';
import { chromium, devices } from 'playwright';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_TIMEOUT_MS = 90_000;
const ROOT_DIR = process.cwd();
const SESSION_ROOT = path.join(ROOT_DIR, '.dev-observe', 'sessions');
const INTERESTING_API_PATTERNS = ['/api/ai/', '/api/parse-direct', '/api/fetch-url'];

function parseArgs(argv) {
  const options = {
    attach: false,
    baseUrl: DEFAULT_BASE_URL,
    profile: 'mobile',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--attach') {
      options.attach = true;
      continue;
    }

    if (arg === '--desktop') {
      options.profile = 'desktop';
      continue;
    }

    if (arg === '--mobile') {
      options.profile = 'mobile';
      continue;
    }

    if (arg === '--base-url') {
      options.baseUrl = argv[index + 1] || DEFAULT_BASE_URL;
      index += 1;
      continue;
    }

    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length) || DEFAULT_BASE_URL;
    }
  }

  return options;
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sanitizeFileName(input) {
  return input
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'event';
}

async function appendNdjson(filePath, payload) {
  await appendFile(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

async function safeAppend(filePath, payload) {
  try {
    await appendNdjson(filePath, payload);
  } catch {
    // Ignore log write failures inside event handlers.
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function canReach(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, (response) => {
      response.resume();
      resolve(true);
    });

    request.setTimeout(2_000, () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
  });
}

async function waitForUrl(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(url)) return true;
    await sleep(750);
  }
  return false;
}

function startDevServer(logFilePath) {
  const logStream = createWriteStream(logFilePath, { flags: 'a' });
  const child = spawn('npm', ['run', 'dev'], {
    cwd: ROOT_DIR,
    env: { ...process.env, FORCE_COLOR: '0' },
    shell: true,
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
    logStream.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
    logStream.write(chunk);
  });

  child.on('exit', (code, signal) => {
    logStream.write(`\n[dev-observe] server process exited code=${code} signal=${signal}\n`);
    logStream.end();
  });

  return child;
}

function isInterestingApi(url) {
  return INTERESTING_API_PATTERNS.some((pattern) => url.includes(pattern));
}

async function captureScreenshot(page, directory, label) {
  const filename = `${stamp()}-${sanitizeFileName(label)}.png`;
  const screenshotPath = path.join(directory, filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

async function safeScreenshot(page, directory, label) {
  try {
    if (!page || page.isClosed()) return null;
    return await captureScreenshot(page, directory, label);
  } catch {
    return null;
  }
}

function createInteractiveStop(page, browser, serverProcess) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    let done = false;

    const finish = (reason) => {
      if (done) return;
      done = true;
      rl.close();
      resolve(reason);
    };

    rl.question('\nTryk Enter for at stoppe capture og gemme sessionen...\n', () => finish('user'));
    page.on('close', () => finish('page_closed'));
    browser.on('disconnected', () => finish('browser_disconnected'));
    if (serverProcess) serverProcess.on('exit', () => finish('server_exited'));
  });
}

function summarizeError(error) {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sessionId = stamp();
  const sessionDir = path.join(SESSION_ROOT, sessionId);
  const screenshotsDir = path.join(sessionDir, 'screenshots');
  const videoDir = path.join(sessionDir, 'video');
  const eventsFile = path.join(sessionDir, 'events.ndjson');
  const metadataFile = path.join(sessionDir, 'metadata.json');
  const serverLogFile = path.join(sessionDir, 'server.log');
  const traceFile = path.join(sessionDir, 'trace.zip');

  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(videoDir, { recursive: true });

  const metadata = {
    sessionId,
    baseUrl: options.baseUrl,
    profile: options.profile,
    startedAt: new Date().toISOString(),
    restorePointTag: 'restore/dev-session-capture-2026-04-17',
    startedServer: false,
    stopReason: null,
  };

  let serverProcess = null;
  let browser = null;
  let context = null;
  let page = null;
  const trackedRequests = new Map();
  let requestSequence = 0;

  try {
    if (!(await canReach(options.baseUrl))) {
      if (options.attach) {
        throw new Error(`Ingen app svarer på ${options.baseUrl} i attach-mode.`);
      }

      metadata.startedServer = true;
      serverProcess = startDevServer(serverLogFile);

      const isUp = await waitForUrl(options.baseUrl, DEFAULT_TIMEOUT_MS);
      if (!isUp) {
        throw new Error(`Appen svarede ikke på ${options.baseUrl} inden for ${DEFAULT_TIMEOUT_MS / 1000}s.`);
      }
    }

    const contextOptions = options.profile === 'desktop'
      ? {
          viewport: { width: 1440, height: 960 },
          recordVideo: { dir: videoDir, size: { width: 1440, height: 960 } },
        }
      : {
          ...devices['Pixel 7'],
          recordVideo: { dir: videoDir, size: { width: 412, height: 915 } },
        };

    browser = await chromium.launch({ headless: false });
    context = await browser.newContext(contextOptions);
    await context.tracing.start({
      title: `dev-observe-${sessionId}`,
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    page = await context.newPage();

    page.on('console', async (message) => {
      await safeAppend(eventsFile, {
        ts: new Date().toISOString(),
        type: 'console',
        level: message.type(),
        text: message.text(),
        location: message.location(),
      });
      if (message.type() === 'error' || message.type() === 'warning') {
        await safeScreenshot(page, screenshotsDir, `console-${message.type()}`);
      }
    });

    page.on('pageerror', async (error) => {
      await safeAppend(eventsFile, {
        ts: new Date().toISOString(),
        type: 'pageerror',
        message: summarizeError(error),
      });
      await safeScreenshot(page, screenshotsDir, 'pageerror');
    });

    page.on('request', async (request) => {
      if (!isInterestingApi(request.url())) return;
      requestSequence += 1;
      trackedRequests.set(request, {
        id: requestSequence,
        url: request.url(),
        method: request.method(),
        startedAt: Date.now(),
      });
      await safeAppend(eventsFile, {
        ts: new Date().toISOString(),
        type: 'api_request_started',
        id: requestSequence,
        method: request.method(),
        url: request.url(),
      });
      await safeScreenshot(page, screenshotsDir, `before-${requestSequence}-${request.method()}-${new URL(request.url()).pathname}`);
    });

    page.on('requestfailed', async (request) => {
      await safeAppend(eventsFile, {
        ts: new Date().toISOString(),
        type: 'request_failed',
        method: request.method(),
        url: request.url(),
        errorText: request.failure()?.errorText || 'unknown',
      });
      await safeScreenshot(page, screenshotsDir, `request-failed-${request.method()}-${new URL(request.url()).pathname}`);
    });

    page.on('response', async (response) => {
      const request = response.request();
      const tracked = trackedRequests.get(request);
      const status = response.status();

      if (tracked) {
        await sleep(900);
        await safeScreenshot(page, screenshotsDir, `after-${tracked.id}-${request.method()}-${new URL(request.url()).pathname}-${status}`);
        await safeAppend(eventsFile, {
          ts: new Date().toISOString(),
          type: 'api_request_finished',
          id: tracked.id,
          method: tracked.method,
          url: tracked.url,
          status,
          durationMs: Date.now() - tracked.startedAt,
        });
        trackedRequests.delete(request);
      }

      if (status >= 400) {
        await safeAppend(eventsFile, {
          ts: new Date().toISOString(),
          type: 'http_error',
          method: request.method(),
          url: request.url(),
          status,
        });
        await safeScreenshot(page, screenshotsDir, `http-${status}-${request.method()}-${new URL(request.url()).pathname}`);
      }
    });

    await page.goto(options.baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await safeScreenshot(page, screenshotsDir, 'initial');

    console.log(`\n[dev-observe] Session: ${sessionId}`);
    console.log(`[dev-observe] Artifacts: ${sessionDir}`);
    console.log(`[dev-observe] Base URL: ${options.baseUrl}`);
    console.log(`[dev-observe] Profile: ${options.profile}`);

    metadata.stopReason = await createInteractiveStop(page, browser, serverProcess);

    if (!page.isClosed()) {
      await safeScreenshot(page, screenshotsDir, 'final');
    }
  } catch (error) {
    metadata.stopReason = 'error';
    metadata.error = summarizeError(error);
    if (page && !page.isClosed()) {
      await safeScreenshot(page, screenshotsDir, 'fatal');
    }
    console.error(`[dev-observe] ${metadata.error}`);
  } finally {
    metadata.endedAt = new Date().toISOString();

    if (context) {
      try {
        await context.tracing.stop({ path: traceFile });
      } catch (error) {
        metadata.traceStopError = summarizeError(error);
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors.
      }
    }

    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }

    metadata.traceExists = await pathExists(traceFile);
    metadata.videoDirectory = await pathExists(videoDir) ? videoDir : null;
    await writeFile(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

    console.log(`[dev-observe] Metadata: ${metadataFile}`);
    console.log(`[dev-observe] Trace: ${traceFile}`);
    console.log(`[dev-observe] Screenshots: ${screenshotsDir}`);
    console.log('[dev-observe] Færdig.');

    if (metadata.error) {
      process.exitCode = 1;
    }
  }
}

await main();
