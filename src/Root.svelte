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
      baseWidth: 300,
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

</script>

<div class="number">
  <span>Text</span>
</div>
<div class="cards-container" bind:this={cardsContainer}>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} />
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
