// @flow
import type { AnyAtom, AnyWritableAtom, Optional, WithInitialValue } from 'core/types';
import { unsafeCoerce } from 'core/utils';

type Version = number;
type ReadDependencies = Map<AnyAtom<any>, Version>;

export type AtomState<V> = {|
  readError?: Error,
  readPromise?: Promise<void>,
  writePromise?: Promise<void>,
  value?: V,
  version: Version,
  dependencies: ReadDependencies,
|};

type AtomStateMap = WeakMap<AnyAtom<any>, AtomState<any>>;
type DependentsMap = Map<AnyAtom<any>, Set<AnyAtom<any> | symbol>>;
type InProgressMap = Map<AnyAtom<any>, AtomState<any>>;

type UpdateState = (updater: (prev: State) => State) => void;

export type State = {|
  atomStateMap: AtomStateMap,
  dependents: DependentsMap,
  inProgress: InProgressMap,
|};

export const createStore = (initialValues?: Iterable<[AnyAtom<any>, any]>): State => {
  const state: State = {
    atomStateMap: new WeakMap(),
    dependents: new Map(),
    inProgress: new Map(),
  };

  if (initialValues) {
    for (const [atom, value] of initialValues) {
      const atomState = { value: value, version: 0, dependencies: new Map() };
      if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        Object.freeze(atomState);
      }
      state.atomStateMap.set(atom, atomState);
    }
  }

  return state;
};

const getAtomState = <V>(state: State, atom: AnyAtom<V>): Optional<AtomState<V>> =>
  state.inProgress.get(atom) || state.atomStateMap.get(atom);

const syncProgress = (state: State, copyState: State): State => {
  if (state.inProgress.size && typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    console.warn('[IMPOSSIBLE] inProgress not empty');
  }
  return {
    ...state,
    inProgress: copyState.inProgress,
  };
};

const createNextAtomState = <V>(state: State, atom: AnyAtom<V>): [AtomState<V>, State] => {
  let atomState = getAtomState(state, atom);
  if (atomState) {
    atomState = { ...atomState };
  } else {
    atomState = (({ version: 0, dependencies: new Map() }: any): AtomState<V>);
    if ('init' in atom) {
      atomState.value = unsafeCoerce<AnyAtom<V> & WithInitialValue<V>>(atom).init;
    }
  }

  const nextState = {
    ...state,
    inProgress: new Map(state.inProgress).set(atom, atomState),
  };

  return [atomState, nextState];
};

const replaceDependencies = <V>(state: State, atomState: AtomState<V>, dependencies: Set<AnyAtom<any>>): void => {
  atomState.dependencies = new Map(
    Array.from(dependencies).map(atom => {
      const s = getAtomState(state, atom);

      return [atom, s ? s.version : 0];
    })
  );
};

const setAtomValue = <V>(
  state: State,
  atom: AnyAtom<V>,
  value: V,
  dependencies?: Set<AnyAtom<any>>,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = createNextAtomState(state, atom);

  if (promise && promise !== atomState.readPromise) {
    return state;
  }

  delete atomState.readError;
  delete atomState.readPromise;

  atomState.value = value;
  atomState.version++;

  dependencies && replaceDependencies(nextState, atomState, dependencies);

  return nextState;
};

const setAtomReadError = <V>(
  state: State,
  atom: AnyAtom<V>,
  error: Error,
  dependencies: Set<AnyAtom<any>>,
  promise?: Promise<void>
): State => {
  const [atomState, nextState] = createNextAtomState(state, atom);

  if (promise && promise !== atomState.readPromise) {
    return state;
  }

  delete atomState.readPromise;

  atomState.readError = error;
  atomState.version++;

  replaceDependencies(nextState, atomState, dependencies);

  return nextState;
};

const setAtomReadPromise = <V>(
  state: State,
  atom: AnyAtom<V>,
  promise: Promise<void>,
  dependencies: Set<AnyAtom<any>>
): State => {
  const [atomState, nextState] = createNextAtomState(state, atom);

  atomState.readPromise = promise;
  atomState.version++;

  replaceDependencies(nextState, atomState, dependencies);

  return nextState;
};

const setAtomWritePromise = <V>(state: State, atom: AnyAtom<V>, promise?: Promise<void>): State => {
  const [atomState, nextState] = createNextAtomState(state, atom);

  if (promise) {
    atomState.writePromise = promise;
  } else {
    delete atomState.writePromise;
  }
  atomState.version++;

  return nextState;
};

const readAtomState = <V>(
  state: State,
  updateState: UpdateState,
  atom: AnyAtom<V>,
  options?: {| force: boolean |} = { force: false }
): [AtomState<V>, State] => {
  if (!options.force) {
    const atomState = getAtomState(state, atom);
    if (
      atomState &&
      Array.from(atomState.dependencies.entries()).every(([atom, version]) => {
        const s = getAtomState(state, atom);

        return (s ? s.version : undefined) === version;
      })
    ) {
      return [atomState, state];
    }
  }

  let asyncState = { ...state, inProgress: new Map() };
  let isSync = true;
  let nextState = state;
  let error: Optional<Error>;
  let promise: Optional<Promise<void>>;
  let value: Optional<V> = undefined;
  const dependencies = new Set<AnyAtom<any>>();

  try {
    const promiseOrValue = atom.read({
      get: (a: AnyAtom<any>) => {
        dependencies.add(a);
        if (a === atom) {
          const aState = getAtomState(nextState, a);
          if (aState) {
            if (aState.readPromise) {
              throw aState.readPromise;
            }

            if (aState.value != null) {
              return aState.value;
            }
          }

          if ('init' in a) {
            return unsafeCoerce<AnyAtom<any> & WithInitialValue<any>>(a).init;
          }
        } else {
          let aState: AtomState<any>;
          if (isSync) {
            [aState, nextState] = readAtomState(nextState, updateState, a);
          } else {
            [aState, asyncState] = readAtomState(asyncState, updateState, a);
          }

          if (aState.readError) {
            throw aState.readError;
          }

          if (aState.readPromise) {
            throw aState.readPromise;
          }

          if (aState.value != null) {
            return aState.value;
          }
        }

        throw new Error('no atom init');
      },
    });

    if (promiseOrValue instanceof Promise) {
      promise = promiseOrValue
        .then(value => {
          updateState(prev => setAtomValue(syncProgress(prev, asyncState), atom, value, dependencies, promise));
        })
        .catch(e => {
          const error = e instanceof Error ? e : new Error(e);

          updateState(prev => setAtomReadError(syncProgress(prev, asyncState), atom, error, dependencies, promise));
        });
    } else {
      value = promiseOrValue;
    }
  } catch (promiseOrError) {
    if (promiseOrError instanceof Promise) {
      promise = promiseOrError.then(() => {
        updateState(prevState => {
          const [, nextNextState] = readAtomState(prevState, updateState, atom, { force: true });
          if (nextNextState.inProgress.size) {
            return nextNextState;
          }
          return prevState;
        });
      });
    } else if (promiseOrError instanceof Error) {
      error = promiseOrError;
    } else {
      error = new Error(promiseOrError);
    }
  }

  if (error) {
    nextState = setAtomReadError(nextState, atom, error, dependencies);
  } else if (promise) {
    nextState = setAtomReadPromise(nextState, atom, promise, dependencies);
  } else if (value != null) {
    nextState = setAtomValue(nextState, atom, value, dependencies);
  }

  isSync = false;

  return [unsafeCoerce<AtomState<V>>(getAtomState(nextState, atom)), nextState];
};

export const readAtom = <V>(state: State, updateState: UpdateState, readingAtom: AnyAtom<V>): AtomState<V> => {
  const [atomState, nextState] = readAtomState(state, updateState, readingAtom);

  nextState.inProgress.forEach((atomState, atom) => {
    state.inProgress.set(atom, atomState);
  });

  return atomState;
};

export const addAtom = (state: State, addingAtom: AnyAtom<any>, useId: symbol): void => {
  const dependents = state.dependents.get(addingAtom);
  if (dependents) {
    dependents.add(useId);
  } else {
    state.dependents.set(addingAtom, new Set([useId]));
  }
};

export const removeAtom = (state: State, deletingAtom: AnyAtom<any>, useId: symbol): void => {
  const remove = (atom: AnyAtom<any>, dependent: AnyAtom<any> | symbol) => {
    const dependents = state.dependents.get(atom);
    if (!dependents) {
      return;
    }
    dependents.delete(dependent);
    if (!dependents.size) {
      state.dependents.delete(atom);
      const atomState = getAtomState(state, atom);
      if (atomState) {
        if (atomState.readPromise && typeof process === 'object' && process.env.NODE_ENV !== 'production') {
          console.warn('deleting atomState with read promise', atom);
        }

        atomState.dependencies.forEach((_, a) => {
          remove(a, atom);
        });
      } else if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        console.warn('atomState not defined', atom);
      }
    }
  };

  remove(deletingAtom, useId);
};

const updateDependentsState = <V>(state: State, updateState: UpdateState, atom: AnyAtom<V>): State => {
  const dependents = state.dependents.get(atom);
  if (!dependents) {
    return state;
  }

  let nextState = state;
  dependents.forEach(dependent => {
    if (dependent === atom || typeof dependent === 'symbol' || !getAtomState(nextState, dependent)) {
      return;
    }

    const [dependentState, nextNextState] = readAtomState(nextState, updateState, dependent, { force: true });
    const promise = dependentState.readPromise;
    if (promise) {
      promise.then(() => {
        updateState(prev => updateDependentsState(prev, updateState, dependent));
      });
      nextState = nextNextState;
    } else {
      nextState = updateDependentsState(nextNextState, updateState, dependent);
    }
  });

  return nextState;
};

const writeAtomState = <V, U>(
  state: State,
  updateState: UpdateState,
  atom: AnyWritableAtom<V, U>,
  update: U,
  pendingPromises?: Array<Promise<void>>
): State => {
  const atomState = getAtomState(state, atom);
  if (atomState && atomState.writePromise) {
    const promise = atomState.writePromise.then(() => {
      updateState(prev => writeAtomState(prev, updateState, atom, update));
    });

    if (pendingPromises) {
      pendingPromises.push(promise);
    }

    return state;
  }
  let nextState = state;
  let isSync = true;
  try {
    const promiseOrVoid = atom.write(
      {
        get: (a: AnyAtom<any>) => {
          const aState = getAtomState(nextState, a);
          if (!aState) {
            if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
              console.warn('Trying to read an atom value that is never used. This may not behave as expected.', a);
            }
            return unsafeCoerce<AnyAtom<any> & WithInitialValue<any>>(a).init;
          }
          if (aState.readPromise && typeof process === 'object' && process.env.NODE_ENV !== 'production') {
            console.warn(
              'Reading pending atom state in write operation. We need to detect this and fallback. Please file an issue with repro.',
              a
            );
          }
          return unsafeCoerce(aState.value);
        },
        set: (a: AnyWritableAtom<any, any>, v: any) => {
          if (a === atom) {
            if (isSync) {
              nextState = updateDependentsState(setAtomValue(nextState, a, v), updateState, a);
            } else {
              updateState(prev => updateDependentsState(setAtomValue(prev, a, v), updateState, a));
            }
          } else {
            if (isSync) {
              nextState = writeAtomState(nextState, updateState, a, v);
            } else {
              updateState(prev => writeAtomState(prev, updateState, a, v));
            }
          }
        },
        update,
      }
    );

    if (promiseOrVoid instanceof Promise) {
      if (pendingPromises) {
        pendingPromises.push(promiseOrVoid);
      }
      nextState = setAtomWritePromise(
        nextState,
        atom,
        promiseOrVoid.then(() => {
          updateState(prev => setAtomWritePromise(prev, atom));
        })
      );
    }
  } catch (e) {
    if (pendingPromises && pendingPromises.length) {
      pendingPromises.push(
        new Promise((_resolve, reject) => {
          reject(e);
        })
      );
    } else {
      throw e;
    }
  }
  isSync = false;
  return nextState;
};

export const writeAtom = <V, U>(
  updateState: UpdateState,
  writingAtom: AnyWritableAtom<V, U>,
  update: U
): void | Promise<void> => {
  const pendingPromises: Array<Promise<void>> = [];

  updateState(prevState => {
    return writeAtomState(prevState, updateState, writingAtom, update, pendingPromises);
  });

  if (pendingPromises.length) {
    return new Promise<void>((resolve, reject) => {
      const loop = () => {
        const len = pendingPromises.length;
        if (len === 0) {
          resolve();
        } else {
          Promise.all(pendingPromises)
            .then(() => {
              pendingPromises.splice(0, len);
              loop();
            })
            .catch(reject);
        }
      };
      loop();
    });
  }
};

const updateDependentsMap = (state: State): void => {
  state.inProgress.forEach((atomState, atom) => {
    const prevDependencies = state.atomStateMap.get(atom)?.dependencies;
    if (prevDependencies === atomState.dependencies) {
      return;
    }

    const dependencies = new Set(atomState.dependencies.keys());
    if (prevDependencies) {
      prevDependencies.forEach((_, a) => {
        const aDependents = state.dependents.get(a);
        if (dependencies.has(a)) {
          dependencies.delete(a);
        } else {
          const newDependents = new Set(aDependents);
          newDependents.delete(atom);
          state.dependents.set(a, newDependents);
        }
      });
    }
    dependencies.forEach(a => {
      const aDependents = state.dependents.get(a);
      const newDependents = new Set(aDependents).add(atom);
      state.dependents.set(a, newDependents);
    });
  });
};

export const commitState = (state: State) => {
  if (state.inProgress.size) {
    updateDependentsMap(state);
    state.inProgress.forEach((atomState, atom) => {
      if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
        Object.freeze(atomState);
      }
      state.atomStateMap.set(atom, atomState);
    });
    state.inProgress.clear();
  }
};
