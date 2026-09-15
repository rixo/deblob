// Seeds the corpus before every run: deblob's own snapshot, extracted through
// the data half by running the snapshot script driver as a process — the
// viewer never imports deblob. Written to tmp/corpus/ (tmp/ is gitignored
// throughout the repo); private snapshots dropped there by hand sit beside it.

import { spawn } from "node:child_process"
import { mkdir, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const deblobRoot = fileURLToPath(new URL("../deblob/", import.meta.url))
const snapshotBin = fileURLToPath(
  new URL("../deblob/src/drivers/snapshot/bin.ts", import.meta.url),
)
const corpusDir = new URL("./tmp/corpus/", import.meta.url)

const snapshotOfDeblob = (): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [snapshotBin], {
      cwd: deblobRoot,
      stdio: ["ignore", "pipe", "inherit"],
    })
    const chunks: Buffer[] = []
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk))
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks).toString("utf8"))
      else reject(new Error(`deblob snapshot exited with ${code}`))
    })
  })

export const setup = async (): Promise<void> => {
  const snapshot = await snapshotOfDeblob()
  await mkdir(corpusDir, { recursive: true })
  await writeFile(new URL("deblob.json", corpusDir), snapshot)
}
