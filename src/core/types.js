// @flow

export type SetStateAction<V> = V | ((prev: V) => V);
export type Getter = <V>(atom: Atom<V>) => V;
export type Setter = <V, U>(atom: WritableAtom<V, U>, update: U) => void;

export type Scope = symbol | string | number;

export type Atom<V> = {
  toString: () => string,
  debugLabel?: string,
  scope?: Scope,
  read: (get: Getter) => V | Promise<V>,
};

export type WritableAtom<V, U> = Atom<V> & {
  write: (get: Getter, set: Setter, update: U) => void | Promise<void>,
};

export type WithInitialValue<V> = {
  init: V,
};

export type PrimitiveAtom<V> = WritableAtom<V, SetStateAction<V>>;

export type AnyAtom = Atom<mixed>;
export type AnyWritableAtom = WritableAtom<mixed, mixed>;
