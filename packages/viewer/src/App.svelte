<script lang="ts">
  import { outlineOf } from "./lib/snapshot/outline.model.ts"
  import type { SnapshotSource } from "./lib/snapshot/snapshot-source.port.ts"

  let { source }: { source: SnapshotSource } = $props()
</script>

<main>
  {#if $source.projects.length > 0}
    <nav>
      {#each $source.projects as project (project.root)}
        <button onclick={() => source.select(project.root)}>
          {#if project.name !== null}
            <strong>{project.name}</strong>
          {/if}
          <code>{project.root}</code>
        </button>
      {/each}
    </nav>
  {/if}
  {#if $source.loading}
    <p>loading…</p>
  {/if}
  {#if $source.error !== null}
    <p>
      <code>{$source.error.project}</code>
      <span>{$source.error.message}</span>
    </p>
  {/if}
  {#if $source.snapshot !== null}
    {@const { project, stats, modules, generatedAt } = $source.snapshot}
    <header>
      <h1>
        {#if project.name !== null}
          <strong>{project.name}</strong>
        {/if}
        <code>{project.root}</code>
      </h1>
      <p>{project.provenance}</p>
      <p>
        snapshot
        <time datetime={generatedAt}>{generatedAt}</time>
      </p>
      <dl>
        <dt>files</dt>
        <dd data-stat="files">{stats.files}</dd>
        <dt>bytes</dt>
        <dd data-stat="bytes">{stats.bytes}</dd>
        <dt>blob %</dt>
        <dd data-stat="blobPercent">{stats.blobPercent}</dd>
        <dt>services</dt>
        <dd data-stat="services">{stats.services}</dd>
      </dl>
    </header>
    {#each outlineOf(modules) as service (service.root)}
      <section>
        <h2>
          {#if service.root === null}
            top level
          {:else}
            <code>{service.root}</code>
          {/if}
        </h2>
        {#each service.layers as { layer, files } (layer)}
          <h3>{layer}</h3>
          <ul>
            {#each files as file (file.path)}
              <li><code>{file.path}</code></li>
            {/each}
          </ul>
        {/each}
      </section>
    {/each}
  {/if}
</main>
