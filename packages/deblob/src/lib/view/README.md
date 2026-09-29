# view

The built viewer, served over HTTP. `deblob view` gives the browser a page and
the assets it asks for; everything the page then does — the project list, the
snapshots, the pushes on change — is [snapshot](../snapshot/README.md) over the
WebSocket channel on the same port. One port is also what makes the channel's
rule simple: the page and the channel share an origin, so the channel can answer
its own page and refuse every other
([handshake](../snapshot/handshake.model.ts)).

The bundle is a directory of files this package ships (`dist/viewer`, copied
from `packages/viewer/dist` by `scripts/build-viewer.ts`). Serving it is two
decisions and one read: which file a request names, what to answer when it is
not there, and the read itself.

## API

- `bundle.model.ts` — `assetFor(target)` → `{ path, file, contentType }` or
  `null`, pure. The request target in, query and fragment dropped, `%xx`
  decoded: a name with an extension is that file; a name without one — `/`,
  `/anything/deep` — is `index.html`, so the page is reachable at any URL a
  client-side router invents without the server learning its routes. `null` is a
  target no bundle may answer: not rooted, undecodable, or carrying `..`, a
  backslash or a NUL. That refusal is the model's, not the adapter's, so it
  holds however the files are stored. `contentType` comes from a table by
  extension and falls back to `application/octet-stream` — the table is a census
  of what builds emit today, the fallback is the rule.
- `view.service.ts` — `createViewService({ files, reserved })` → `respondTo`. A
  request is `{ method, path }`; the answer is a `ViewResponse` value (`status`,
  `contentType`, `body` as bytes) or `null` for a request that is not the
  view's: anything that is not a `GET`, and the paths in `reserved` — the
  channel's, so a plain GET on it is the channel's business and never the page.
  A refused target and a file the bundle does not hold are both 404; the second
  is a stale hashed asset, since extensionless targets became the index and
  cannot miss.

## Ports

- `ports/bundle.port.ts` — `BundleFiles`: `read(file)` → the bytes or `null` for
  a file that is not there. Root-relative, `/`-separated names; a miss is an
  answer, not a failure.

## Adapters

- `adapters/fs-bundle.adapter.ts` — `createFsBundle({ root })`: one read per
  request, no listing, no cache. A missing file and a directory are `null`;
  anything else (a root that is not a directory, a permission) throws, because
  it is the server's failure to report rather than an answer to the client. It
  re-checks containment under the root: the model already refuses an escaping
  name, and this is the last place that could act on one.
- `adapters/memory-bundle.adapter.ts` — `createMemoryBundle(contents)` →
  `{ files, reads }`: files as text, every read logged, so a spec can show that
  a refused target never reached the port.

## Where it is wired

`drivers/serve/main.ts` instantiates both when it is given a bundle root, and
its `request` listener only translates node's objects to and from the values
above — a `null` answer is a bare 404, a throw is reported in full and
answered 500. The root itself is resolved in `drivers/cli/bin.ts`
(`bundleRootOf`), the one place that knows where the bundle lives.
