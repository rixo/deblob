<script lang="ts">
  import type { SnapshotSource } from "./lib/snapshot/snapshot.model.ts"

  let { source }: { source: SnapshotSource } = $props()
</script>

<main>
  <p>
    snapshot <time datetime={$source.generatedAt}>{$source.generatedAt}</time>
  </p>
</main>
