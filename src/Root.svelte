<script lang="ts">
  import { tick } from "svelte";
  import Grid from "./Grid.svelte";
  import { sort, Sort } from "./store";
  export let createNewNote: () => void;
  export let onDragStart;
  export let onDragOver;
  export let onDrop;

  let selectedSort: Sort = Sort.ModifiedDesc;
  sort.subscribe(value => selectedSort = value);
  
  const handleSortChange = async () => {
    sort.set(selectedSort);
    // Trigger grid layout update after sorting change
    if (gridRef?.updateLayoutNextTick) {
      await gridRef.updateLayoutNextTick();
    }
  };

  let gridRef: typeof Grid;
  const increaseCardSize = async () => {
    if (gridRef) await gridRef.increaseCardSize();
  };
  const decreaseCardSize = async () => {
    if (gridRef) await gridRef.decreaseCardSize();
  };

  // Forward updateLayoutNextTick to Grid to ensure it still works.
  export function updateLayoutNextTick() {
    return gridRef?.updateLayoutNextTick();
  }
</script>

<div class="view-container">
  <div class="controls">
    <button class="new-note-button" onclick={createNewNote} title="Create a new sticky note">✚</button>
  </div>
  <div class="right-controls">
    <select bind:value={selectedSort} onchange={handleSortChange} title="Sort by">
      <option value={Sort.ModifiedDesc}>Modified time (new to old)</option>
      <option value={Sort.ModifiedAsc}>Modified time (old to new)</option>
      <option value={Sort.CreatedDesc}>Created time (new to old)</option>
      <option value={Sort.CreatedAsc}>Created time (old to new)</option>
      <option value={Sort.Manual}>Manual</option>
    </select>
    <div class="size-controls">
      <button class="size-button increase" onclick={increaseCardSize} title="Increase size">+</button>
      <span class="size-icon" title="Current card size">📏</span>
      <button class="size-button decrease" onclick={decreaseCardSize} title="Decrease size">-</button>
    </div>
  </div>
  <Grid bind:this={gridRef} {onDragStart} {onDragOver} {onDrop} />
</div>

<style>
  .view-container {
    position: relative;
  }
  .controls {
    position: absolute;
    top: 10px;
    left: 10px;
    display: flex;
    gap: 10px;
    z-index: 10;
  }
  .right-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 10;
  }
  .size-controls {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .new-note-button, .size-button {
    background-color: var(--background-primary);
    color: var(--text-normal);
    border-radius: 50%;
  }
  .new-note-button {
    width: 50px;
    height: 50px;
    font-size: 20px;
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
</style>
