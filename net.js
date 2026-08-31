
(() => {
  class ArenaNet {
    constructor() {
      this.ws = null;
      this.connected = false;
      this.handlers = new Map();
      this.playerId = null;
    }

    on(type, fn) {
      if (!this.handlers.has(type)) this.handlers.set(type, []);
      this.handlers.get(type).push(fn);
    }

    emit(type, payload) {
      const list = this.handlers.get(type) || [];
      for (const fn of list) fn(payload);
    }

    async connect() {
      const url = window.CHEAT_ARENA_CONFIG.SERVER_URL;
      if (!url) throw new Error("SERVER_URL_NOT_SET");

      return new Promise((resolve, reject) => {
        let settled = false;
        this.ws = new WebSocket(url);

        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            try { this.ws.close(); } catch {}
            reject(new Error("CONNECTION_TIMEOUT"));
          }
        }, 8000);

        this.ws.addEventListener("open", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.connected = true;
          this.send("hello", {
            version: window.CHEAT_ARENA_CONFIG.CLIENT_VERSION,
            platform: window.PLATFORM.os
          });
          resolve();
        });

        this.ws.addEventListener("message", event => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "welcome") this.playerId = msg.playerId;
            this.emit(msg.type, msg.data ?? msg);
          } catch (err) {
            console.warn("Invalid server message", err);
          }
        });

        this.ws.addEventListener("close", () => {
          this.connected = false;
          this.emit("disconnect", {});
        });

        this.ws.addEventListener("error", () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error("CONNECTION_FAILED"));
          }
        });
      });
    }

    send(type, data = {}) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
      this.ws.send(JSON.stringify({ type, data }));
      return true;
    }

    close() {
      if (this.ws) this.ws.close();
    }
  }

  window.ArenaNet = new ArenaNet();
})();
