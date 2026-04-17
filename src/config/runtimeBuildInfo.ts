import { APP_BUILD_VERSION } from '../generated/buildInfo';

export type RuntimeBuildInfo = {
  release: string;
  buildId: string;
  environment: string;
  gitCommit: string | null;
  deployedAt: string | null;
};

function readImportMetaEnv(key: string): string | undefined {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
    const value = env?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

function readProcessEnv(key: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }

  const value = process.env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readEnv(...keys: string[]) {
  for (const key of keys) {
    const importMetaValue = readImportMetaEnv(key);
    if (importMetaValue) return importMetaValue;

    const processValue = readProcessEnv(key);
    if (processValue) return processValue;
  }

  return undefined;
}

function inferEnvironment() {
  const explicit = readEnv('VITE_APP_ENV', 'APP_ENV', 'NODE_ENV');
  if (explicit) return explicit;

  const mode = readImportMetaEnv('MODE');
  if (mode) return mode;

  if (readImportMetaEnv('PROD') === 'true') return 'production';
  if (readImportMetaEnv('DEV') === 'true') return 'development';

  return 'unknown';
}

export function getRuntimeBuildInfo(): RuntimeBuildInfo {
  const gitCommit = readEnv(
    'VITE_GIT_COMMIT',
    'GIT_COMMIT',
    'RENDER_GIT_COMMIT',
    'VERCEL_GIT_COMMIT_SHA',
    'CI_COMMIT_SHA',
  );

  const buildId = readEnv(
    'VITE_BUILD_ID',
    'BUILD_ID',
    'RENDER_DEPLOY_ID',
    'VERCEL_DEPLOYMENT_ID',
  ) || gitCommit || APP_BUILD_VERSION;

  return {
    release: readEnv('VITE_RELEASE', 'RELEASE_VERSION', 'npm_package_version') || APP_BUILD_VERSION,
    buildId,
    environment: inferEnvironment(),
    gitCommit: gitCommit ? gitCommit.slice(0, 40) : null,
    deployedAt: readEnv('VITE_DEPLOYED_AT', 'DEPLOYED_AT') || null,
  };
}
