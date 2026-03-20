import type { DangerDSLType } from 'danger';

declare global {
  const danger: DangerDSLType;
  function fail(message: string): void;
  function warn(message: string): void;
  function message(message: string): void;
  function markdown(message: string): void;
}
