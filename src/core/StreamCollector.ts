// import { EventEmitter } from 'stream';
//
// import { ArrayReadableStream, EventType } from './MessageStream';
// import {
//   EventTypes,
//   STREAM_FULL_MESSAGE_EVENT_KEY,
//   STREAM_MESSAGE_PART_EVENT_KEY,
// } from './ReadableStream';
//
// type COLLECTOR_EVENT_KEY = `${EventTypes}_${string}`;
//
// type CollectorEvtHandlerByKey<
//   TMsg,
//   T extends COLLECTOR_EVENT_KEY,
//   > = T extends `${typeof STREAM_MESSAGE_PART_EVENT_KEY}_${string}`
//   ? (part: TMsg[], part_index?: number, message_count?: number) => void
//   : (full_array: TMsg[]) => void;
//
// export class StreamCollector<T> extends EventEmitter {
//   public streams: Record<string, ArrayReadableStream<T>> = {};
//
//   public addPart(
//     message_id: string,
//     part: T[],
//     part_index: number,
//     stream_length: number,
//   ): void {
//     if (!this.streams[message_id]) {
//       this.createStream(message_id, stream_length);
//     }
//     this.streams[message_id].addPart(part, part_index);
//   }
//
//   public on<E extends COLLECTOR_EVENT_KEY>(
//     evt: E,
//     handler: CollectorEvtHandlerByKey<T, E>,
//   ): this {
//     super.on(evt, handler);
//     return this;
//   }
//
//   public once<E extends COLLECTOR_EVENT_KEY>(
//     evt: E,
//     handler: CollectorEvtHandlerByKey<T, E>,
//   ): this {
//     super.once(evt, handler);
//     return this;
//   }
//
//   private createStream(message_id: string, stream_length: number) {
//     const stream = new ArrayReadableStream<T>(stream_length);
//     stream.on(
//       STREAM_MESSAGE_PART_EVENT_KEY,
//       (part, part_index, message_count) => {
//         this.emit(
//           `${STREAM_MESSAGE_PART_EVENT_KEY}_${message_id}`,
//           part,
//           part_index,
//           message_count,
//         );
//       },
//     );
//     stream.once(STREAM_FULL_MESSAGE_EVENT_KEY, (message) => {
//       this.emit(`${STREAM_FULL_MESSAGE_EVENT_KEY}_${message_id}`, message);
//       this.removeStream(message_id);
//     });
//     this.streams[message_id] = stream;
//   }
//
//   /*
//    * Remove a stream from the collector.
//    * This will clear the memory that message stream takes
//    */
//   private removeStream(message_id: string): void {
//     delete this.streams[message_id];
//     this.removeAllListeners(`${STREAM_FULL_MESSAGE_EVENT_KEY}_${message_id}`);
//     this.removeAllListeners(`${STREAM_MESSAGE_PART_EVENT_KEY}_${message_id}`);
//   }
// }
