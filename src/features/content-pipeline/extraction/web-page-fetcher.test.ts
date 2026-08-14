import { EventEmitter } from "node:events";
import type { LookupAddress, LookupOptions } from "node:dns";
import type { RequestOptions } from "node:http";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { fetchWebPage, isPublicAddress, MAX_WEB_PAGE_BYTES, validateWebUrl } from "./web-page-fetcher";

function requester(responses: Array<{ status?: number; headers?: Record<string, string>; body?: Buffer }>) {
  return (_url: URL, options: RequestOptions) => {
    const request = new EventEmitter() as EventEmitter & { end(): void; destroy(error?: Error): void };
    request.end = () => queueMicrotask(() => {
      const response = responses.shift();
      if (!response) return request.emit("error", new Error("missing response"));
      const incoming = Readable.from([response.body ?? Buffer.from("Readable evidence ".repeat(10))]) as Readable & {
        statusCode: number; headers: Record<string, string>;
      };
      incoming.statusCode = response.status ?? 200;
      incoming.headers = response.headers ?? { "content-type": "text/plain" };
      request.emit("response", incoming);
    });
    request.destroy = (error) => { if (error) request.emit("error", error); request.emit("close"); };
    (request as EventEmitter & { capturedOptions?: RequestOptions }).capturedOptions = options;
    return request as never;
  };
}

const publicDns = async () => [{ address: "93.184.216.34", family: 4 as const }];

function nodeAllLookupRequester(expected: LookupAddress) {
  return (url: URL, options: RequestOptions) => {
    const request = new EventEmitter() as EventEmitter & { end(): void; destroy(error?: Error): void };
    request.end = () => queueMicrotask(() => {
      const lookup = options.lookup;
      if (!lookup) return request.emit("error", new Error("missing bound lookup"));
      lookup(url.hostname, { all: true } as LookupOptions, (error, addresses) => {
        if (error) return request.emit("error", error);
        if (!Array.isArray(addresses) || addresses.length !== 1 ||
          addresses[0].address !== expected.address || addresses[0].family !== expected.family) {
          const invalidAddress = new TypeError("Invalid IP address: undefined") as TypeError & { code: string };
          invalidAddress.code = "ERR_INVALID_IP_ADDRESS";
          return request.emit("error", invalidAddress);
        }
        const incoming = Readable.from([Buffer.from("Controlled public HTTPS evidence ".repeat(5))]) as Readable & {
          statusCode: number; headers: Record<string, string>;
        };
        incoming.statusCode = 200;
        incoming.headers = { "content-type": "text/html; charset=utf-8" };
        request.emit("response", incoming);
      });
    });
    request.destroy = (error) => { if (error) request.emit("error", error); request.emit("close"); };
    return request as never;
  };
}

describe("web-page fetch security", () => {
  it.each(["file:///etc/passwd", "ftp://example.com/a", "https://user:pass@example.com", "http://127.0.0.1", "http://[::1]", "https://example.com:8443"])(
    "rejects unsafe URL %s", (url) => expect(() => validateWebUrl(url)).toThrowError(expect.objectContaining({ code: "UNSAFE_URL" }))
  );

  it("blocks private, loopback, link-local, CGNAT, multicast, documentation, reserved and mapped addresses", () => {
    for (const address of ["0.0.0.1", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1", "172.16.0.1", "192.168.1.1", "198.51.100.2", "224.0.0.1", "240.0.0.1", "::1", "fc00::1", "fe80::1", "2001:db8::1", "::ffff:10.0.0.1", "::ffff:a00:1"]) {
      expect(isPublicAddress(address)).toBe(false);
    }
    expect(isPublicAddress("93.184.216.34")).toBe(true);
    expect(isPublicAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(true);
    expect(isPublicAddress("::ffff:5db8:d822")).toBe(true);
  });

  it("rejects mixed DNS answers and revalidates every redirect target", async () => {
    await expect(fetchWebPage("https://example.com", {
      resolver: async () => [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }],
      requester: requester([]),
    })).rejects.toMatchObject({ code: "UNSAFE_URL" });
    await expect(fetchWebPage("https://example.com", {
      resolver: publicDns,
      requester: requester([{ status: 302, headers: { location: "https://127.0.0.1/private" } }]),
    })).rejects.toMatchObject({ code: "UNSAFE_URL" });
    expect(() => validateWebUrl("http://example.com", new URL("https://example.com"))).toThrowError(expect.objectContaining({ code: "REDIRECT_DOWNGRADE" }));
  });

  it("binds the validated address to lookup and sends only fixed safe headers", async () => {
    let captured: Record<string, unknown> | undefined;
    const base = requester([{ headers: { "content-type": "text/plain; charset=utf-8" } }]);
    const result = await fetchWebPage("https://example.com/path", {
      resolver: publicDns,
      requester: (url: URL, options: RequestOptions) => { captured = options as Record<string, unknown>; return base(url, options); },
    });
    expect(result.canonicalUrl).toBe("https://example.com/path");
    expect(captured?.headers).toEqual({ Accept: "text/html,text/plain;q=0.9", "Accept-Encoding": "gzip, deflate, br", "User-Agent": "LearningApp-SourceFetcher/1.0" });
    expect(captured?.maxHeaderSize).toBe(16 * 1024);
    const lookup = captured?.lookup as (_h: string, _o: unknown, cb: (e: null, a: string, f: number) => void) => void;
    let connected = ""; lookup("example.com", {}, (_error, address) => { connected = address; });
    expect(connected).toBe("93.184.216.34");
  });

  it.each([
    ["IPv4", { address: "93.184.216.34", family: 4 as const }],
    ["IPv6", { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 as const }],
  ])("returns a bound public %s address in Node's all-address lookup shape", async (_label, selected) => {
    const result = await fetchWebPage("https://example.com/evidence", {
      resolver: async () => [selected],
      requester: nodeAllLookupRequester(selected),
    });

    expect(result).toMatchObject({
      canonicalUrl: "https://example.com/evidence",
      contentType: "text/html",
    });
    expect(result.body.length).toBeGreaterThan(0);
  });

  it("preserves the original HTTPS hostname and certificate validation defaults", async () => {
    let requestedHostname = "";
    let captured: (RequestOptions & { rejectUnauthorized?: boolean }) | undefined;
    const base = requester([{ headers: { "content-type": "text/html" } }]);

    await fetchWebPage("https://example.com/secure", {
      resolver: publicDns,
      requester: (url, options) => {
        requestedHostname = url.hostname;
        captured = options;
        return base(url, options);
      },
    });

    expect(requestedHostname).toBe("example.com");
    expect(captured?.rejectUnauthorized).not.toBe(false);
    const lookup = captured?.lookup;
    expect(lookup).toBeTypeOf("function");
    let bound: LookupAddress[] | undefined;
    lookup?.("example.com", { all: true } as LookupOptions, (_error, addresses) => {
      bound = addresses as LookupAddress[];
    });
    expect(bound).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });

  it("enforces MIME and declared/decompressed size limits", async () => {
    await expect(fetchWebPage("https://example.com", { resolver: publicDns, requester: requester([{ headers: { "content-type": "application/json" } }]) })).rejects.toMatchObject({ code: "UNSUPPORTED_CONTENT_TYPE" });
    await expect(fetchWebPage("https://example.com", { resolver: publicDns, requester: requester([{ headers: { "content-type": "text/plain", "content-length": String(MAX_WEB_PAGE_BYTES + 1) } }]) })).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
    const compressed = gzipSync(Buffer.alloc(MAX_WEB_PAGE_BYTES + 1, 97));
    await expect(fetchWebPage("https://example.com", { resolver: publicDns, requester: requester([{ headers: { "content-type": "text/plain", "content-encoding": "gzip" }, body: compressed }]) })).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });

  it("stops redirects after five hops", async () => {
    const responses = Array.from({ length: 6 }, (_, index) => ({ status: 302, headers: { location: `https://example.com/${index}` } }));
    await expect(fetchWebPage("https://example.com/start", { resolver: publicDns, requester: requester(responses) })).rejects.toMatchObject({ code: "TOO_MANY_REDIRECTS" });
  });

  it("enforces one overall 15-second deadline", async () => {
    let call = 0;
    await expect(fetchWebPage("https://example.com", {
      resolver: publicDns, requester: requester([]), now: () => call++ === 0 ? 0 : 15_001,
    })).rejects.toMatchObject({ code: "FETCH_TIMEOUT" });
  });
});
