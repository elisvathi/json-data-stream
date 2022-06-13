import { ArrayChunkCodec } from '../../codecs/ArrayChunkCodec';
import { ReadableStream } from './ReadableStream';

export class ArrayReadableStream<T> extends ReadableStream<T[], T[]> {
  constructor(message_count: number) {
    super(new ArrayChunkCodec<T>(), message_count);
  }
}
