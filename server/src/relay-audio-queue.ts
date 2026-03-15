/**
 * @what - Bounded audio output queue between Gemini and browser WebSocket
 * @why - Prevents unbounded memory growth on slow connections + enables clean interruption
 * @exports - AudioOutputQueue
 */

import { logger } from './logger.js';

/**
 * Bounded FIFO queue for audio chunks flowing from Gemini → browser.
 *
 * On enqueue: flushes immediately (no artificial buffering delay).
 * On full: drops oldest chunk and logs backpressure warning.
 * On clear: drains all queued chunks (used during interruption).
 *
 * @pitfall - This is NOT a latency buffer. It's a backpressure safety net.
 *   In normal operation, chunks flow through instantly. The queue only fills
 *   when the browser can't consume fast enough.
 */
export class AudioOutputQueue {
  private queue: string[] = [];
  private readonly maxSize: number;
  private readonly sendFn: (data: string) => void;
  private backpressureCount = 0;

  constructor(sendFn: (data: string) => void, maxSize = 10) {
    this.sendFn = sendFn;
    this.maxSize = maxSize;
  }

  /**
   * Enqueue an audio chunk and flush immediately.
   * If queue is at capacity, drop oldest chunk (backpressure).
   */
  enqueue(data: string): void {
    if (this.queue.length >= this.maxSize) {
      this.queue.shift(); // drop oldest
      this.backpressureCount++;
      if (this.backpressureCount % 10 === 1) {
        logger.warn(
          {
            event: 'audio_queue_backpressure',
            code: 'RELAY_QUEUE_001',
            queueSize: this.queue.length,
            totalDropped: this.backpressureCount,
            action: 'Browser WebSocket consuming audio too slowly — dropping oldest chunks',
          },
          'Audio output queue backpressure — dropping oldest chunk',
        );
      }
    }
    this.queue.push(data);
    this.flush();
  }

  /**
   * Clear all queued chunks. Called on interruption — prevents audio
   * bleed-through when the user starts speaking over the character.
   */
  clear(): void {
    const cleared = this.queue.length;
    this.queue = [];
    if (cleared > 0) {
      logger.debug(
        { event: 'audio_queue_cleared', cleared },
        `Audio queue cleared: ${cleared} chunks discarded on interruption`,
      );
    }
  }

  /** Flush all queued chunks to the send function. */
  private flush(): void {
    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;
      this.sendFn(chunk);
    }
  }

  get size(): number {
    return this.queue.length;
  }

  get droppedCount(): number {
    return this.backpressureCount;
  }
}
