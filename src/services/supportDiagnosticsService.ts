export type SupportDiagnosticState = 'ok' | 'attention' | 'problem';

export interface SupportDiagnosticsInput {
  isOnline: boolean;
  hasCloudAccount: boolean;
  cloudSyncStatus?: 'idle' | 'syncing' | 'saved' | 'error';
  cloudSyncMessage?: string | null;
  cloudLastSyncAt?: string | null;
  aiDisabledReason?: string | null;
}

export interface SupportDiagnosticItem {
  id: 'network' | 'cloud' | 'ai';
  label: string;
  state: SupportDiagnosticState;
  summary: string;
  detail?: string;
}

export interface SupportDiagnosticsSnapshot {
  overallState: SupportDiagnosticState;
  overallSummary: string;
  items: SupportDiagnosticItem[];
}

function formatCloudStatus(status?: 'idle' | 'syncing' | 'saved' | 'error') {
  if (status === 'saved') return 'OK';
  if (status === 'syncing') return 'Arbejder';
  if (status === 'error') return 'Fejl';
  return 'Lokal';
}

function sanitizeDetail(message?: string | null) {
  if (!message) return undefined;
  return message.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function rankState(state: SupportDiagnosticState) {
  if (state === 'problem') return 3;
  if (state === 'attention') return 2;
  return 1;
}

function getOverallState(items: SupportDiagnosticItem[]): SupportDiagnosticState {
  return items.reduce<SupportDiagnosticState>((highest, item) => {
    return rankState(item.state) > rankState(highest) ? item.state : highest;
  }, 'ok');
}

export function buildSupportDiagnosticsSnapshot(input: SupportDiagnosticsInput): SupportDiagnosticsSnapshot {
  const items: SupportDiagnosticItem[] = [
    input.isOnline
      ? {
          id: 'network',
          label: 'Netvaerk',
          state: 'ok',
          summary: 'Appen har forbindelse lige nu.',
        }
      : {
          id: 'network',
          label: 'Netvaerk',
          state: 'problem',
          summary: 'Appen er offline lige nu.',
          detail: 'Nogle handlinger virker stadig, men cloud og AI kan vaere utilgaengelige.',
        },
    input.cloudSyncStatus === 'error'
      ? {
          id: 'cloud',
          label: 'Cloud',
          state: 'problem',
          summary: 'Cloud-sync har en fejl lige nu.',
          detail: sanitizeDetail(input.cloudSyncMessage) || 'Dine lokale data er stadig til stede.',
        }
      : input.cloudSyncStatus === 'syncing'
        ? {
            id: 'cloud',
            label: 'Cloud',
            state: 'attention',
            summary: 'Cloud arbejder stadig med dine data.',
            detail: sanitizeDetail(input.cloudSyncMessage),
          }
        : input.hasCloudAccount
          ? {
              id: 'cloud',
              label: 'Cloud',
              state: 'ok',
              summary: 'Cloud er tilgaengelig for denne konto.',
              detail: input.cloudLastSyncAt ? `Seneste sync: ${new Date(input.cloudLastSyncAt).toLocaleString('da-DK')}` : undefined,
            }
          : {
              id: 'cloud',
              label: 'Cloud',
              state: 'attention',
              summary: 'Appen koerer kun lokalt lige nu.',
              detail: 'Log ind, hvis du vil bruge cloud-sync mellem enheder.',
            },
    input.aiDisabledReason
      ? {
          id: 'ai',
          label: 'AI-hjaelp',
          state: input.isOnline ? 'attention' : 'problem',
          summary: 'AI-hjaelp er ikke tilgaengelig lige nu.',
          detail: sanitizeDetail(input.aiDisabledReason),
        }
      : {
          id: 'ai',
          label: 'AI-hjaelp',
          state: 'ok',
          summary: 'AI-hjaelp er tilgaengelig, naar du vil bruge den.',
        },
  ];

  const overallState = getOverallState(items);
  const overallSummary =
    overallState === 'problem'
      ? 'Der er et problem, som support boer kende.'
      : overallState === 'attention'
        ? 'Der er noget at vaere opmaerksom paa.'
        : 'Alt ser normalt ud lige nu.';

  return { overallState, overallSummary, items };
}

export function buildSupportReportText(input: SupportDiagnosticsInput & { appVersion?: string }) {
  const snapshot = buildSupportDiagnosticsSnapshot(input);

  const lines = [
    `CookMoxs version: ${input.appVersion || 'dev'}`,
    `Supportstatus: ${snapshot.overallSummary}`,
    `Netvaerk: ${input.isOnline ? 'Online' : 'Offline'}`,
    `Cloud-status: ${formatCloudStatus(input.cloudSyncStatus)}`,
    `Cloud-konto: ${input.hasCloudAccount ? 'Logget ind' : 'Kun lokal brug'}`,
    `AI-status: ${input.aiDisabledReason ? 'Midlertidigt utilgaengelig' : 'Tilgaengelig'}`,
    `Seneste cloud-sync: ${input.cloudLastSyncAt ? new Date(input.cloudLastSyncAt).toLocaleString('da-DK') : 'Ukendt'}`,
  ];

  const cloudDetail = sanitizeDetail(input.cloudSyncMessage);
  if (cloudDetail && input.cloudSyncStatus !== 'saved') {
    lines.push(`Cloud-besked: ${cloudDetail}`);
  }

  if (input.aiDisabledReason) {
    lines.push(`AI-besked: ${sanitizeDetail(input.aiDisabledReason)}`);
  }

  lines.push('Rapporten indeholder kun enkel status. Ingen opskrifter, billeder eller noter er med.');

  return lines.join('\n');
}
