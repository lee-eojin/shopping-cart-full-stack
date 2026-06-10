import JSDOMEnvironment from "jest-environment-jsdom";
import { TextDecoder, TextEncoder } from "node:util";
import { ReadableStream, TransformStream, WritableStream } from "node:stream/web";
import { Blob } from "node:buffer";
import { performance } from "node:perf_hooks";
import { BroadcastChannel } from "node:worker_threads";

// Capture Node 22 fetch globals BEFORE jsdom sandboxes the context
const { fetch, Request, Response, Headers } = globalThis;

export default class CustomJSDOMEnvironment extends JSDOMEnvironment {
  // jsdom adds "browser" by default — this resolves MSW to its ESM browser build
  // which Jest (CJS mode) can't parse. Override to use Node resolution.
  exportConditions() {
    return ["node", "require", "default"];
  }

  async setup() {
    await super.setup();
    Object.assign(this.global, {
      fetch,
      Request,
      Response,
      Headers,
      TextEncoder,
      TextDecoder,
      ReadableStream,
      TransformStream,
      WritableStream,
      Blob,
      performance,
      BroadcastChannel,
    });
  }
}
