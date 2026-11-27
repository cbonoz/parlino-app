import { describeFirebaseSyncError } from '../src/domain/firebaseErrors';

describe('Firebase sync error hints', () => {
  it('points at anonymous auth when the provider is missing', () => {
    expect(describeFirebaseSyncError({ code: 'auth/configuration-not-found' })).toContain('Anonymous sign-in');
    expect(describeFirebaseSyncError({ code: 'auth/operation-not-allowed' })).toContain('Anonymous sign-in');
    expect(describeFirebaseSyncError({ message: 'CONFIGURATION_NOT_FOUND' })).toContain('Anonymous sign-in');
  });

  it('distinguishes App Check, rules and network failures', () => {
    expect(describeFirebaseSyncError({ code: 'firebase-app-check/unknown' })).toContain('App Check');
    expect(describeFirebaseSyncError({ code: 'firestore/permission-denied' })).toContain('Firestore rules');
    expect(describeFirebaseSyncError({ code: 'auth/network-request-failed' })).toContain('internet connection');
  });

  it('falls back to a generic console pointer', () => {
    expect(describeFirebaseSyncError(new Error('something odd'))).toContain('Firebase console');
    expect(describeFirebaseSyncError(undefined)).toContain('Firebase console');
  });
});
