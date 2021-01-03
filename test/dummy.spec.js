// @flow
/* eslint-env jest */
import { atom } from 'core/atom';
import type { Getter } from 'core/types';

test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});

test('create atom', () => {
  const firstAtom = atom(1);

  const secondAtom = atom(async (get: Getter): Promise<any> => {
    const atomValue = get(firstAtom);

    p(atomValue);

    const result = await fetch('http://jsonplaceholder.typicode.com/posts');

    return await result.json();
  });

  console.log(firstAtom);
  console.log(secondAtom);
});

const p = (v: number): string => String(v);
