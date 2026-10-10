/** İlk giriş yönlendirmesinin adımları; her biri kullanıcının gerçek verisinden hesaplanır. */
export type OnboardingStepId = 'subject' | 'goal' | 'focus';

export interface OnboardingStep {
  id: OnboardingStepId;
  done: boolean;
}

export function onboardingSteps(input: { subjectCount: number; dailyGoalMinutes: number; totalFocusMinutes: number }): OnboardingStep[] {
  return [
    { id: 'subject', done: input.subjectCount > 0 },
    { id: 'goal', done: input.dailyGoalMinutes > 0 },
    { id: 'focus', done: input.totalFocusMinutes > 0 },
  ];
}

/** Kart, kullanıcı kapatmadıysa ve en az bir adım eksikse görünür. */
export function shouldShowOnboarding(steps: OnboardingStep[], dismissed: boolean): boolean {
  return !dismissed && steps.some((step) => !step.done);
}

const dismissKey = (userId: number) => `sl-onboarding-kapali-${userId}`;

export function readOnboardingDismissed(userId: number): boolean {
  try {
    return localStorage.getItem(dismissKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function writeOnboardingDismissed(userId: number): void {
  try {
    localStorage.setItem(dismissKey(userId), '1');
  } catch {
    // Depolama kapalıysa kart yalnızca bu oturumda gizlenir.
  }
}
