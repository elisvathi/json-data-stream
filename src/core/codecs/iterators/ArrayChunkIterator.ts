export function* arrayChunkIterator<T>(
  array: T[],
  chunk_size: number = 0,
): Generator<T[]> {
  if (chunk_size === 0) {
    chunk_size = array.length;
  }
  let index = 0;
  while (index < array.length) {
    yield array.slice(index, index + chunk_size);
    index += chunk_size;
  }
}
