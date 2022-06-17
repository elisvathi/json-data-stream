import { ObjectReadStream, ObjectChunkEncoder } from '../src';
async function testObject(obj: any) {
  const encoder = new ObjectChunkEncoder(1);
  const iterator = encoder.encode(obj);
  const stream = new ObjectReadStream();
  const result = await new Promise<any>((resolve) => {
    stream.on('full_message', (p) => {
      resolve(p);
    });
    for (const item of iterator) {
      stream.addPart(item);
    }
  });
  expect(obj).toEqual(result);
}

test('Simple object', async () => {
  await testObject({ a: 1, b: 2 });
});

test('Empty object', async () => {
  await testObject({});
});

test('Empty child', async () => {
  await testObject({ a: {} });
});

test('Simple array', async () => {
  await testObject([1, 2, 3]);
});

test('Empty array', async () => {
  await testObject([]);
});

test('Nested array', async () => {
  await testObject([
    [1, 2, 3],
    [1, 2, 3],
  ]);
});

test('Nested empty array', async () => {
  await testObject([[], []]);
});

test('Array of objects', async () => {
  await testObject([{ a: 1 }, { a: 2 }]);
});

test('Array of empty objects', async () => {
  await testObject([{}, {}]);
});

test('Hybrid array', async () => {
  await testObject([{ a: 1 }, {}, 1, 2, 3, 'a', 'b', 'c']);
});

test('Object with arrays', async () => {
  await testObject({ a: [1, 2, 3], b: ['a', 'b', 'c'] });
});
test('Object with empty arrays', async () => {
  await testObject({ a: [], b: [] });
});

test('Mixed object', async () => {
  await testObject({
    a: [{ a: 1, b: 2, c: [1, 2, { a: 1, b: 2, c: { 3: 1, 2: 1 } }] }],
    b: [],
  });
});

test('Object with dot in key name', async () => {
  await testObject({ 'a.1': 1 });
});

//FIX: this tests is not succesful with key 'a\\.1'
xtest('Object with escaped dot in key name', async () => {
  const key = 'a.1';
  await testObject({ [key]: 1 });
});

test('Object with empty space in key name', async () => {
  await testObject({ 'a .1': 1 });
});

test('Object with random characters in key name', async () => {
  await testObject({ 'a$*(!&$*(!*@@)) .1': 1 });
});
