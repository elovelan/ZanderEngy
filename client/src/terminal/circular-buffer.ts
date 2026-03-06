export class CircularBuffer {
  private readonly capacity: number;
  private readonly data: string[];
  private head = 0;
  private size = 0;

  constructor(capacity: number = 1000) {
    this.capacity = capacity;
    this.data = new Array<string>(capacity);
  }

  write(line: string): void {
    this.data[this.head] = line;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  toArray(): string[] {
    if (this.size < this.capacity) return this.data.slice(0, this.size);
    return [...this.data.slice(this.head), ...this.data.slice(0, this.head)];
  }

  get length(): number {
    return this.size;
  }
}
