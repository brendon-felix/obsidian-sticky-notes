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

  const FACTOR = 1.1;

  let cardWidth = 300;
  let cardHeight = 300;

  const recreateGrid = async () => {
    grid.destroy();
    grid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: cardWidth,
      gutter: 20,
      surroundingGutter: false,
      ultimateGutter: 20,
      wedge: true,
    });
    await tick();
    grid.layout();
  };

  const increaseCardSize = async () => {
    cardWidth *= FACTOR;
    cardHeight *= FACTOR;
    await recreateGrid();
  };

  const decreaseCardSize = async () => {
    if (cardWidth > 100 && cardHeight > 100) {
      cardWidth /= FACTOR;
      cardHeight /= FACTOR;
      await recreateGrid();
    }
  };

  onMount(() => {
    grid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: cardWidth,
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
    <button class="new-note-button" onclick={createNewNote} title="Create a new sticky note">✚</button>
    <select bind:value={selectedSort} onchange={handleSortChange} title="Sort by">
      <option value={Sort.ModifiedDesc}>Modified time (new to old)</option>
      <option value={Sort.ModifiedAsc}>Modified time (old to new)</option>
      <option value={Sort.CreatedDesc}>Created time (new to old)</option>
      <option value={Sort.CreatedAsc}>Created time (old to new)</option>
      <option value={Sort.Manual}>Manual</option>
    </select>
  </div>
  <div class="size-controls">
    <button class="size-button increase" onclick={increaseCardSize} title="Increase size">+</button>
    <span class="size-icon" title="Current card size">📏</span>
    <button class="size-button decrease" onclick={decreaseCardSize} title="Decrease size">-</button>
  </div>
  <div class="cards-container" bind:this={cardsContainer}>
    {#each $displayedFiles as file (file.path)}
      <Card {file} {updateLayoutNextTick} color={loadColor(file.path)} {onDragStart} {onDragOver} {onDrop} {cardWidth} {cardHeight} />
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
  .size-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10;
  }
  .new-note-button, .size-button {
    width: 32px;
    height: 32px;
    border: none;
    background-color: var(--background-primary);
    color: var(--text-normal);
    font-size: 24px;
    cursor: pointer;
    border-radius: 4px;
  }
  .new-note-button {
    width: 40px;
    height: 40px;
    font-size: 28px;
    border-radius: 50%;
  }
  .size-button.increase {
    background-color: var(--background-success);
  }
  .size-button.decrease {
    background-color: var(--background-danger);
  }
  .size-icon {
    font-size: 24px;
    color: var(--text-normal);
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
