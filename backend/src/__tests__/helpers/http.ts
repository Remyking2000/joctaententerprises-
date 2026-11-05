import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import type express from "express";
import { AuthService, SESSION_COOKIE_NAME } from "../../services/auth.service.js";

export const adminSessionCookie = `${SESSION_COOKIE_NAME}=${AuthService.generateSessionToken({
  email: "ycremy2000@gmail.com",
  name: "Remy Admin",
  isAdmin: true,
})}`;

export interface InvokeResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>;
}

/**
 * Runs one request through the Express app in-process, without opening a
 * socket. Sends an admin session cookie unless `cookie` is null.
 */
export function invokeApp(
  app: express.Express,
  options: {
    method?: string;
    url: string;
    body?: unknown;
    cookie?: string | null;
  },
): Promise<InvokeResult> {
  return new Promise((resolve, reject) => {
    const req = new IncomingMessage(new Socket());
    req.method = options.method ?? "GET";
    req.url = options.url;

    const buf = Buffer.from(
      options.body !== undefined ? JSON.stringify(options.body) : "",
      "utf8",
    );
    const cookie = options.cookie === null ? undefined : options.cookie ?? adminSessionCookie;
    req.headers = {
      host: "localhost",
      "content-type": "application/json",
      "content-length": String(buf.length),
      ...(cookie ? { cookie } : {}),
    };

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, ...args: unknown[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      if (chunk && typeof chunk !== "function") {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      }
      (originalEnd as (...a: unknown[]) => ServerResponse)(chunk, ...args);
      const raw = Buffer.concat(chunks).toString("utf8");
      resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : {} });
      return res;
    }) as typeof res.end;

    try {
      if (options.body !== undefined) req.push(buf);
      req.push(null);
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}
