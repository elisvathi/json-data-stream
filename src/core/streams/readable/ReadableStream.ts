import EventEmitter from 'events';
import { ObjectFrame } from '../../codecs/iterators/ObjectChunkIterator';
import { MessageCounter } from '../../MessageCounter';
import _ from 'lodash';

export const STREAM_FULL_MESSAGE_EVENT_KEY = 'full_message';
export const STREAM_MESSAGE_PART_EVENT_KEY = 'part';

export type EventTypes =
  | typeof STREAM_FULL_MESSAGE_EVENT_KEY
  | typeof STREAM_MESSAGE_PART_EVENT_KEY;

type EvtHandlerByKey<
  TMsg,
  T extends EventTypes,
> = T extends typeof STREAM_MESSAGE_PART_EVENT_KEY
  ? (part: ObjectFrame, part_index?: number) => void
  : (full_array: TMsg) => void;

export class ObjectReadStream<
  T extends Record<string, unknown> | Array<unknown>,
> extends EventEmitter {
  private messageCounter: MessageCounter;
  private collector: any;
  constructor() {
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
        const splitted = key.split(/(?<!\\)\./gm);
        this.collector = this.decode(splitted, value, this.collector);
      });
      this.emit(STREAM_MESSAGE_PART_EVENT_KEY, part, part.index);
      if (this.messageCounter.isFinished) {
        this.finish();
      }
    }
  }

  private decode(splits: string[], value: unknown, collector?: any): any {
    const [, second] = splits;
    if (!second) {
      return value;
    }
    if (second.startsWith('[')) {
      const index = parseInt(second.slice(1, -1));
      collector = collector || [];
      collector[index] = this.decode(splits.slice(1), value, collector[index]);
      return collector;
    } else {
      collector = collector || {};
      const key = second.replace(/\\/g, '');
      collector[key] = this.decode(splits.slice(1), value, collector[key]);
      return collector;
    }
  }
}
