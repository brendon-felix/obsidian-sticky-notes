<script lang="ts">
  import { Menu, setIcon } from "obsidian";
  import { onMount, tick } from "svelte";
  import MiniMasonry from "minimasonry";

  import Card from "./Card.svelte";
  import { displayedFiles } from "./store";

  let grid: MiniMasonry;
  let cardsContainer: HTMLElement;  

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
  const debouncedLayout = () => {
    // If there has been a relayout call in the last 100ms,
    // we schedule another one 100ms later to avoid layout thrashing
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

      // Otherwise, relayout immediately
      grid.layout();
      lastLayout = new Date();
      resolve();
    });

    
  };
  const updateLayoutNextTick = async () => {
    await tick();
    return await debouncedLayout();
  };
  displayedFiles.subscribe(updateLayoutNextTick);

  const defaultColor = "#FFD700";

</script>

<div class="cards-container" bind:this={cardsContainer}>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} {updateLayoutNextTick} {defaultColor} />
  {/each}
</div>

<!-- <div class="cards-container" bind:this={cardsContainer}>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} {updateLayoutNextTick} />
  {/each}
</div> -->

<style>
  .cards-container {
    position: relative;
    container-type: inline-size;
  }

  .cards-container :global(*) {
    --card-padding: var(--size-4-3);
    --card-gutter: var(--size-4-5);
  }
</style>
