import { isPrimitive } from '../iterators/ObjectChunkIterator';

class CircularSerializer {
  private size: number = 0;
  private known: Map<unknown, string> = new Map<unknown, string>();
  private data: unknown[] = [];

  private setKnown(value: unknown): { index: string; exists: boolean } {
    if (this.known.has(value)) {
      const index = this.known.get(value) as string;
      return { index, exists: true };
    }
    let index = this.size++;
    this.known.set(value, index.toString());
    return { index: index.toString(), exists: false };
  }

  private setItem(value: unknown, index: string): void {
    this.data[Number(index)] = value;
  }

  private serializeArray(obj: unknown[], first: boolean) {
    const { index, exists } = this.setKnown(obj);
    if (exists) {
      return index;
    } else {
      const value = obj.map((x) => {
        return this.serialize(x, false);
      });
      this.setItem(value, index);
      return first ? value : index;
    }
  }

  private serializeObject(obj: Record<string, unknown>, first: boolean) {
    const { index, exists } = this.setKnown(obj);
    if (exists) {
      return index;
    } else {
      const value = Object.entries(obj).reduce<Record<string, unknown>>(
        (acc, [key, v]) => {
          acc[key] = this.serialize(v, false);
          return acc;
        },
        {},
      );
      this.setItem(value, index);
      return first ? value : index;
    }
  }

  private serializePrimitive(obj: unknown, first: boolean) {
    if (first) {
      this.setKnown(obj);
      this.setItem(obj, '0');
      return [obj];
    }
    if (!obj) {
      return obj;
    }
    if (typeof obj === 'string') {
      const { index: val, exists } = this.setKnown(obj);
      if (!exists) {
        this.setItem(obj, val);
      }
      return val;
    } else {
      return obj;
    }
  }

  public serialize(obj: unknown, first: boolean = true): unknown {
    if (isPrimitive(obj) || !obj) {
      return this.serializePrimitive(obj, first);
    } else {
      if (Array.isArray(obj)) {
        return this.serializeArray(obj, first);
      } else if (typeof obj === 'object') {
        return this.serializeObject(obj as Record<string, unknown>, first);
      }
    }
  }

  public getData(): unknown[] {
    return this.data;
  }
}

export function serializeCircular(data: unknown): unknown[] {
  const serializer = new CircularSerializer();
  serializer.serialize(data);
  return serializer.getData();
}
