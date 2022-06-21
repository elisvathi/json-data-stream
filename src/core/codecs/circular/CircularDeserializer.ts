class CircularDeserializer {
  public constructor(private data: unknown[]) {}

  private deserializeArray(array: unknown[]) {
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (!!item && typeof item === 'string') {
        array[i] = this.data[Number(item)];
      }
    }
  }

  private deserializeObject(object: Record<string, unknown>) {
    for (const [key, value] of Object.entries(object)) {
      if (!!value && typeof value === 'string') {
        object[key] = this.data[Number(value)];
      }
    }
  }

  public deserialize() {
    for (let i = 0; i < this.data.length; i++) {
      const item = this.data[i];
      if (item) {
        if (Array.isArray(item)) {
          this.deserializeArray(item);
        } else if (typeof item === 'object') {
          this.deserializeObject(item as Record<string, unknown>);
        }
      }
    }
    return this.data[0];
  }
}

export function deserializeCircular(data: unknown[]): unknown {
  return new CircularDeserializer(data).deserialize();
}
