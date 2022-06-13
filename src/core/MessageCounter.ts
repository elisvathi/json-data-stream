export class MessageCounter {
  private max: number;
  private is_done: boolean;
  private elements: boolean[];

  public constructor() {
    this.max = -1;
    this.is_done = false;
    this.elements = [];
  }

  private set_max(num: number) {
    if (num > this.max) {
      for (let i = this.max + 1; i <= num; i++) {
        this.elements[i] = true;
      }
      this.max = num;
    }
  }

  public remove(item: number, done?: boolean) {
    this.is_done = this.is_done || !!done;
    this.set_max(item);
    if (this.elements[item]) {
      this.elements[item] = false;
      return true;
    }
    return false;
  }

  private get hasGaps() {
    for (const v of this.elements) {
      if (v) {
        return true;
      }
    }
    return false;
  }

  public get isFinished() {
    return this.is_done && !this.hasGaps;
  }
}
