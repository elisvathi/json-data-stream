import { StreamCodec } from './Codec';
import { arrayChunkIterator } from './iterators/ArrayChunkIterator';

export class ArrayChunkCodec<T> implements StreamCodec<T[], T[]> {
  private iterator?: Generator<T[]>;
  public constructor(private chunk_size: number = 0) { }

  public *encode(data: T[]): Generator<T[]> {
    if (!this.iterator) {
      this.iterator = arrayChunkIterator(data, this.chunk_size);
    }
    const next = this.iterator.next();
    if (!next.done) {
      yield next.value;
    }
  }

  public decode(data: T[][]): T[] {
    return data.reduce((accumulator, item) => [...accumulator, ...item], []);
  }
}
