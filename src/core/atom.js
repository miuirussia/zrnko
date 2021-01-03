// @flow
/* eslint-disable no-redeclare */
import type { Getter, Setter, Atom, WritableAtom, WithInitialValue, PrimitiveAtom } from 'core/types';

let keyCount = 0;

declare export function atom<V, U>(
  read: (get: Getter) => V | Promise<V>,
  write: (get: Getter, set: Setter, update: U) => void | Promise<void>
): WritableAtom<V, U>;
declare export function atom<V, U>(
  read: (...props: Array<any>) => any,
  write: (get: Getter, set: Setter, update: U) => void | Promise<void>
): void;
declare export function atom<V, U>(
  read: V,
  write: (get: Getter, set: Setter, update: U) => void | Promise<void>
): WritableAtom<V, U> & WithInitialValue<V>;
declare export function atom<V, U = void>(read: (get: Getter) => V | Promise<V>): Atom<V, U>;
declare export function atom<V, U = any>(read: (...props: Array<any>) => any): void;
declare export function atom<V, U = void>(initialValue: V): PrimitiveAtom<V> & WithInitialValue<V>;

export function atom<V, U>(
  read: V | ((get: Getter) => V | Promise<V>),
  write?: (get: Getter, set: Setter, update: U) => void | Promise<void>
): any {
  const key = `atom${++keyCount}`;
  const config = (({
    toString: () => key,
  }: any): WritableAtom<V, U> & { init?: V });

  if (typeof read === 'function') {
    config.read = ((read: any): (get: Getter) => V | Promise<V>);
  } else {
    config.init = read;
    config.read = (get: Getter) => get((config: any));
    config.write = (get: Getter, set: Setter, update: U) => {
      set((config: any), typeof update === 'function' ? (update: any)(get((config: any))) : update);
    };
  }

  if (write) {
    config.write = write;
  }

  return config;
}
