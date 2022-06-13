import {
  ObjectFrame,
  ObjectInput,
} from '../../codecs/iterators/ObjectIterator';
import { ObjectChunkCodec } from '../../codecs/ObjectChunkCodec';
import { ReadableStream } from './ReadableStream';

export class ObjectReadableStream<T extends ObjectInput> extends ReadableStream<
  T,
  ObjectFrame
> {
  constructor(message_count: number) {
    super(new ObjectChunkCodec<T>(), message_count);
  }
}
