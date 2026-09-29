import { expect, test } from "vitest"

import { allowsHandshake } from "./handshake.model.ts"

/** The authority this server was reached at, as the `Host` header spells it. */
const SERVED = "127.0.0.1:3615"

test.each([
  [
    "the page this server served: its own origin",
    { origin: "http://127.0.0.1:3615", host: SERVED },
    true,
  ],
  [
    "another loopback name, same port: the names alias each other",
    { origin: "http://localhost:3615", host: SERVED },
    true,
  ],
  [
    "the ports left out, both of them: 80 on each side",
    { origin: "http://localhost", host: "localhost" },
    true,
  ],
  [
    "another site: the case this rule exists for",
    { origin: "https://SOME_OTHER_SITE.example", host: SERVED },
    false,
  ],
  [
    "another port on the loopback: that page is not this server",
    { origin: "http://127.0.0.1:9999", host: SERVED },
    false,
  ],
  [
    "https on our own authority: the scheme is part of an origin",
    { origin: "https://127.0.0.1:3615", host: SERVED },
    false,
  ],
  [
    "a host that is not the loopback, and an origin that matches it: rebinding",
    {
      origin: "http://SOME_OTHER_SITE.example:3615",
      host: "SOME_OTHER_SITE.example:3615",
    },
    false,
  ],
  ["no origin at all", { origin: undefined, host: SERVED }, false],
  [
    "no host at all",
    { origin: "http://127.0.0.1:3615", host: undefined },
    false,
  ],
  [
    "a host that does not parse",
    { origin: "http://127.0.0.1:3615", host: "SOME MALFORMED HOST" },
    false,
  ],
  [
    "an origin that does not parse — `null`, as a sandboxed page sends it",
    { origin: "null", host: SERVED },
    false,
  ],
])("%s", (_case, handshake, allowed) => {
  expect(allowsHandshake(handshake)).toBe(allowed)
})
