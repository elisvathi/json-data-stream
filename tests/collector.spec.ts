import { StreamCollector } from '../src';
import _ from 'lodash';

test('Collector returns false when adding part without creating stream', () => {
  const collector = new StreamCollector();
  const message_id = 'a';
  const result = collector.addPart(message_id, { chunk: [], index: 1 });
  expect(result).toBe(false);
});

test('Collector returns true when adding part on a created stream', () => {
  const collector = new StreamCollector();
  const message_id = 'a';
  collector.addStream(message_id);
  const result = collector.addPart(message_id, {
    chunk: [],
    index: 0,
    done: true,
  });
  expect(result).toBe(true);
});

test('Stream is removed after finished', () => {
  const collector = new StreamCollector();
  const message_id = 'a';
  collector.addStream(message_id);
  collector.addPart(message_id, {
    chunk: [],
    index: 0,
    done: true,
  });
  const result = collector.addPart(message_id, {
    chunk: [],
    index: 1,
  });
  expect(result).toBe(false);
});

test('Stream is removed after timeout', async () => {
  const collector = new StreamCollector();
  const message_id = 'a';
  collector.addStream(message_id, { part_timeout_seconds: 1 });
  await new Promise<void>((resolve) => {
    collector.addPart(message_id, {
      chunk: [{ '.a': 1 }],
      index: 0,
    });
    setTimeout(resolve, 1500);
  });
  const result = collector.addPart(message_id, {
    chunk: [{ '.b': 2 }],
    index: 1,
    done: true,
  });
  expect(result).toBe(false);
});
