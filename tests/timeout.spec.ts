import { ObjectReadStream } from '../src';

test('First message timeout should fire', async () => {
  const stream = new ObjectReadStream<any>({
    first_message_timeout_seconds: 1,
  });
  const r = await Promise.race([
    new Promise<boolean>((resolve) => {
      stream.on('timeout', () => {
        resolve(true);
      });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 2 * 1000);
    }),
  ]);
  expect(r).toBe(true);
});

test('First message timeout should not fire', async () => {
  const stream = new ObjectReadStream<any>({
    first_message_timeout_seconds: 1,
  });
  stream.addPart({ chunk: [{ a: 1 }], index: 0, done: true });
  const r = await Promise.race([
    new Promise<boolean>((resolve) => {
      stream.on('timeout', () => {
        resolve(true);
      });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 2 * 1000);
    }),
  ]);
  expect(r).toBe(false);
});

test('Part timeout should fire', async () => {
  const stream = new ObjectReadStream<any>({
    first_message_timeout_seconds: 3,
    part_timeout_seconds: 1,
  });
  const r = await Promise.race([
    new Promise<boolean>((resolve) => {
      stream.on('part_timeout', () => {
        resolve(true);
      });
      stream.addPart({ chunk: [{ a: 1 }], index: 0 });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 2 * 1000);
    }),
  ]);
  expect(r).toBe(true);
});

test('Part timeout should not fire', async () => {
  const stream = new ObjectReadStream<any>({
    first_message_timeout_seconds: 3,
    part_timeout_seconds: 2,
  });

  const r = await Promise.race([
    new Promise<boolean>((resolve) => {
      stream.on('timeout', () => {
        resolve(true);
      });
      stream.addPart({ chunk: [{ '.a': 1 }], index: 0 });
      stream.addPart({ chunk: [{ '.a': 1 }], index: 1 });
      stream.addPart({ chunk: [{ '.c': 2 }], index: 2, done: true });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 3 * 1000);
    }),
  ]);
  expect(r).toBe(false);
});
