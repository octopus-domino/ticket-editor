import { useSyncExternalStore, useCallback } from 'react';

export type Listener = () => void;

export class SimpleStore<T> {
  private state: T;
  private listeners = new Set<Listener>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState = (): T => this.state;

  setState = (nextState: T | ((prev: T) => T)): void => {
    this.state =
      typeof nextState === 'function'
        ? (nextState as (prev: T) => T)(this.state)
        : nextState;
    this.listeners.forEach((l) => l());
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export function useStore<T, S>(store: SimpleStore<T>, selector: (state: T) => S): S {
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}