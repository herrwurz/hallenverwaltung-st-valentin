/**
 * Minimal SMTP client using only Node.js built-ins (node:net, node:tls).
 * Supports STARTTLS (port 587) and direct TLS (port 465) with AUTH LOGIN.
 */
import * as net from "node:net";
import * as tls from "node:tls";

export class SmtpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmtpError";
  }
}

// ─── MIME construction ───────────────────────────────────────────────────────

function b64(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

function encodeHeader(value: string): string {
  // RFC 2047 encoded word for non-ASCII header values
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?utf-8?b?${b64(value)}?=`;
}

function formatAddress(nameAndAddress: string): string {
  const m = nameAndAddress.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) {
    const name = m[1].trim();
    const email = m[2].trim();
    return name ? `${encodeHeader(name)} <${email}>` : email;
  }
  return nameAndAddress.trim();
}

function base64Lines(input: string): string {
  // RFC 2045: max 76 chars per line
  const encoded = Buffer.from(input, "utf8").toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") ?? encoded;
}

function dotStuff(data: string): string {
  // SMTP DATA: escape lines starting with "."
  return data
    .split("\r\n")
    .map((l) => (l.startsWith(".") ? "." + l : l))
    .join("\r\n");
}

function buildMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const boundary = `_b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
  return [
    `From: ${formatAddress(params.from)}`,
    `To: ${params.to}`,
    `Subject: ${encodeHeader(params.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Lines(params.text),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    base64Lines(params.html),
    ``,
    `--${boundary}--`,
  ].join("\r\n");
}

// ─── SMTP session ─────────────────────────────────────────────────────────────

type SmtpResponse = { code: number; text: string };

class SmtpSession {
  private buf = "";

  constructor(
    private readonly socket: net.Socket | tls.TLSSocket,
    private readonly timeoutMs: number,
  ) {}

  /** Read one complete SMTP response (single- or multi-line). */
  read(): Promise<SmtpResponse> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new SmtpError("Timeout waiting for SMTP response"));
      }, this.timeoutMs);

      const onData = (chunk: Buffer) => {
        this.buf += chunk.toString("binary");
        // Final line: 3-digit code + SPACE + text + CRLF (not hyphen = not a continuation line)
        const m = this.buf.match(/(\d{3}) [^\r]*\r\n/);
        if (m) {
          const code = parseInt(m[1], 10);
          this.buf = this.buf.slice(m.index! + m[0].length);
          cleanup();
          resolve({ code, text: m[0].slice(4).trimEnd() });
        }
      };

      const onError = (err: Error) => {
        cleanup();
        reject(new SmtpError(`Socket error: ${err.message}`));
      };

      const cleanup = () => {
        clearTimeout(timer);
        this.socket.off("data", onData);
        this.socket.off("error", onError);
      };

      this.socket.on("data", onData);
      this.socket.on("error", onError);
    });
  }

  /** Send a single SMTP command line. */
  cmd(line: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.write(line + "\r\n", (err) =>
        err ? reject(new SmtpError(`Write error: ${err.message}`)) : resolve(),
      );
    });
  }

  /** Assert response code; throw SmtpError if it doesn't match. */
  expect(resp: SmtpResponse, code: number, ctx: string): void {
    if (resp.code !== code) {
      throw new SmtpError(`SMTP ${ctx}: expected ${code}, got ${resp.code} (${resp.text})`);
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type SmtpSendOptions = {
  host: string;
  port: number;
  /** true = TLS from start (port 465); false = STARTTLS (port 587) */
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  connectionTimeout?: number; // default 10 000 ms
  commandTimeout?: number;    // default  8 000 ms per SMTP command
  socketTimeout?: number;     // default 15 000 ms idle
};

function extractEmail(addr: string): string {
  return addr.match(/<([^>]+)>/)?.[1] ?? addr.trim();
}

function ehloHostname(from: string): string {
  const email = extractEmail(from);
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1) : "localhost";
}

export async function smtpSend(opts: SmtpSendOptions): Promise<void> {
  const connTimeout = opts.connectionTimeout ?? 10_000;
  const cmdTimeout  = opts.commandTimeout   ??  8_000;
  const sockTimeout = opts.socketTimeout    ?? 15_000;
  const ehloHost    = ehloHostname(opts.from);

  // 1. Open connection ────────────────────────────────────────────────────────

  let socket: net.Socket | tls.TLSSocket;

  if (opts.secure) {
    socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const timer = setTimeout(() => { sock.destroy(); reject(new SmtpError("TLS connection timeout")); }, connTimeout);
      const sock  = tls.connect(
        { host: opts.host, port: opts.port, servername: opts.host, rejectUnauthorized: true },
        () => { clearTimeout(timer); resolve(sock); },
      );
      sock.once("error", (e) => { clearTimeout(timer); reject(new SmtpError(`TLS connect: ${e.message}`)); });
    });
  } else {
    socket = await new Promise<net.Socket>((resolve, reject) => {
      const timer = setTimeout(() => { sock.destroy(); reject(new SmtpError("TCP connection timeout")); }, connTimeout);
      const sock  = net.createConnection({ host: opts.host, port: opts.port });
      sock.once("connect", () => { clearTimeout(timer); resolve(sock); });
      sock.once("error",   (e) => { clearTimeout(timer); reject(new SmtpError(`TCP connect: ${e.message}`)); });
    });
  }

  socket.setTimeout(sockTimeout, () => socket.destroy(new SmtpError("Socket idle timeout")));

  try {
    let sess = new SmtpSession(socket, cmdTimeout);
    let r: SmtpResponse;

    // 2. Greeting + EHLO ───────────────────────────────────────────────────────

    r = await sess.read();
    sess.expect(r, 220, "greeting");

    await sess.cmd(`EHLO ${ehloHost}`);
    r = await sess.read();
    sess.expect(r, 250, "EHLO");

    // 3. STARTTLS upgrade ──────────────────────────────────────────────────────

    if (!opts.secure) {
      await sess.cmd("STARTTLS");
      r = await sess.read();
      sess.expect(r, 220, "STARTTLS");

      const tlsSock = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const ts = tls.connect(
          { socket: socket as net.Socket, host: opts.host, servername: opts.host, rejectUnauthorized: true },
          () => resolve(ts),
        );
        ts.once("error", (e) => reject(new SmtpError(`TLS upgrade: ${e.message}`)));
      });

      socket = tlsSock;
      sess   = new SmtpSession(socket, cmdTimeout);

      await sess.cmd(`EHLO ${ehloHost}`);
      r = await sess.read();
      sess.expect(r, 250, "EHLO after TLS");
    }

    // 4. AUTH LOGIN ────────────────────────────────────────────────────────────

    if (opts.user && opts.password) {
      await sess.cmd("AUTH LOGIN");
      r = await sess.read();
      sess.expect(r, 334, "AUTH LOGIN");

      await sess.cmd(b64(opts.user));
      r = await sess.read();
      sess.expect(r, 334, "AUTH username");

      await sess.cmd(b64(opts.password));
      r = await sess.read();
      sess.expect(r, 235, "AUTH password");
    }

    // 5. Envelope ──────────────────────────────────────────────────────────────

    const fromEmail = extractEmail(opts.from);

    await sess.cmd(`MAIL FROM:<${fromEmail}>`);
    r = await sess.read();
    sess.expect(r, 250, "MAIL FROM");

    await sess.cmd(`RCPT TO:<${opts.to}>`);
    r = await sess.read();
    sess.expect(r, 250, "RCPT TO");

    // 6. DATA ──────────────────────────────────────────────────────────────────

    await sess.cmd("DATA");
    r = await sess.read();
    sess.expect(r, 354, "DATA");

    const message = dotStuff(
      buildMimeMessage({ from: opts.from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html }),
    );

    await new Promise<void>((resolve, reject) => {
      socket.write(message + "\r\n.\r\n", (err) =>
        err ? reject(new SmtpError(`DATA write: ${err.message}`)) : resolve(),
      );
    });

    r = await sess.read();
    sess.expect(r, 250, "message accepted");

    // 7. QUIT ──────────────────────────────────────────────────────────────────

    await sess.cmd("QUIT");

  } finally {
    socket.destroy();
  }
}
