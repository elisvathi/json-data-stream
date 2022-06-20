export type ObjectInput = Record<string, unknown> | Array<unknown> | unknown;

export type ObjectFrame = {
  chunk: Array<Record<string, unknown>>;
  done?: boolean;
  index: number;
  flatted?: boolean;
};
const DOT_ESCAPE = '\\.';

export function isPrimitive<T>(value: T): boolean {
  return (
    !value ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value instanceof Date
  );
}

/**
 * Iterate array recursively using anyIterator() for each item
 * Yield objects of shape {"values.[1]" : "value"} for {values: [<undefined>, "value"]}
 * @param array
 * @param path
 */
function* arrayIterator(
  array: unknown[],
  path: string,
): Generator<Record<string, unknown>> {
  let i = 0;
  while (i < array.length) {
    const nextResult = anyIterator(array[i], `${path}.[${i}]`);
    for (const next of nextResult) {
      yield next;
    }
    i++;
  }
}

/**
 * Iterate object recursively by getting the keys first
 * And keeping a pointer on that array fo keys
 * Process recursively each value using anyIterator
 * Dots in property names are escaped
 * Yield objects of shape {"value.a": "value"} for {value: {a: "value"}}
 * Yield objects of shape {"value.a\\.json": "value"} for {value: {"a.json": "value"}}
 * @param obj
 * @param path
 */
function* objectIterator(
  obj: Record<string, unknown>,
  path: string,
): Generator<Record<string, unknown>> {
  let keys = Object.keys(obj);
  //TODO: maybe sort keys here
  let i = 0;
  while (i < keys.length) {
    const key_escaped = keys[i].replace(/\./g, DOT_ESCAPE);
    const nextResult = anyIterator(
      obj[keys[i]] as Array<unknown> | Record<string, unknown>,
      `${path}.${key_escaped}`,
    );
    for (const next of nextResult) {
      yield next;
    }
    i++;
  }
}

/**
 * If its a primitive object return {[path]: value}
 * If its an array yield the results of arrayIterator
 * If its an object yield the results of objectIterator
 * If its an empty object or an empty array yield {[path]: {}}  or {[path]: []}
 * @param object
 * @param path
 */
export function* anyIterator<T extends ObjectInput>(
  object: T,
  path: string = '',
): Generator<Record<string, unknown>> {
  if (isPrimitive(object)) {
    yield { [path]: object };
  } else if (Array.isArray(object)) {
    /**
     *  If we find at least one item this value will become false
     * so we will not yield an empty array otherwise and empty array will be yielded for this path
     */
    let is_empty = true;
    for (const item of arrayIterator(object, path)) {
      yield item;
      is_empty = false;
    }
    if (is_empty) {
      yield { [path]: object };
    }
  } else {
    /**
     *  If we find at least one item this value will become false
     * so we will not yield an empty object otherwise and empty object will be yielded for this path
     */
    let is_empty = true;
    for (const item of objectIterator(
      object as Record<string, unknown>,
      path,
    )) {
      yield item;
      is_empty = false;
    }
    if (is_empty) {
      yield { [path]: object };
    }
  }
}

/**
 * Iterate an object | array | unknown into chunks of <chunk_size> items
 * @param t
 * @param chunk_size
 * @param strategy
 */
export function* chunkIterator(
  t: Record<string, unknown> | Array<unknown> | unknown,
  chunk_size: number,
  strategy: 'elements' | 'chars' = 'elements',
): Generator<Array<Record<string, unknown>>> {
  let accumulator: Record<string, unknown>[] = [];
  const iterator = anyIterator(t, '');
  if (strategy === 'chars') {
    let size: number = 0;
    for (const item of iterator) {
      accumulator.push(item);
      size += JSON.stringify(item).length;
      if (size >= chunk_size) {
        yield accumulator;
        size = 0;
        accumulator = [];
      }
    }
  } else {
    for (const item of iterator) {
      accumulator.push(item);
      if (accumulator.length >= chunk_size) {
        yield accumulator;
        accumulator = [];
      }
    }
  }
  if (accumulator.length > 0) {
    yield accumulator;
    accumulator = [];
  }
}
