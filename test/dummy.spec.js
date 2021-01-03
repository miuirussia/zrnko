// @flow
/* eslint-env jest */
import { atom } from 'core/atom';
import type { Getter } from 'core/types';

test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});

type Posts = Array<{| userId: number, id: number, title: string, body: string |}>;

test('create atom', () => {
  const firstAtom = atom(1);

  const secondAtom = atom((get: Getter): number => {
    return get(firstAtom) + 1;
  });

  const thirdAtom = atom(async (get: Getter): Promise<Posts> => {
    const atomValue = get(firstAtom);

    p(atomValue);

    const result = await fetch('http://jsonplaceholder.typicode.com/posts');

    return await result.json();
  });

  console.log(firstAtom);
  console.log(secondAtom);
  console.log(thirdAtom);
});

const p = (v: number): string => String(v);
