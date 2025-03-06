<script lang="ts">
  import { onMount, tick } from "svelte";
  import MiniMasonry from "minimasonry";

  import Card from "./Card.svelte";
  import { displayedFiles, loadColor, sort, Sort } from "./store";
  export let createNewNote: () => void;

  let grid: MiniMasonry;
  let cardsContainer: HTMLElement;  

  let selectedSort: Sort = Sort.ModifiedDesc;
  sort.subscribe(value => selectedSort = value);
  
  const handleSortChange = () => {
    sort.set(selectedSort);
  };

  onMount(() => {
    grid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: 250,
      gutter: 20,
      surroundingGutter: false,
      ultimateGutter: 20,
      wedge: true,
    });
    grid.layout();

    return () => {
      grid.destroy();
    };
  });

  let lastLayout: Date = new Date();
  let pendingLayout: NodeJS.Timeout | null = null;
  export const debouncedLayout = () => {
    return new Promise<void>((resolve) => {
      if (
        lastLayout.getTime() + 100 > new Date().getTime() &&
        pendingLayout === null
      ) {
        pendingLayout = setTimeout(
          () => {
            grid.layout();
            lastLayout = new Date();
            pendingLayout = null;
            resolve();
          },
          lastLayout.getTime() + 100 - new Date().getTime(),
        );
        return;
      }

      grid.layout();
      lastLayout = new Date();
      resolve();
    });
  };
  export const updateLayoutNextTick = async () => {
    await tick();
    return await debouncedLayout();
  };
  displayedFiles.subscribe(updateLayoutNextTick);

  export let onDragStart;
  export let onDragOver;
  export let onDrop;
  

</script>

<div class="view-container">
  <div class="controls">
    <button class="new-note-button" onclick={createNewNote}>+</button>
    <select bind:value={selectedSort} onchange={handleSortChange}>
      <option value={Sort.ModifiedDesc}>Modified time (new to old)</option>
      <option value={Sort.ModifiedAsc}>Modified time (old to new)</option>
      <option value={Sort.CreatedDesc}>Created time (new to old)</option>
      <option value={Sort.CreatedAsc}>Created time (old to new)</option>
      <option value={Sort.Manual}>Manual</option>
    </select>
  </div>
  <div class="cards-container" bind:this={cardsContainer}>
    {#each $displayedFiles as file (file.path)}
      <Card {file} {updateLayoutNextTick} color={loadColor(file.path)} {onDragStart} {onDragOver} {onDrop} />
    {/each}
  </div>
</div>

<style>
  .view-container {
    position: relative;
  }
  .controls {
    position: absolute;
    top: 10px;
    left: 10px; /* changed from right: 10px */
    display: flex;
    gap: 10px;
    z-index: 10;
  }
  .new-note-button {
    width: 32px;
    height: 32px;
    border: none;
    background-color: var(--background-primary);
    color: var(--text-normal);
    font-size: 24px;
    cursor: pointer;
    border-radius: 4px;
  }
  select {
    height: 32px;
    border-radius: 4px;
    border: 1px solid var(--background-modifier-border);
    padding: 0 5px;
    background-color: var(--background-primary);
    color: var(--text-normal);
  }
  .cards-container {
    position: relative;
    container-type: inline-size;
    padding-top: 70px;
  }

  .cards-container :global(*) {
    --card-padding: var(--size-4-3);
    --card-gutter: var(--size-4-5);
  }
</style>
