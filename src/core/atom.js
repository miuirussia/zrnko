// @flow
/* eslint-disable no-redeclare */
import type {
  Getter,
  Setter,
  Atom,
  AsyncAtom,
  WritableAtom,
  AsyncWritableAtom,
  WithInitialValue,
  PrimitiveAtom,
} from 'core/types';

let keyCount = 0;

declare export function atom<-V, -U>(
  read: ({| get: Getter |}) => Promise<V>,
  write: ({| get: Getter, set: Setter, update: U |}) => Promise<void>
): AsyncWritableAtom<V, U>;
declare export function atom<-V, -U>(
  read: ({| get: Getter |}) => V,
  write: ({| get: Getter, set: Setter, update: U |}) => void
): WritableAtom<V, U>;
declare export function atom<-V, -U>(
  read: (...props: Array<any>) => any,
  write: ({| get: Getter, set: Setter, update: U |}) => void | Promise<void>
): void;
declare export function atom<-V, -U>(
  read: V,
  write: ({| get: Getter, set: Setter, update: U |}) => Promise<void>
): AsyncWritableAtom<V, U> & WithInitialValue<V>;
declare export function atom<-V, -U>(
  read: V,
  write: ({| get: Getter, set: Setter, update: U |}) => void
): WritableAtom<V, U> & WithInitialValue<V>;
declare export function atom<-V, -U = void>(read: ({| get: Getter |}) => Promise<V>): AsyncAtom<V>;
declare export function atom<-V, -U = void>(read: ({| get: Getter |}) => V): Atom<V>;
declare export function atom<-V, -U>(read: (...props: Array<any>) => any): void;
declare export function atom<-V, -U = void>(initialValue: V): PrimitiveAtom<V> & WithInitialValue<V>;

export function atom<V, U>(
  read: V | (({| get: Getter |}) => V | Promise<V>),
  write?: ({| get: Getter, set: Setter, update: U |}) => void | Promise<void>
): any {
  const key = `atom${++keyCount}`;
  const config = (({
    toString: () => key,
  }: any): WritableAtom<V, U> & { init?: V });

  if (typeof read === 'function') {
    config.read = (read: any);
  } else {
    config.init = read;
    config.read = ({ get }) => get((config: any));
    config.write = ({ get, set, update }) => {
      set((config: any), typeof update === 'function' ? (update: any)(get((config: any))) : update);
    };
  }

  if (write) {
    config.write = (write: any);
  }

  return config;
}
