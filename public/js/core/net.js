// JSON-RPC 2.0 over WebSocket with auto-reconnect, plus an HTTP fallback for calls.

export class WeddingSocket {
  constructor({ role = 'stage', token = '' } = {}) {
    this.role = role;
    this.token = token;
    this.handlers = new Map();
    this.pending = new Map();
    this.seq = 0;
    this.ws = null;
    this.connected = false;
    this.retryMs = 800;
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, new Set());
    this.handlers.get(method).add(fn);
    return this;
  }

  emitLocal(method, params) {
    for (const fn of this.handlers.get(method) || []) {
      try {
        fn(params);
      } catch (err) {
        console.error(`[net] handler for ${method} failed`, err);
      }
    }
  }

  connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const qs = new URLSearchParams({ role: this.role });
    if (this.token) qs.set('token', this.token);
    const ws = new WebSocket(`${proto}://${location.host}/ws?${qs}`);
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      this.retryMs = 800;
      this.emitLocal('socket.open');
    };
    ws.onclose = () => {
      this.connected = false;
      this.emitLocal('socket.close');
      for (const [, p] of this.pending) p.reject(new Error('socket closed'));
      this.pending.clear();
      setTimeout(() => this.connect(), this.retryMs);
      this.retryMs = Math.min(8000, this.retryMs * 1.6);
    };
    ws.onerror = () => {};
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch (_) {
        return;
      }
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? p.reject(Object.assign(new Error(msg.error.message), { code: msg.error.code })) : p.resolve(msg.result);
      } else if (msg.method) {
        this.emitLocal(msg.method, msg.params);
      }
    };
  }

  /** RPC call: over the socket when open, otherwise HTTP POST /rpc. */
  async call(method, params = {}) {
    if (this.connected && this.ws?.readyState === 1) {
      const id = ++this.seq;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params: this.token ? { ...params, token: this.token } : params }));
        setTimeout(() => {
          if (this.pending.has(id)) {
            this.pending.delete(id);
            reject(new Error(`RPC timeout: ${method}`));
          }
        }, 20000);
      });
    }
    const res = await fetch('/rpc', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.token ? { 'x-admin-token': this.token } : {}) },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++this.seq, method, params })
    });
    const json = await res.json();
    if (json.error) throw Object.assign(new Error(json.error.message), { code: json.error.code });
    return json.result;
  }
}
