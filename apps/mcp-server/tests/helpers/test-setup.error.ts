import { AppError } from '@datenknoten/kit';

// The integration fixture could not build the state a test needs.
export class TestSetupError extends AppError {}
