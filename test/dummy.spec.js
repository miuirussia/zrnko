// @flow
/* eslint-env jest */
import { atom } from 'core/atom';

test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});

test('create atom', () => {
  const firstAtom = atom(1);

  const secondAtom = atom(async () => {
    const result = await fetch('http://jsonplaceholder.typicode.com/posts');

    return await result.json();
  });

  console.log(firstAtom);
})
