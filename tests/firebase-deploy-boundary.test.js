import { describe, expect, it } from 'vitest';
import { assertDeployBoundary } from '../scripts/firebase-deploy-boundary.mjs';

describe('Firebase deploy boundary', () => {
  it('requires an explicitly approved local target', () => {
    expect(() => assertDeployBoundary({ targetProject:'user-project', approvedProject:'' })).toThrow(/No local Firebase deploy target/);
  });

  it('rejects a CLI project that differs from the approved target', () => {
    expect(() => assertDeployBoundary({ targetProject:'wrong-project', approvedProject:'user-project' })).toThrow(/mismatch/);
  });

  it('rejects locally blocked private projects even when explicitly approved', () => {
    expect(() => assertDeployBoundary({
      targetProject:'private-production',
      approvedProject:'private-production',
      blockedProjects:['private-production'],
    })).toThrow(/blocked/);
  });

  it('accepts only the same explicit, non-blocked project', () => {
    expect(assertDeployBoundary({ targetProject:'user-project', approvedProject:'user-project', blockedProjects:['private-production'] })).toBe('user-project');
  });
});
