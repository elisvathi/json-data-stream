import { StreamCodec } from './Codec';
import {
  chunkIterator,
  ObjectFrame,
  ObjectInput,
} from './iterators/ObjectChunkIterator';
import _ from 'lodash';

export class ObjectChunkCodec<T extends ObjectInput>
  implements StreamCodec<T, ObjectFrame>
{
  public constructor(
    private chunk_size: number = 100,
    private strategy: 'elements' | 'chars' = 'elements',
  ) { }

  public *encode(data: ObjectInput): Generator<ObjectFrame> {
    const iterator = chunkIterator(data, this.chunk_size, this.strategy);
    let current = iterator.next();
    if (current.done) {
      return;
    }
    let value: ObjectFrame = { chunk: current.value };
    while (true) {
      current = iterator.next();
      if (current.done) {
        value.done = true;
        break;
      } else {
        yield value;
        value = { chunk: current.value };
      }
    }
  }

  // Example 1
  // '.[1]: 3'
  // [undefined,3 ]
  // Example 2
  // '.user.[0].test: 3'
  // { user : [{test: 3}]}
  public decode(data: ObjectFrame[]): T {
    for (const item of data) {
      for (const [key, value] of Object.keys(item.chunk)) {
        const keys_split = key.split('.');
      }
    }
  }
}
const codec = new ObjectChunkCodec();
const value_key = '.[1].user.[1].value';
const value = {};
const v = codec.compose(value_key.split('.'), value);
console.dir(v, { depth: null });
