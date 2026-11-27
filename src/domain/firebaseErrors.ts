type FirebaseErrorLike = { code?: unknown; message?: unknown };

function errorText(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error ?? '').toLowerCase();
  const { code, message } = error as FirebaseErrorLike;
  return `${typeof code === 'string' ? code : ''} ${typeof message === 'string' ? message : ''}`.toLowerCase().replace(/[_\s]+/g, '-');
}

/** Turn a Firebase failure into one actionable sentence for the learner. */
export function describeFirebaseSyncError(error: unknown): string {
  const text = errorText(error);
  if (text.includes('configuration-not-found') || text.includes('operation-not-allowed') || text.includes('admin-restricted-operation')) {
    return 'Enable Anonymous sign-in in Firebase Authentication.';
  }
  if (text.includes('invalid-api-key') || text.includes('api-key-not-valid') || text.includes('project-not-found')) {
    return 'The Firebase configuration does not match this project. Download google-services.json again.';
  }
  if (text.includes('app-check') || text.includes('appcheck')) {
    return 'Register this device’s App Check debug token in the Firebase project.';
  }
  if (text.includes('permission-denied') || text.includes('insufficient permissions')) {
    return 'Check the Firestore rules and this device’s App Check registration.';
  }
  if (text.includes('unavailable') || text.includes('network-request-failed') || text.includes('network error')) {
    return 'Check your internet connection and try again.';
  }
  return 'Check Anonymous Auth, Firestore and App Check in the Firebase console.';
}
