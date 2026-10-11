import gLong from './gLong';

/**
 * A ByteStream, implemented using a NodeBuffer.
 */
export default class ByteStream {
  private _index: number = 0;

  constructor(private buffer: NodeBuffer) {}

  private checkAvailable(bytesCount: number): void {
    if (typeof bytesCount !== 'number' || bytesCount !== Math.floor(bytesCount) ||
        bytesCount < 0 || bytesCount > this.buffer.length - this._index) {
      throw new RangeError('Invalid or truncated byte stream read: ' + bytesCount +
        ' bytes at ' + this._index + ' of ' + this.buffer.length);
    }
  }

  /**
   * Returns the current read index, and increments the index by the indicated
   * amount.
   */
  private incIndex(inc: number): number {
    this.checkAvailable(inc);
    var readIndex = this._index;
    this._index += inc;
    return readIndex;
  }

  public rewind(): void {
    this._index = 0;
  }

  public seek(idx: number) {
    if (typeof idx !== 'number' || idx !== Math.floor(idx) || idx < 0 || idx > this.buffer.length) {
      throw new RangeError('Invalid byte stream seek position: ' + idx);
    }
    this._index = idx;
  }

  public pos(): number {
    return this._index;
  }

  public skip(bytesCount: number): void {
    this.incIndex(bytesCount);
  }

  public hasBytes(): boolean {
    return this._index < this.buffer.length;
  }

  public getFloat(): number {
    return this.buffer.readFloatBE(this.incIndex(4));
  }

  public getDouble(): number {
    return this.buffer.readDoubleBE(this.incIndex(8));
  }

  public getUint(byteCount: number): number {
    switch (byteCount) {
      case 1:
        return this.getUint8();
      case 2:
        return this.getUint16();
      case 4:
        return this.getUint32();
      default:
        throw new Error("Invalid byte count for getUint: " + byteCount);
    }
  }

  public getInt(byteCount: number): number {
    switch (byteCount) {
      case 1:
        return this.getInt8();
      case 2:
        return this.getInt16();
      case 4:
        return this.getInt32();
      default:
        throw new Error("Invalid byte count for getUint: " + byteCount);
    }
  }

  public getUint8(): number {
    return this.buffer[this.incIndex(1)];
  }

  public getUint16(): number {
    return this.buffer.readUInt16BE(this.incIndex(2));
  }

  public getUint32(): number {
    return this.buffer.readUInt32BE(this.incIndex(4));
  }

  public getInt8(): number {
    return this.buffer.readInt8(this.incIndex(1));
  }

  public getInt16(): number {
    return this.buffer.readInt16BE(this.incIndex(2));
  }

  public getInt32(): number {
    return this.buffer.readInt32BE(this.incIndex(4));
  }

  public getInt64(): gLong {
    var index = this.incIndex(8),
      high = this.buffer.readUInt32BE(index),
      low = this.buffer.readUInt32BE(index + 4);
    return gLong.fromBits(low, high);
  }

  public read(bytesCount: number): Buffer {
    var index = this.incIndex(bytesCount);
    return this.buffer.slice(index, index + bytesCount);
  }

  public peek(): number {
    this.checkAvailable(1);
    return this.buffer[this._index];
  }

  public size(): number {
    return this.buffer.length - this._index;
  }

  public slice(len: number): ByteStream {
    return new ByteStream(this.read(len));
  }

  public getBuffer(): NodeBuffer {
    return this.buffer;
  }
}
