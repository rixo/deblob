# Step 06 — channel access: the socket answers the viewer, not any page

Proposed and ratified 2026-09-16, after two rulings and one measurement moved it
(§ Open). Additive over steps 03–05: the protocol, the state shape and the
viewer's source do not change. What changes is who gets as far as speaking the
protocol.

## Goal

A WebSocket handshake is not gated by CORS. The browser sends `Origin` and
connects; only the server can refuse. RFC 6455 §10.2 says so directly — a server
not meant to take input from any web page must verify `Origin` — and nothing in
`createWsChannel` does. So while `deblob view` or the dev server runs, any page
open in the browser can speak our protocol.

Step 05's membership check bounds what that reaches to the configured projects.
This step closes the door itself.

Success:

- With either server running, a page served from anywhere else cannot open the
  channel: another site, another port on your own machine, or a hostname that
  resolves to the loopback.
- The viewer itself opens it, under `deblob view` and under `pnpm dev`, with no
  configuration and nothing to copy or paste.
- `curl`, `wscat` and the specs connect by saying where they are from:
  `--origin http://127.0.0.1:3615`, one flag, and the refusal line on stderr
  says so when it is missing.

Out of scope: authentication of any kind (there is no user), TLS, serving to
another machine (the server stays bound to `127.0.0.1`), and the HTTP side —
`deblob view` serves a public bundle, and the 404 arm is already the answer for
everything else.

## API

### `deblob` — the rule (`src/lib/snapshot/handshake.model.ts`, new)

```ts
type Handshake = { origin: string | undefined; host: string | undefined }
allowsHandshake(handshake: Handshake): boolean
```

One rule, both servers, three clauses in order:

1. **`host` must be a loopback authority** — hostname `127.0.0.1`, `localhost`
   or `::1`, port or not. Anything else is refused. This is the rebinding rule
   and it is why clause 3 is not enough on its own: a page at
   `http://evil.example:3615` whose DNS answers `127.0.0.1` sends
   `Origin: http://evil.example:3615` and `Host: evil.example:3615`, which
   _match_ — the attacker controls both, so comparing them alone admits it.
2. **`origin` must be there.** A browser always sets it and a page cannot
   suppress it, so no web page is refused by this clause — what it refuses is
   the thing that makes a request without choosing its headers: something
   already running locally that opens a URL on a remote party's say-so. A
   hostile local process forges an `Origin` and walks past it, so this buys
   nothing against that; it buys the narrow case, and it costs an `--origin`
   flag. Vite allows the absent case. We hand out somebody's file tree where
   they hand out module updates, and that is the whole of the difference.
3. **`origin` must be `http`, a loopback hostname, and the same port as
   `host`.** The port carries the rule; the loopback names are aliases of each
   other. A page that is not ours cannot hold our port on the loopback, because
   that address and port _are_ this server — so `localhost:3615` may talk to
   `127.0.0.1:3615` and nothing is given up. Both sides are normalised to an
   explicit port first (`http` means 80), so `http://localhost` and `localhost`
   compare equal on a server run there.

Aliasing has one narrow cost, taken deliberately: `127.0.0.1` and `::1` are
different addresses, so another process can hold the same port on the one we did
not bind, and a page it serves passes clause 3. That process is already on the
machine and can read the same files without our socket, so the rule gives it
nothing. Refusing the alias would buy nothing back and would refuse
`http://localhost:3615` on a server the user reached at `127.0.0.1` — a 403 with
no explanation for what is plainly the same machine.

Clause 3 covers the dev cycle as well as `deblob view`, which is not obvious and
is the reason this step is small. The viewer builds its socket URL from
`location.host`, so it always connects to its own origin; under `pnpm dev` that
is Vite's origin and Vite's proxy forwards both headers unchanged — measured
2026-09-16: the data server sees `Origin: http://localhost:5195` and
`Host: localhost:5195` through the proxy, because `changeOrigin` is off by
default. So the page and the channel are same-origin from the browser's side in
both modes, and one rule serves both.

**What this rests on**: the viewer's socket URL is derived from the page, never
configured. Vite cannot use this rule precisely because theirs is configurable —
`server.hmr.host/port/protocol` and `clientPort` let their client target another
origin, so they check a `Host` allowlist and then a per-run token, with no
origin comparison anywhere. The day deblob's channel URL becomes configurable
the same way, this rule stops holding and the answer becomes the token.

Not used: `Sec-Fetch-Site`, which would say `cross-site` outright. Browsers do
send Fetch Metadata on handshakes, but our own `ws` clients do not, and I have
not verified its coverage across browsers for this case; `Origin` plus `Host` is
what the RFC names. Vite checks both — read in `vite@8.3.0`'s upgrade path,
where a `Host` allowlist comes first and a handshake carrying an `Origin` then
needs a per-run token. webpack-dev-server grew the same pair after a missing
origin check was reported as a CVE, which is recalled, not verified here.

### `deblob` — the channel (`src/lib/snapshot/adapters/ws-channel.adapter.ts`)

`createWsChannel` gains `allows: (handshake: Handshake) => boolean`, consulted
on the upgrade before any client exists. Refused: `403` on the raw socket, the
socket destroyed, no `ChannelClient` created, the server unaffected. The
predicate is a value the assembly supplies, so the rule stays a pure model
function and the adapter keeps translating.

### `deblob` — the driver (`src/drivers/serve/main.ts`)

The driver passes `allowsHandshake` as the channel's `allows`, and writes one
line to its own `stderr` when it returns false, naming the origin — a refusal is
not a bug, so it does not go through `report`, and a dev tool that refuses
silently is a dev tool nobody can debug. Nothing else here changes: both callers
get the same rule, so `bundle` no longer decides anything beyond the HTTP half.

## Testing

- The model, unit: the server's own origin, a foreign origin, a loopback origin
  on another port (the local-page case, refused), a loopback origin under
  another loopback name on the same port (the alias, accepted), an `https`
  origin on our own authority (refused — the scheme is part of the origin), no
  origin at all (refused), and a non-loopback `Host` carrying a matching
  `Origin` — the rebinding case, which passes clause 3 and must die on clause 1.
- Every spec that opens the channel gains an `origin`: node's `ws` client takes
  one as an option. `src/drivers/serve/main.spec.ts` is the one that has
  several.
- The channel adapter, against the real `ws` server the spec already stands up:
  the node client takes an `origin` option, so a refused handshake is a real
  one. Refused means the client sees the socket close and `onClient` never
  fires.
- The serve driver, end to end: a handshake with its own origin connects and
  gets `projects`; one with a foreign origin does not, and the line lands on
  stderr.
- The dev cycle through Vite's proxy is the case a unit test cannot reach, since
  it rests on what the proxy forwards. The probe above stands in for it: if
  `changeOrigin` ever defaults differently, `pnpm dev` breaks loudly at the
  handshake, which is the failure we want rather than a silent hole.

## Implementation

Three checkpoints, one commit:

1. `handshake.model.ts` and its spec — the rule alone, nothing wired.
2. `createWsChannel`'s `allows` and the upgrade path, with its spec.
3. The driver: the predicate wired into both callers, the stderr line, the
   end-to-end specs, and the docs below.

## Docs

- `src/lib/snapshot/README.md` — the channel's entry gains who may open it;
  `handshake.model.ts` joins the API list.
- `src/lib/view/README.md` and `packages/deblob/README.md` — `deblob view`
  answers its own page and nothing else, and what a client that is not a browser
  has to send to be one of its own.
- `packages/viewer/README.md` § The dev cycle — why the data server accepts
  Vite's page and nothing else: the socket goes to the page's own origin and the
  proxy forwards both headers, so the same rule holds with no dev-only escape.

## Open, to rule at ratification

- ~~**The dev cycle's rule**, and whether it needs a per-run token~~ — answered
  by measurement, 2026-09-16: the dev page is same-origin with the channel from
  the browser's side, so one rule covers it and there is no token to mint. The
  fork was mine, from assuming Vite's proxy rewrote `Host`.
- ~~**The rule is strict about the name, not the machine**: `localhost:3615`
  refused when the browser was told `127.0.0.1`~~ — ruled 2026-09-16 (rixo): the
  loopback names alias each other, the port does the work. Clause 3 and the
  paragraph under it carry the reasoning and the one cost.
- ~~**The stderr line on refusal**, or silence~~ — ruled 2026-09-16 (rixo): the
  line, as proposed in § API.
- ~~**No `Origin` allowed**, so `curl` and the specs connect unchanged~~ — ruled
  2026-09-16 (rixo): refused. It is unreachable from a web page either way, and
  forgeable by any local process, so the only thing it closes is a local gadget
  that opens a URL without choosing its headers. That is narrow, and it costs
  one flag. Reasoning in clause 2; this reverses what was first proposed here.
