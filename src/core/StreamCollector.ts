import { EventEmitter } from 'stream';
import { ObjectFrame } from './codecs/iterators/ObjectChunkIterator';

import {
  EventTypes,
  STREAM_FULL_MESSAGE_EVENT_KEY,
  STREAM_MESSAGE_PART_EVENT_KEY,
  ObjectReadStream,
} from './streams/readable/ReadableStream';

type COLLECTOR_EVENT_KEY = `${EventTypes}_${string}`;

type CollectorEvtHandlerByKey<
  TMsg,
  T extends COLLECTOR_EVENT_KEY,
> = T extends `${typeof STREAM_MESSAGE_PART_EVENT_KEY}_${string}`
  ? (part: TMsg[], part_index?: number, message_count?: number) => void
  : (full_array: TMsg[]) => void;

export class StreamCollector<
  T extends Record<string, unknown> | Array<unknown>,
> extends EventEmitter {
  private streams: Record<string, ObjectReadStream<T>> = {};

  public addPart(message_id: string, part: ObjectFrame): void {
    if (!this.streams[message_id]) {
      this.createStream(message_id);
    }
    this.streams[message_id].addPart(part);
  }

  public on<E extends COLLECTOR_EVENT_KEY>(
    evt: E,
    handler: CollectorEvtHandlerByKey<T, E>,
  ): this {
    super.on(evt, handler);
    return this;
  }

  public once<E extends COLLECTOR_EVENT_KEY>(
    evt: E,
    handler: CollectorEvtHandlerByKey<T, E>,
  ): this {
    super.once(evt, handler);
    return this;
  }

  private createStream(message_id: string) {
    const stream = new ObjectReadStream<T>();
    stream.on(STREAM_MESSAGE_PART_EVENT_KEY, (part, part_index) => {
      this.emit(
        `${STREAM_MESSAGE_PART_EVENT_KEY}_${message_id}`,
        part,
        part_index,
      );
    });
    stream.once(STREAM_FULL_MESSAGE_EVENT_KEY, (message) => {
      this.emit(`${STREAM_FULL_MESSAGE_EVENT_KEY}_${message_id}`, message);
      this.removeStream(message_id);
    });
    this.streams[message_id] = stream;
  }

  /*
   * Remove a stream from the collector.
   * This will clear the memory that message stream takes
   */
  private removeStream(message_id: string): void {
    delete this.streams[message_id];
    this.removeAllListeners(`${STREAM_FULL_MESSAGE_EVENT_KEY}_${message_id}`);
    this.removeAllListeners(`${STREAM_MESSAGE_PART_EVENT_KEY}_${message_id}`);
  }
}
