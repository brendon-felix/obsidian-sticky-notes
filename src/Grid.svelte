<script lang="ts">
  import { onMount, tick } from "svelte";
  import MiniMasonry from "minimasonry";
  import Card from "./Card.svelte";
  import { displayedFiles, loadColor } from "./store";

  export let onDragStart;
  export let onDragOver;
  export let onDrop;

  let grid: MiniMasonry;
  let cardsContainer: HTMLElement;  

  const FACTOR = 1.5;
  const MIN_CARD_SIZE = 150;

  let cardWidth = 300;
  let cardHeight = 300;

  const getMaxCardSize = () => {
    return cardsContainer.clientWidth - 20;
  };

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

  export async function increaseCardSize() {
    const maxCardSize = getMaxCardSize();
    if (cardWidth * FACTOR <= maxCardSize && cardHeight * FACTOR <= maxCardSize) {
      cardWidth *= FACTOR;
      cardHeight *= FACTOR;
      await recreateGrid();
    }
  };

  export async function decreaseCardSize() {
    if (cardWidth > MIN_CARD_SIZE && cardHeight > MIN_CARD_SIZE) {
      cardWidth /= FACTOR;
      cardHeight /= FACTOR;
      await recreateGrid();
    }
  };

  export async function updateLayoutNextTick() {
    await tick();
    grid.layout();
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
</script>

<div class="cards-container" bind:this={cardsContainer}>
  {#each $displayedFiles as file (file.path)}
    <Card {file} {updateLayoutNextTick} color={loadColor(file.path)} {onDragStart} {onDragOver} {onDrop} {cardWidth} {cardHeight} />
  {/each}
</div>

<style>
  /* ...existing .cards-container and card styles... */
  .cards-container {
    position: relative;
    /* container-type: inline-size; */
    padding-top: 70px;
    border: 1px solid red;
  }
  .cards-container :global(*) {
    --card-padding: var(--size-4-3);
    --card-gutter: var(--size-4-5);
  }
  /* ...other styles as needed... */
</style>
