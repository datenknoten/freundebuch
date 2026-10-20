import { OPEN_MODE_CONFIGS } from './config.js';
import type { OpenModeConfig } from './types.js';

function matchesRoute(config: OpenModeConfig, pathname: string) {
  if (typeof config.routeMatch === 'string') {
    return pathname === config.routeMatch;
  }
  return config.routeMatch.test(pathname) === true && pathname.endsWith('/new') === false;
}

export function findOpenModeConfig(pathname: string) {
  return OPEN_MODE_CONFIGS.find((config) => matchesRoute(config, pathname));
}
