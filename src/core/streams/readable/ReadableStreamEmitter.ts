import { ObjectFrame } from '../../codecs/iterators/ObjectChunkIterator';
import EventEmitter from 'events';

export const FULL_MESSAGE = 'full_message';
export const PART = 'part';
export const PART_TIMEOUT = 'part_timeout';
export const FIRST_TIMEOUT = 'first_timeout';
export const STREAM_TIMEOUT = 'timeout';

export type EventTypes =
  | typeof FULL_MESSAGE
  | typeof PART
  | typeof PART_TIMEOUT
  | typeof FIRST_TIMEOUT
  | typeof STREAM_TIMEOUT;

type EvtHandlerByKey<TMsg, T extends EventTypes> = T extends typeof PART
  ? (part: ObjectFrame, part_index?: number) => void
  : T extends typeof FULL_MESSAGE
  ? (full_object: TMsg) => void
  : () => void;

export class ReadableStreamEmitter<
  T extends Record<string, unknown> | Array<unknown>,
  > extends EventEmitter {
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
}
