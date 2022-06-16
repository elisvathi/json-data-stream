import { ObjectFrame } from '../../codecs/iterators/ObjectChunkIterator';
import { MessageCounter } from '../../MessageCounter';
import {
  ReadableStreamEmitter,
  FULL_MESSAGE,
  PART,
  PART_TIMEOUT,
  STREAM_TIMEOUT,
  FIRST_TIMEOUT,
} from './ReadableStreamEmitter';

export type ObjectReadStreamOptions = {
  first_message_timeout_seconds?: number;
  part_timeout_seconds?: number;
};

export class ObjectReadStream<
  T extends Record<string, unknown> | Array<unknown>,
  > extends ReadableStreamEmitter<T> {
  private messageCounter: MessageCounter;
  private collector: any;
  private options: ObjectReadStreamOptions;
  private first_message_timeout_handle?: NodeJS.Timeout;
  private part_timeout_handle?: NodeJS.Timeout;

  constructor(options: ObjectReadStreamOptions = {}) {
    super();
    /*
     * Set default options
     */
    this.options = options;
    this.options.first_message_timeout_seconds =
      this.options.first_message_timeout_seconds || 0;
    this.options.part_timeout_seconds = this.options.part_timeout_seconds || 0;

    this.messageCounter = new MessageCounter();

    /*
     * Start first message timeout
     */
    if (this.options.first_message_timeout_seconds) {
      this.first_message_timeout_handle = setTimeout(() => {
        this.emitFirstMessageTimeout();
      }, this.options.first_message_timeout_seconds * 1000);
    }
  }

  private emitFirstMessageTimeout(): void {
    this.emit(FIRST_TIMEOUT);
    this.emit(STREAM_TIMEOUT);
  }

  private emitPartTimeout(): void {
    this.emit(PART_TIMEOUT);
    this.emit(STREAM_TIMEOUT);
  }

  private finish(): void {
    this.clearTimeouts();
    this.emit(FULL_MESSAGE, this.collector);
    this.removeStreamListeners();
  }

  public addPart(part: ObjectFrame) {
    /*
     * Clear old timeouts
     * First message timeout will be destroyed and not created again
     * Part timeout will be recreated at the end of this method
     */
    this.clearTimeouts();
    this.messageCounter.remove(part.index, part.done);
    part.chunk.forEach((obj) => {
      Object.entries(obj).forEach(([key, value]) => {
        const splitted = key.split(/(?<!\\)\./gm);
        this.collector = this.decode(splitted, value, this.collector);
      });
    });
    this.emit(PART, part, part.index);
    if (this.messageCounter.isFinished) {
      this.finish();
    }

    /*
     * Start part timeout
     */
    if (this.options.part_timeout_seconds) {
      this.part_timeout_handle = setTimeout(() => {
        this.emitPartTimeout();
      }, this.options.part_timeout_seconds * 1000);
    }
  }

  public removeStreamListeners() {
    const event_types = [
      PART,
      PART_TIMEOUT,
      STREAM_TIMEOUT,
      FIRST_TIMEOUT,
      FULL_MESSAGE,
    ];
    for (const item of event_types) {
      this.removeAllListeners(item);
    }
  }
  private clearTimeouts() {
    if (this.first_message_timeout_handle) {
      clearTimeout(this.first_message_timeout_handle);
      this.first_message_timeout_handle = undefined;
    }
    if (this.part_timeout_handle) {
      clearTimeout(this.part_timeout_handle);
      this.part_timeout_handle = undefined;
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
