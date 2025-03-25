<script lang="ts">
  import { get } from "svelte/store";
  import Grid from "./Grid.svelte";
  import { sort, Sort, files, manualOrder, saveManualOrder, colorMap } from "./store";
  export let createNewNote: () => void;
  export let onDragStart;
  export let onDragOver;
  export let onDrop;

  let selectedSort: Sort = Sort.ModifiedDesc;
  sort.subscribe(value => selectedSort = value);

  let gridRef: Grid;
  
  const handleSortChange = async () => {
    sort.set(selectedSort);
    if (selectedSort !== Sort.Manual) {
      const unsortedFiles = get(files);
      let sortedList = unsortedFiles.slice();
      if (selectedSort === Sort.ModifiedDesc) {
        sortedList.sort((a, b) => b.stat.mtime - a.stat.mtime);
      } else if (selectedSort === Sort.ModifiedAsc) {
        sortedList.sort((a, b) => a.stat.mtime - b.stat.mtime);
      } else if (selectedSort === Sort.CreatedDesc) {
        sortedList.sort((a, b) => b.stat.ctime - a.stat.ctime);
      } else if (selectedSort === Sort.CreatedAsc) {
        sortedList.sort((a, b) => a.stat.ctime - b.stat.ctime);
      } else if (selectedSort === Sort.Color) {
        sortedList.sort((a, b) => {
          const colorA = get(colorMap)[a.name] || "";
          const colorB = get(colorMap)[b.name] || "";
          return colorA.localeCompare(colorB);
        });
      }
      const newOrder = sortedList.map(file => file.name);
      manualOrder.set(newOrder);
      saveManualOrder();
    }
    if (gridRef?.updateLayoutNextTick) {
      await gridRef.updateLayoutNextTick();
    }
  };

  const increaseCardSize = async () => {
    if (gridRef) await gridRef.increaseCardSize();
  };
  const decreaseCardSize = async () => {
    if (gridRef) await gridRef.decreaseCardSize();
  };

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
      <option value={Sort.Color}>Color</option>
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
    /* background-color: var(--background-secondary); */
    border: 1px solid red;
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
