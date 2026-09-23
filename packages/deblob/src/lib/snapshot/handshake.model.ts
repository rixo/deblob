/**
 * Who may open the channel. A WebSocket handshake is not gated by CORS: the
 * browser sends `Origin` and connects, and only the server can refuse it (RFC
 * 6455 §10.2). These are the two headers that say where a handshake came from,
 * and the rule over them.
 *
 * Three clauses, in order:
 *
 * 1. `host` is a loopback authority. This is the rebinding clause, and it is why
 *    clause 3 is not enough alone: a page at `http://evil.example:3615` whose
 *    DNS answers `127.0.0.1` sends an `Origin` and a `Host` that match each
 *    other, because the attacker owns both.
 * 2. `origin` is there. A browser always sets it and a page cannot suppress it, so
 *    no page is refused here; what is refused is the thing that makes a request
 *    without choosing its headers.
 * 3. `origin` is `http`, on a loopback name, on the same port as `host`. The port
 *    carries the rule — a page that is not ours cannot hold our port on the
 *    loopback, because that address and port are this server. The loopback
 *    names alias each other, so `localhost:3615` may talk to `127.0.0.1:3615`.
 *
 * Nothing here is a secret: an `Origin` is forgeable by anything that is not a
 * browser. The rule keeps out pages, which is what a local server needs.
 */

export type Handshake = {
  readonly origin: string | undefined
  readonly host: string | undefined
}

/** As the URL parser writes them — IPv6 keeps its brackets. */
const LOOPBACK: ReadonlySet<string> = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
])

/** The network's input, not ours: what does not parse is not an authority. */
const parsed = (url: string): URL | null => {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

/** `http` leaves the port out when it is 80; compare them spelled out. */
const portOf = (url: URL): string => (url.port === "" ? "80" : url.port)

const isLoopback = (url: URL): boolean => LOOPBACK.has(url.hostname)

export const allowsHandshake = ({ origin, host }: Handshake): boolean => {
  if (host === undefined) return false
  const served = parsed(`http://${host}`)
  if (served === null || !isLoopback(served)) return false
  if (origin === undefined) return false
  const from = parsed(origin)
  if (from === null) return false
  return (
    from.protocol === "http:" &&
    isLoopback(from) &&
    portOf(from) === portOf(served)
  )
}
