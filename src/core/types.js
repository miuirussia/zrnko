// @flow

export type SetStateAction<V> = V | ((prev: V) => V);
export type Getter = <V>(atom: Atom<V>) => V;
export type Setter = <V, U>(atom: WritableAtom<V, U>, update: U) => void;

export type Scope = symbol | string | number;

export type AtomBase = {
  toString: () => string,
  debugLabel?: string,
  scope?: Scope,
};

export type Atom<V> = AtomBase & {
  read: (get: Getter) => V,
};

export type AsyncAtom<V> = AtomBase & {
  read: (get: Getter) => Promise<V>,
};

export type WritableAtom<V, U> = Atom<V> & {
  write: (get: Getter, set: Setter, update: U) => void,
};

export type AsyncWritableAtom<V, U> = AsyncAtom<V> & {
  write: (get: Getter, set: Setter, update: U) => Promise<void>,
};

export type WithInitialValue<V> = {
  init: V,
};

export type PrimitiveAtom<V> = WritableAtom<V, SetStateAction<V>>;

export type AnyAtom = Atom<mixed>;
export type AnyWritableAtom = WritableAtom<mixed, mixed>;
