/**
 * JSON-RPC 2.0 method registry (transport-agnostic: used by HTTP POST /rpc and the /ws socket).
 */
class RpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

class RpcRegistry {
  constructor({ adminToken, logger } = {}) {
    this.methods = new Map();
    this.adminToken = adminToken || '';
    this.logger = logger;
  }

  /** @param {{admin?: boolean}} [opts] admin methods require the ADMIN_TOKEN when one is configured */
  register(name, handler, opts = {}) {
    this.methods.set(name, { handler, admin: Boolean(opts.admin) });
    return this;
  }

  list() {
    return [...this.methods.entries()].map(([name, m]) => ({ name, admin: m.admin }));
  }

  async call(method, params = {}, ctx = {}) {
    const entry = this.methods.get(method);
    if (!entry) throw new RpcError(-32601, `Method not found: ${method}`);
    if (entry.admin && this.adminToken && ctx.token !== this.adminToken) {
      throw new RpcError(-32001, 'Unauthorized: admin token required');
    }
    return entry.handler(params || {}, ctx);
  }

  /** Handles one request object and returns the response object (or null for notifications). */
  async handle(req, ctx = {}) {
    const id = req && Object.prototype.hasOwnProperty.call(req, 'id') ? req.id : undefined;
    if (!req || typeof req.method !== 'string') {
      return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid Request' } };
    }
    try {
      const result = await this.call(req.method, req.params, ctx);
      return id === undefined ? null : { jsonrpc: '2.0', id, result: result === undefined ? null : result };
    } catch (err) {
      if (!(err instanceof RpcError)) this.logger?.warn(`RPC ${req.method} failed: ${err.message}`);
      return id === undefined ? null : { jsonrpc: '2.0', id, error: { code: err.code || -32000, message: err.message || 'Server error' } };
    }
  }
}

module.exports = { RpcRegistry, RpcError };
