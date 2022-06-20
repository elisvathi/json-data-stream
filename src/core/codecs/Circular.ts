/*! (c) 2020 Andrea Giammarchi */

const { parse: $parse, stringify: $stringify } = JSON;
const { keys } = Object;

const Primitive = String; // it could be Number
const primitive = 'string'; // it could be 'number'

const ignore = {};
const object = 'object';

const noop = (_: any, value: any): any => value;

const primitives = (value: any) =>
  value instanceof Primitive ? Primitive(value) : value;

const Primitives = (_: any, value: any) =>
  typeof value === primitive ? new Primitive(value) : value;

const revive = (
  input: { [x: string]: any },
  parsed: Set<unknown>,
  output: { [x: string]: any },
  fn: (arg0: any, arg1: string, arg2?: any) => any,
): any => {
  const lazy = [];
  for (let ke = keys(output), { length } = ke, y = 0; y < length; y++) {
    const k = ke[y];
    const value = output[k];
    if (value instanceof Primitive) {
      const tmp = input[value as string];
      if (typeof tmp === object && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[k] = ignore;
        lazy.push({ k, a: [input, parsed, tmp, fn] });
      } else output[k] = fn.call(output, k, tmp);
    } else if (output[k] !== ignore) output[k] = fn.call(output, k, value);
  }
  for (let { length } = lazy, i = 0; i < length; i++) {
    const { k, a } = lazy[i];
    output[k] = fn.call(output, k, (revive as any).apply(null, a));
  }
  return output;
};

const set = (known: Map<any, any>, input: any[], value: any) => {
  const index = Primitive(input.push(value) - 1);
  known.set(value, index);
  return index;
};

export const parse = (text: string, reviver?: (_: any, value: any) => any) => {
  const input = $parse(text, Primitives).map(primitives);
  const value = input[0];
  const $ = reviver || noop;
  const tmp =
    typeof value === object && value
      ? revive(input, new Set(), value, $)
      : value;
  return $.call({ '': tmp }, '', tmp);
};

export const stringify = (
  value: any,
  replacer?: any[] | Function,
  space?: string | number,
) => {
  const fn =
    replacer && typeof replacer === object && Array.isArray(replacer)
      ? (k: string, v: any) =>
          k === '' || -1 < replacer.indexOf(k) ? v : void 0
      : (replacer as Function | undefined) || noop;
  const known = new Map();
  const input: any[] = [];
  const output = [];
  let i = +set(known, input, fn.call({ '': value }, '', value));
  let firstRun = !i;
  while (i < input.length) {
    firstRun = true;
    output[i] = $stringify(input[i++], replace, space);
    // output[i] = input[i++]
  }
  return output;
  // return '[' + output.join(',') + ']';
  function replace(this: any, key: any, value: any) {
    if (firstRun) {
      firstRun = !firstRun;
      return value;
    }
    const after = fn.call(this, key, value);
    switch (typeof after) {
      case object:
        if (after === null) return after;
      case primitive:
        return known.get(after) || set(known, input, after);
    }
    return after;
  }
};
