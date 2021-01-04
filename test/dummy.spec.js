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

  const secondAtom = atom(({ get }: {| get: Getter |}): number => {
    return get(firstAtom) + 1;
  });

  const thirdAtom = atom(async ({ get }: {| get: Getter |}): Promise<Posts> => {
    const firstAtomValue = get(firstAtom);
    const secondAtomValue = get(secondAtom);

    p(firstAtomValue, secondAtomValue);

    const result = await fetch('http://jsonplaceholder.typicode.com/posts');

    return await result.json();
  });

  const asyncAtom = atom(async ({ get }: {| get: Getter |}): Promise<Posts> => {
    const asyncAtomValue = await get(thirdAtom);
    return asyncAtomValue.filter(post => post.id === 0);
  });

  console.log(firstAtom);
  console.log(secondAtom);
  console.log(thirdAtom);
  console.log(asyncAtom);
});

const p = (v: number, v2: number): string => String(v) + String(v2);
