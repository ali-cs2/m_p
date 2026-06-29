const Timer = {
  startTime: null,
  elapsed: 0,
  running: false,

  start() {
    if (this.running) return;
    this.startTime = performance.now();
    this.running = true;
  },

  stop() {
    if (!this.running || this.startTime === null) return this.elapsed;
    this.elapsed = Math.round(performance.now() - this.startTime);
    this.running = false;
    return this.elapsed;
  },

  reset() {
    this.startTime = null;
    this.elapsed = 0;
    this.running = false;
  }
};
