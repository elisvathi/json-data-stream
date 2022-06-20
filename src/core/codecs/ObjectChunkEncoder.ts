import { serializeCircular } from './circular';
import { StreamEncoder } from './Codec';
import {
  chunkIterator,
  ObjectFrame,
  ObjectInput,
} from './iterators/ObjectChunkIterator';

export class ObjectChunkEncoder<T extends ObjectInput>
  implements StreamEncoder<T, ObjectFrame>
{
  public constructor(
    private chunk_size: number = 100,
    private strategy: 'elements' | 'chars' = 'elements',
    private flatten: boolean = false,
  ) { }

  public *encode(data: ObjectInput): Generator<ObjectFrame> {
    if (this.flatten) {
      data = serializeCircular(data);
    }
    const iterator = chunkIterator(data, this.chunk_size, this.strategy);
    let current = iterator.next();
    if (current.done) {
      return;
    }
    let index: number = 0;
    let value: ObjectFrame = {
      chunk: current.value,
      index,
      flatted: this.flatten,
    };
    while (true) {
      current = iterator.next();
      if (current.done) {
        value.done = true;
        yield value;
        break;
      } else {
        yield value;
        value = {
          chunk: current.value,
          index: ++index,
          flatted: this.flatten,
        };
      }
    }
  }
}
