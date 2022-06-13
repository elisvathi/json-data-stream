export interface StreamEncoder<T, TFrame> {
  encode(data: T): Generator<TFrame>;
}

export interface StreamDecoder<TFrame, T> {
  decode(data: TFrame[]): T;
}

export interface StreamCodec<T, TFrame>
  extends StreamEncoder<T, TFrame>,
  StreamDecoder<TFrame, T> { }
