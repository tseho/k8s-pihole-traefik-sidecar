type Callback = () => Promise<void>;

class AsyncQueue {
  private lock: Promise<void> = Promise.resolve();

  public async enqueue(callback: Callback): Promise<void> {
    const prev = this.lock;
    this.lock = this.lock.then(callback);
    await prev;
  }
}

const queue = new AsyncQueue();

export default queue;
