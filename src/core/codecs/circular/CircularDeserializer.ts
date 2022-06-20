class CircularDeserializer {
  public constructor(private data: unknown[]) {}

  private deserializeArray(array: unknown[]) {
    for (let i = 0; i < array.length; i++) {
      const item = array[i];
      if (!!item && typeof item === 'string') {
        const num = Number(item);
        if (!Number.isNaN(num) && num >= 0 && num < this.data.length) {
          array[i] = this.data[num];
        }
      }
    }
  }

  private deserializeObject(object: Record<string, unknown>) {
    for (const [key, value] of Object.entries(object)) {
      if (!!value && typeof value === 'string') {
        const num = Number(value);
        if (!Number.isNaN(num) && num >= 0 && num < this.data.length) {
          object[key] = this.data[num];
        }
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
