export type ObjectInput = Record<string, unknown> | Array<unknown> | unknown;

export type ObjectFrame = {
  chunk: Record<string, unknown>;
  done?: boolean;
  index: number;
};

function isPrimitive<T>(value: T): boolean {
  return (
    !value ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  );
}

function* arrayIterator(array: any[], path: string) {
  let i = 0;
  while (i < array.length) {
    const nextResult = anyIterator(array[i], `${path}.[${i}]`);
    for (const next of nextResult) {
      yield next;
    }
    i++;
  }
}

function* objectIterator<T extends Record<string, unknown>>(
  obj: T,
  path: string,
) {
  let keys = Object.keys(obj);
  let i = 0;
  while (i < keys.length) {
    const nextResult = anyIterator(obj[keys[i]] as any, `${path}.${keys[i]}`);
    for (const next of nextResult) {
      yield next;
    }
    i++;
  }
}

export function* anyIterator<T extends ObjectInput>(
  object: T,
  path: string = '',
): Generator<any> {
  if (isPrimitive(object)) {
    yield { [path]: object };
  } else if (Array.isArray(object)) {
    if (object.length === 0) {
      yield { [path]: object };
    } else {
      for (const item of arrayIterator(object, path)) {
        yield item;
      }
    }
  } else {
    if (Object.keys(object as Record<string, unknown>).length === 0) {
      yield { [path]: object };
    } else {
      for (const item of objectIterator(
        object as Record<string, unknown>,
        path,
      )) {
        yield item;
      }
    }
  }
}

export function* chunkIterator(
  t: any,
  chunk_size: number,
  strategy: 'elements' | 'chars' = 'elements',
) {
  let accumulator: any[] = [];
  const toObject = (data: any[]) => {
    return data.reduce((a, i) => {
      return { ...a, ...i };
    }, {});
  };
  const iterator = anyIterator(t, '');
  if (strategy === 'chars') {
    let size: number = 0;
    for (const item of iterator) {
      accumulator.push(item);
      size += JSON.stringify(item).length;
      if (size >= chunk_size) {
        yield toObject(accumulator);
        size = 0;
        accumulator = [];
      }
    }
  } else {
    for (const item of iterator) {
      accumulator.push(item);
      if (accumulator.length >= chunk_size) {
        yield toObject(accumulator);
        accumulator = [];
      }
    }
  }
  if (accumulator.length > 0) {
    yield toObject(accumulator);
    accumulator = [];
  }
}
