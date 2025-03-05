<script lang="ts">
  import { onMount, tick } from "svelte";
  import MiniMasonry from "minimasonry";

  import Card from "./Card.svelte";
  import { displayedFiles, loadColor } from "./store"; // Import loadColor function

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

<div class="cards-container" bind:this={cardsContainer}>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} {updateLayoutNextTick} color={loadColor(file.path)} {onDragStart} {onDragOver} {onDrop} />
  {/each}
</div>

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
