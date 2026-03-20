import { createElement } from 'react';
import type { ComponentProps } from 'react';
import { tw } from './tw';

type AnyProps = Record<string, unknown> & {
  className?: string;
  style?: unknown;
  contentContainerClassName?: string;
  contentContainerStyle?: unknown;
};

function mergeStyle(existing: unknown, extra: unknown) {
  if (existing == null) return extra;
  if (Array.isArray(existing)) return [...existing, extra];
  return [existing, extra];
}

function transformProps(props: AnyProps) {
  const next: AnyProps = { ...props };

  const className = typeof next.className === 'string' ? next.className : undefined;
  if (className) {
    next.style = mergeStyle(next.style, tw(className));
    delete next.className;
  }

  const containerClassName =
    typeof next.contentContainerClassName === 'string' ? next.contentContainerClassName : undefined;
  if (containerClassName) {
    next.contentContainerStyle = mergeStyle(
      next.contentContainerStyle,
      tw(containerClassName),
    );
    delete next.contentContainerClassName;
  }

  return next;
}

export function jsx(type: unknown, props: AnyProps, key: string | undefined) {
  const finalProps = transformProps(props ?? ({} as AnyProps));
  if (key != null) finalProps.key = key;
  return createElement(type as never, finalProps as never);
}

export const jsxs = jsx;

