import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";
import { brotliDecompress, gunzip, inflate } from "node:zlib";
import { promisify } from "node:util";

export const MAX_WEB_PAGE_BYTES = 2 * 1024 * 1024;
export const MAX_WEB_PAGE_REDIRECTS = 5;
export const WEB_FETCH_TIMEOUT_MS = 15_000;
export const MAX_RESPONSE_HEADER_BYTES = 16 * 1024;

const gunzipAsync = promisify(gunzip);
const inflateAsync = promisify(inflate);
const brotliAsync = promisify(brotliDecompress);

export type WebFetchErrorCode =
  | "UNSAFE_URL" | "FETCH_FAILED" | "FETCH_TIMEOUT" | "TOO_MANY_REDIRECTS"
  | "REDIRECT_DOWNGRADE" | "RESPONSE_TOO_LARGE" | "UNSUPPORTED_CONTENT_TYPE"
  | "UNREADABLE_RESPONSE";

export class WebPageFetchError extends Error {
  constructor(public readonly code: WebFetchErrorCode, message: string = code) {
    super(message);
    this.name = "WebPageFetchError";
  }
}

const blocked = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 96], ["::1", 128], ["64:ff9b::", 96], ["64:ff9b:1::", 48],
  ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7],
  ["fe80::", 10], ["ff00::", 8],
] as const) blocked.addSubnet(network, prefix, "ipv6");

export function isPublicAddress(address: string, family?: number) {
  const mappedDotted = /^(?:::ffff:|0:0:0:0:0:ffff:)(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mappedDotted) return isPublicAddress(mappedDotted[1], 4);
  const mappedHex = /^(?:::ffff:|0:0:0:0:0:ffff:)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (mappedHex) {
    const high = Number.parseInt(mappedHex[1], 16);
    const low = Number.parseInt(mappedHex[2], 16);
    return isPublicAddress(`${high >>> 8}.${high & 0xff}.${low >>> 8}.${low & 0xff}`, 4);
  }
  const detected = family === 4 || family === 6 ? family : isIP(address);
  return detected === 4 ? !blocked.check(address, "ipv4")
    : detected === 6 ? !blocked.check(address, "ipv6") : false;
}

export function validateWebUrl(value: string, previous?: URL) {
  let url: URL;
  try { url = new URL(value, previous); } catch { throw new WebPageFetchError("UNSAFE_URL", "URL is invalid."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new WebPageFetchError("UNSAFE_URL", "Only HTTP and HTTPS are allowed.");
  if (url.username || url.password) throw new WebPageFetchError("UNSAFE_URL", "URL credentials are not allowed.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) throw new WebPageFetchError("UNSAFE_URL", "IP-literal destinations are not allowed.");
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/u, "");
  if (normalizedHostname === "localhost" || normalizedHostname.endsWith(".localhost")
    || normalizedHostname.endsWith(".local") || normalizedHostname.endsWith(".internal")) {
    throw new WebPageFetchError("UNSAFE_URL", "Local hostnames are not allowed.");
  }
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  if (!((url.protocol === "http:" && port === "80") || (url.protocol === "https:" && port === "443"))) {
    throw new WebPageFetchError("UNSAFE_URL", "The destination port is not allowed.");
  }
  if (previous?.protocol === "https:" && url.protocol === "http:") {
    throw new WebPageFetchError("REDIRECT_DOWNGRADE", "HTTPS redirects may not downgrade to HTTP.");
  }
  url.hash = "";
  return url;
}

type Resolver = (hostname: string) => Promise<LookupAddress[]>;
type Requester = (url: URL, options: RequestOptions) => ReturnType<typeof httpRequest>;

const defaultResolver: Resolver = (hostname) => new Promise((resolve, reject) => {
  dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => error ? reject(error) : resolve(addresses));
});

async function withinDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new WebPageFetchError("FETCH_TIMEOUT")), milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseContentType(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value ?? "";
  const [mime, ...parameters] = raw.split(";").map((part) => part.trim().toLowerCase());
  if (mime !== "text/html" && mime !== "text/plain") throw new WebPageFetchError("UNSUPPORTED_CONTENT_TYPE");
  const charset = parameters.find((part) => part.startsWith("charset="))?.slice(8).replace(/^['"]|['"]$/g, "") || null;
  return { mime: mime as "text/html" | "text/plain", charset };
}

async function decompress(body: Buffer, encoding: string | undefined) {
  try {
    if (!encoding || encoding === "identity") return body;
    if (encoding === "gzip") return await gunzipAsync(body, { maxOutputLength: MAX_WEB_PAGE_BYTES + 1 });
    if (encoding === "deflate") return await inflateAsync(body, { maxOutputLength: MAX_WEB_PAGE_BYTES + 1 });
    if (encoding === "br") return await brotliAsync(body, { maxOutputLength: MAX_WEB_PAGE_BYTES + 1 });
    throw new WebPageFetchError("UNREADABLE_RESPONSE", "Unsupported content encoding.");
  } catch (error) {
    if (error instanceof WebPageFetchError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") throw new WebPageFetchError("RESPONSE_TOO_LARGE");
    throw new WebPageFetchError("UNREADABLE_RESPONSE");
  }
}

export interface FetchedWebPage {
  requestedUrl: string;
  canonicalUrl: string;
  contentType: "text/html" | "text/plain";
  charset: string | null;
  body: Buffer;
  fetchedAt: string;
  redirectCount: number;
}

export async function fetchWebPage(value: string, dependencies?: { resolver?: Resolver; requester?: Requester; now?: () => number }): Promise<FetchedWebPage> {
  const resolver = dependencies?.resolver ?? defaultResolver;
  const requester: Requester = dependencies?.requester ?? ((url, options) => (url.protocol === "https:" ? httpsRequest : httpRequest)(url, options));
  const now = dependencies?.now ?? Date.now;
  const startedAt = now();
  let current = validateWebUrl(value);

  for (let redirectCount = 0; redirectCount <= MAX_WEB_PAGE_REDIRECTS; redirectCount += 1) {
    const remaining = WEB_FETCH_TIMEOUT_MS - (now() - startedAt);
    if (remaining <= 0) throw new WebPageFetchError("FETCH_TIMEOUT");
    let addresses: LookupAddress[];
    try { addresses = await withinDeadline(resolver(current.hostname), remaining); }
    catch (error) {
      if (error instanceof WebPageFetchError) throw error;
      throw new WebPageFetchError("FETCH_FAILED", "DNS resolution failed.");
    }
    if (!addresses.length || addresses.some(({ address, family }) => !isPublicAddress(address, family))) {
      throw new WebPageFetchError("UNSAFE_URL", "Destination does not resolve exclusively to public addresses.");
    }
    const selected = addresses[0];
    const response = await new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Buffer }>((resolve, reject) => {
      const request = requester(current, {
        method: "GET",
        agent: false,
        maxHeaderSize: MAX_RESPONSE_HEADER_BYTES,
        headers: { Accept: "text/html,text/plain;q=0.9", "Accept-Encoding": "gzip, deflate, br", "User-Agent": "LearningApp-SourceFetcher/1.0" },
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [selected]);
          else callback(null, selected.address, selected.family);
        },
      });
      const timer = setTimeout(() => request.destroy(new WebPageFetchError("FETCH_TIMEOUT")), remaining);
      const rejectRequest = (error: unknown) => { clearTimeout(timer); reject(error); };
      request.once("error", rejectRequest);
      request.once("response", (incoming) => {
        const chunks: Buffer[] = [];
        let compressedBytes = 0;
        incoming.on("data", (chunk: Buffer) => {
          compressedBytes += chunk.length;
          // Bound compressed input as well as decompressed output to limit memory/CPU amplification.
          if (compressedBytes > MAX_WEB_PAGE_BYTES) request.destroy(new WebPageFetchError("RESPONSE_TOO_LARGE"));
          else chunks.push(Buffer.from(chunk));
        });
        incoming.once("end", () => {
          clearTimeout(timer);
          resolve({ status: incoming.statusCode ?? 0, headers: incoming.headers, body: Buffer.concat(chunks) });
        });
        incoming.once("error", rejectRequest);
      });
      request.end();
    }).catch((error: unknown) => {
      if (error instanceof WebPageFetchError) throw error;
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === "HPE_HEADER_OVERFLOW") throw new WebPageFetchError("UNREADABLE_RESPONSE", "Response headers exceed the safe limit.");
      throw new WebPageFetchError("FETCH_FAILED");
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
      if (!location) throw new WebPageFetchError("UNREADABLE_RESPONSE", "Redirect has no target.");
      if (redirectCount === MAX_WEB_PAGE_REDIRECTS) throw new WebPageFetchError("TOO_MANY_REDIRECTS");
      current = validateWebUrl(location, current);
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new WebPageFetchError("FETCH_FAILED", `Upstream returned HTTP ${response.status}.`);
    const { mime, charset } = parseContentType(response.headers["content-type"]);
    const declared = Number(Array.isArray(response.headers["content-length"]) ? response.headers["content-length"][0] : response.headers["content-length"]);
    if (Number.isFinite(declared) && declared > MAX_WEB_PAGE_BYTES) throw new WebPageFetchError("RESPONSE_TOO_LARGE");
    const encoding = (Array.isArray(response.headers["content-encoding"]) ? response.headers["content-encoding"][0] : response.headers["content-encoding"])?.toLowerCase();
    const body = await decompress(response.body, encoding);
    if (body.length > MAX_WEB_PAGE_BYTES) throw new WebPageFetchError("RESPONSE_TOO_LARGE");
    if (!body.length) throw new WebPageFetchError("UNREADABLE_RESPONSE");
    return { requestedUrl: value, canonicalUrl: current.toString(), contentType: mime, charset, body, fetchedAt: new Date().toISOString(), redirectCount };
  }
  throw new WebPageFetchError("TOO_MANY_REDIRECTS");
}
