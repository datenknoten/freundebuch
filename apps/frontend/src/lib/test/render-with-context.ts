import { render } from '@testing-library/svelte';
import type { Component, ComponentProps } from 'svelte';
import { type AppContext, createAppContextMap } from '$lib/app-context.js';
import { createTestAppContext } from './test-app-context.js';

// biome-ignore lint/suspicious/noExplicitAny: every component, as in the constraint of `render` itself
type AnyComponent = Component<any, any>;

export interface RenderWithContextOptions<C extends AnyComponent> {
  props: ComponentProps<C>;
  /** Defaults to `createTestAppContext()`. */
  context?: AppContext;
}

/** Renders a component the way the root layout would: with an AppContext above it. */
export function renderWithContext<C extends AnyComponent>(
  component: C,
  options: RenderWithContextOptions<C>,
) {
  const context = options.context ?? createTestAppContext();
  return render<AnyComponent>(component, {
    props: options.props,
    context: createAppContextMap(context),
  });
}
