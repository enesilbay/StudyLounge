import { describe, expect, it } from 'vitest';
import { onboardingSteps, shouldShowOnboarding } from './onboarding';

describe('onboarding', () => {
  it('marks each step from real data', () => {
    expect(onboardingSteps({ subjectCount: 0, dailyGoalMinutes: 0, totalFocusMinutes: 0 }).map((s) => s.done)).toEqual([false, false, false]);
    expect(onboardingSteps({ subjectCount: 2, dailyGoalMinutes: 120, totalFocusMinutes: 0 }).map((s) => s.done)).toEqual([true, true, false]);
  });

  it('hides the card when everything is done or the user closed it', () => {
    const fresh = onboardingSteps({ subjectCount: 0, dailyGoalMinutes: 0, totalFocusMinutes: 0 });
    const finished = onboardingSteps({ subjectCount: 1, dailyGoalMinutes: 60, totalFocusMinutes: 25 });
    expect(shouldShowOnboarding(fresh, false)).toBe(true);
    expect(shouldShowOnboarding(fresh, true)).toBe(false);
    expect(shouldShowOnboarding(finished, false)).toBe(false);
  });
});
