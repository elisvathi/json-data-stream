import EventEmitter from 'events';
import { StreamDecoder } from '../../codecs/Codec';
import {
  chunkIterator,
  ObjectFrame,
} from '../../codecs/iterators/ObjectChunkIterator';
import { MessageCounter } from '../../MessageCounter';
import _ from 'lodash';
import { ObjectChunkCodec } from '../../codecs/ObjectChunkCodec';

export const STREAM_FULL_MESSAGE_EVENT_KEY = 'full_message';
export const STREAM_MESSAGE_PART_EVENT_KEY = 'part';

export type EventTypes =
  | typeof STREAM_FULL_MESSAGE_EVENT_KEY
  | typeof STREAM_MESSAGE_PART_EVENT_KEY;

type EvtHandlerByKey<
  TMsg,
  T extends EventTypes,
> = T extends typeof STREAM_MESSAGE_PART_EVENT_KEY
  ? (part: TMsg[], part_index?: number) => void
  : (full_array: TMsg[]) => void;

export class ObjectReadStream<
  T extends Record<string, unknown> | Array<unknown>,
> extends EventEmitter {
  private messageCounter: MessageCounter;
  private collector: any;

  constructor(
    protected codec: StreamDecoder<ObjectFrame, T>,
    protected message_count: number,
  ) {
    super();
    this.messageCounter = new MessageCounter();
  }

  private finish(): void {
    this.emit(STREAM_FULL_MESSAGE_EVENT_KEY, this.collector);
  }

  public on<E extends EventTypes>(
    evt: E,
    handler: EvtHandlerByKey<T, E>,
  ): this {
    super.on(evt, handler);
    return this;
  }

  public once<E extends EventTypes>(
    evt: E,
    handler: EvtHandlerByKey<T, E>,
  ): this {
    super.once(evt, handler);
    return this;
  }

  public addPart(part: ObjectFrame) {
    if (this.messageCounter.remove(part.index, part.done)) {
      Object.entries(part.chunk).forEach(([key, value]) => {
        const splitted = key.split('.');
        this.collector = this.compose(splitted, value, this.collector);
      });
      this.emit(
        STREAM_MESSAGE_PART_EVENT_KEY,
        part,
        part.index,
        this.message_count,
      );
      if (this.messageCounter.isFinished) {
        this.finish();
      }
    }
  }

  private compose(splits: string[], value: unknown, collector?: any): any {
    const [, second] = splits;
    if (!second) {
      return value;
    }
    if (second.startsWith('[')) {
      const index = parseInt(second.slice(1, -1));
      collector = collector || [];
      collector[index] = this.compose(splits.slice(1), value, collector[index]);
      return collector;
    } else {
      collector = collector || {};
      collector[second] = this.compose(
        splits.slice(1),
        value,
        collector[second],
      );
      return collector;
    }
  }
}

const s = new ObjectReadStream(new ObjectChunkCodec(3), 3);

const cdc = new ObjectChunkCodec(300, 'elements');

const o = [
  {
    a: 1,
    b: 2,
    c: [1, 2, 3, 4, 5],
    d: [1, 2, { d: 3 }, false, true, 1],
  },
];

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
for (let i = 0; i < 1000000; i++) {
  o.push({
    [alphabet[Math.floor(Math.random() * 26)]]: { i },
  } as any);
}
console.log('Object built!');
const generator = cdc.encode(o as any);
console.log('Generator created!');
let i = 0;
for (const item of generator) {
  console.log('-');
  s.addPart(item);
  console.log('|', i++);
}

console.dir((s as any).collector, { depth: null });
