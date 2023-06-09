# Parseable Stream

This package can be used to transfer large json objects/arrays over a network.
It works by splitting the json to chunks that are always parseable valid json objects.
These streams can be collected incrementally without having a single parse call.
This way it avoids taking up memory for large json objects.

There are three classes that this package exposes:

- `ObjectChunkEncoder` encodes a json object to a stream of chunks
- `ObjectReadStream` is a helper class to collect chunks and parse them to a json object
- `StreamCollector` handles multiple streams and emits events for each of them

## ObjectChunkEncoder

`ObjectChunkEncoder` utilizes generators to yield chunks of json objects.
So it does not have a single serialize call to avoid taking too much memory on the sender side.
JSON objects are flatted down to its leaf nodes.

- For example the json object:

```json
{
  "a": {
    "b": {
      "c": "d"
      "d": ["a", "b", "c", 1, 2, 3, {"a": 1}]
    }
  }
}
```

is converted to:

```json
[
  { ".a.b.c": "d" },
  { ".a.b.c.d.[0]": "a" },
  { ".a.b.c.d.[1]": "b" },
  { ".a.b.c.d.[2]": "c" },
  { ".a.b.c.d.[3]": 1 },
  { ".a.b.c.d.[4]": 2 },
  { ".a.b.c.d.[5]": 3 },
  { ".a.b.c.d.[6].a": 1 }
]
```

_Important:_ This serialization does not handle circular referencing object at the moment.
So be careful because because it might end up streaming infinitely.

This conversion does not happen for the whole object,
so depending on the chunk size does not take extra temporary memory (for the whole object), but instead uses generators to yield the chunks.

The final message the encoder emits is a json object of shape:

```typescript
{
  chunk: Array<Record<string, unknown>>,
  index: number,
  done?: boolean
}
```

### Usage

```javascript
const { ObjectChunkEncoder } = require('parseable-stream');
const chunk_size = 10;
const encoder = new ObjectChunkEncoder(chunk_size);
const largeJsonObject = {...};
for (const item of encoder.encode(largeJsonObject)) {
// send item to other side
}
```

## ObjectReadStream

Collects all parts of a stream and emits events for a single part or when stream completed.

```javascript
// received part object
// {chunk: Array<Record<string, unknown>>, index: number, done?: boolean};
const part = {....}
const stream = new ObjectReadStream({
  first_message_timeout_seconds: 100,
  part_timeout_seconds: 3
});
stream.addPart(part_1);
stream.addPart(part_2);
..
stream.addPart(part_n);

stream.on('first_timeout', () => {
  console.log("Stream never got any message!");
});

stream.on('part_timeout', () => {
  console.log("Stream stopped receiving parts!");
});

stream.on('timeout', () => {
  console.log("Received timeout for either first message or part")
});

stream.on('part', (value, part_index)=>{
    console.log('Received part with index',value, part_index)
});

stream.on('full_message', (value)=>{
  console.log('Received full message', value);
});

```

## StreamCollector

`StreamCollector` creates a stream for every `unique_id` that we call addPart() with
We can then subscribe to that stream using the collector and message-id in the event name.

- `part_${message_id}`
- `full_message_${message_id}`

When a stream is completed it is cleared from the collector to avoid leaks (along with its event listeners).

```javascript
const collector = new StreamCollector();
const message_id = 'abc_123';
collector.addStream(message_id, { part_timeout_seconds: 1 });

collector.on(`first_timeout_${message_id}`, () => {
  console.log(`Stream ${message_id} stopped receiving any message!`);
});

collector.on(`part_timeout_${message_id}`, () => {
  console.log(`Stream ${message_id} stopped receiving parts without getting the full message!`);
});

collector.on(`timeout_${message_id}`, () => {
  console.log(`Stream ${message_id} reached timeout!`);
});

collector.on(`part_${message_id}`, (value, part_index) => {
  console.log('Received part with index', value, part_index);
});

collector.once(`full_message_${message_id}`, (value) => {
  console.log('Received full message', value);
});

// addPart returns true if stream is created
collector.addPart(message_id, part_1); // true
collector.addPart('unregistered_messag_id', part_1); // false

collector.addPart(message_id, part_2);
..
collector.addPart(message_id, part_n);
```
