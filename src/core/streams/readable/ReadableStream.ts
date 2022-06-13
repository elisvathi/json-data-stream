import EventEmitter from 'events';
import { StreamCodec } from '../../codecs/Codec';
import { ObjectFrame } from '../../codecs/iterators/ObjectChunkIterator';
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
  ? (part: TMsg[], part_index?: number, message_count?: number) => void
  : (full_array: TMsg[]) => void;

export class ReadableStream<T, TFrame> extends EventEmitter {
  private messageCounter: MessageCounter;
  private collector: any;

  constructor(
    protected codec: StreamCodec<T, TFrame>,
    protected message_count: number,
  ) {
    super();
    this.messageCounter = new MessageCounter();
  }

  private finish(): void { }

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

  public addPart(part: ObjectFrame, part_index: number) {
    if (this.messageCounter.remove(part_index, part.done)) {
      if (!this.collector) {
        const composed = Object.entries(part.chunk).map(([key, value]) => {
          const splitted = key.split('.');
          return this.compose(splitted, value);
        });
        if (composed.length > 0) {
          const [first, ...rest] = composed;
          _.merge(first, ...rest);
          if (!this.collector) {
            this.collector = first;
          } else {
            _.merge(this.collector, first);
          }
        }
      }
      this.emit(
        STREAM_MESSAGE_PART_EVENT_KEY,
        part,
        part_index,
        this.message_count,
      );
      if (this.messageCounter.isFinished) {
        this.finish();
      }
    }
  }

  private compose(splits: string[], value: unknown): any {
    const [, second] = splits;
    if (!second) {
      return value;
    }
    if (second.startsWith('[')) {
      const index = parseInt(second.slice(1, -1));
      const return_value = [];
      return_value[index] = this.compose(splits.slice(1), value);
      return return_value;
    } else {
      const return_value: Record<string, unknown> = {};
      return_value[second] = this.compose(splits.slice(1), value);
      return return_value;
    }
  }
}
const s = new ReadableStream(new ObjectChunkCodec(3), 3);
const cdc = new ObjectChunkCodec(3);
const generator = cdc.encode({
  a: 1,
  b: 2,
  c: [1, 2, 3, 4, 5],
  d: [1, 2, { d: 3 }, false, true],
} as any);
let i = 0;
for (const item of generator) {
  s.addPart(item, i++);
}
console.log(s);
