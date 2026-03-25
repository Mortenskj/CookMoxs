function extractAuthErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return null;
}

export function normalizeAuthError(error: unknown, fallbackMessage = 'Login mislykkedes. Proev igen om et oejeblik.'): string {
  const code = extractAuthErrorCode(error);

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Login er ikke tilladt fra dette domaene endnu. Tilfoej appens adresse under Authorized domains i Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'Google-login er ikke slaaet til i Firebase Authentication endnu.';
    case 'auth/popup-blocked':
      return 'Login-popup blev blokeret af browseren eller appen. Tillad popup-vinduet og proev igen.';
    case 'auth/popup-closed-by-user':
      return 'Login-vinduet blev lukket, foer login blev gennemfoert.';
    case 'auth/network-request-failed':
      return 'Login kunne ikke fuldfoeres paa grund af netvaerksfejl.';
    case 'auth/cancelled-popup-request':
      return 'Et andet loginvindue var allerede i gang. Proev igen.';
    default:
      return fallbackMessage;
  }
}
