import { EventEmitter } from 'stream';
import { ObjectFrame } from './codecs/iterators/ObjectChunkIterator';

import {
  ObjectReadStream,
  ObjectReadStreamOptions,
} from './streams/readable/ObjectReadStream';
import {
  EventTypes,
  FIRST_TIMEOUT,
  FULL_MESSAGE,
  PART,
  PART_TIMEOUT,
  STREAM_TIMEOUT,
} from './streams/readable/ReadableStreamEmitter';

type COLLECTOR_EVENT_KEY = `${EventTypes}_${string}`;

type CollectorEvtHandlerByKey<
  TMsg,
  T extends COLLECTOR_EVENT_KEY,
> = T extends `${typeof PART}_${string}`
  ? (part: TMsg[], part_index?: number, message_count?: number) => void
  : T extends `${typeof FULL_MESSAGE}_${string}`
  ? (full_array: TMsg[]) => void
  : () => void;

export class StreamCollector<
  T extends Record<string, unknown> | Array<unknown>,
> extends EventEmitter {
  private streams: Record<string, ObjectReadStream<T>> = {};

  public addStream(message_id: string, options?: ObjectReadStreamOptions) {
    if (!this.streams[message_id]) {
      this.createStream(message_id, options);
    }
  }

  public addPart(
    message_id: string,
    part: ObjectFrame,
    options?: ObjectReadStreamOptions,
  ): void {
    if (!this.streams[message_id]) {
      this.createStream(message_id, options);
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

  private createStream(message_id: string, options?: ObjectReadStreamOptions) {
    const stream = new ObjectReadStream<T>(options);
    stream.on(PART, (part, part_index) => {
      this.emit(`${PART}_${message_id}`, part, part_index);
    });
    stream.once(FULL_MESSAGE, (message) => {
      this.emit(`${FULL_MESSAGE}_${message_id}`, message);
      this.removeStream(message_id);
    });

    stream.once(FIRST_TIMEOUT, () => {
      this.emit(`${FIRST_TIMEOUT}_${message_id}`);
      this.removeStream(message_id);
    });

    stream.once(PART_TIMEOUT, () => {
      this.emit(`${PART_TIMEOUT}_${message_id}`);
      this.removeStream(message_id);
    });

    stream.once(STREAM_TIMEOUT, () => {
      this.emit(`${STREAM_TIMEOUT}_${message_id}`);
      this.removeStream(message_id);
    });

    this.streams[message_id] = stream;
  }

  /*
   * Remove a stream from the collector.
   * This will clear the memory that message stream takes
   */
  private removeStream(message_id: string): void {
    const stream = this.streams[message_id];
    if (stream) {
      stream.removeStreamListeners();
    }
    delete this.streams[message_id];
    this.removeStreamListeners(message_id);
  }

  public removeStreamListeners(message_id: string) {
    const event_types = [
      PART,
      PART_TIMEOUT,
      STREAM_TIMEOUT,
      FIRST_TIMEOUT,
      FULL_MESSAGE,
    ];
    for (const item of event_types) {
      this.removeAllListeners(`${item}_${message_id}`);
    }
  }
}
