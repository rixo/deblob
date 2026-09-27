<script lang="ts">
  import { onMount } from "svelte"

  import type { Ui } from "./ui.service.ts"

  // The driver, as a component: hooks only, each hands the DOM's event on
  // to one use case. What it shows comes from the front service's store.
  let { ui }: { ui: Ui } = $props()
  const view = ui.view

  onMount(() => ui.start())
</script>

<form onsubmit={(event) => ui.add(event)}>
  <input name="text" aria-label="text" />
  <label><input type="checkbox" name="pinned" /> pin</label>
  <button>add</button>
</form>

<label>
  <input type="checkbox" checked={$view.pinnedOnly} onchange={(event) => ui.filter(event)} /> pinned only
</label>

{#if $view.error}<p role="alert">{$view.error}</p>{/if}

<ul>
  {#each $view.notes as note (note.id)}
    <li>{note.pinned ? "* " : ""}{note.text}</li>
  {/each}
</ul>
