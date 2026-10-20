import { ForbiddenError } from '@datenknoten/kit';

export class OnboardingRequiredError extends ForbiddenError {
  constructor() {
    super('Onboarding required', { code: 'ONBOARDING_REQUIRED' });
  }
}
