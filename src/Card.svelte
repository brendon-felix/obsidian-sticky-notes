<script lang="ts">
  import {
    type MarkdownPostProcessorContext,
    MarkdownPreviewRenderer,
    MarkdownRenderer,
    setIcon,
    TFile,
  } from "obsidian";
  import { onMount } from "svelte";
  import { blur } from "svelte/transition";
  import { app, view, saveColor } from "./store"; // Import saveColor function
  import { assert, is } from "tsafe";

  interface Props {
    file: TFile;
    updateLayoutNextTick: () => Promise<void>;
    color?: string;
  }

  let { file, updateLayoutNextTick, color }: Props = $props();

  let contentDiv: HTMLElement;
  let translateTransition: boolean = $state(false);
  let selectedColor: string = $state(color || "#FFD700");

  const colors = ["#FFD700", "#FF6347", "#90EE90", "#87CEEB", "#DDA0DD"];

  function postProcessor(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
  ) {
    if (context.sourcePath !== file.path) {
      // Very important to check if the sourcePath is the same as the file path
      // Otherwise, the post processor will be applied to all files
      return;
    }
    if (element.children.length === 0) {
      return;
    }
    // Find block where to cut the preview
    let lastBlockIndex: number = 0,
      charCount: number = 0;
    do {
      charCount += element.children[lastBlockIndex]?.textContent?.length || 0;
    } while (
      lastBlockIndex < element.children.length &&
      charCount < 200 &&
      ++lastBlockIndex
    );

    // Remove all blocks after the last block
    for (let i = element.children.length - 1; i > lastBlockIndex; i--) {
      element.children[i]?.remove();
    }

    if (charCount < 200) {
      return;
    }
    // Cut the last block
    if (
      !element.children[lastBlockIndex].lastChild ||
      element.children[lastBlockIndex].lastChild?.nodeType !== Node.TEXT_NODE
    ) {
      return;
    }

    const lastElText = element.children[lastBlockIndex].lastChild?.textContent;
    if (lastElText != null) {
      const lastChild = element.children[lastBlockIndex].lastChild;
      assert(!is<null>(lastChild));
      assert(!is<null>(lastElText));
      const cut = Math.min(50, 200 - (charCount - lastElText.length));
      lastChild.textContent = `${lastElText.slice(0, cut)} ...`;
    }
  }

  const renderFile = async (el: HTMLElement): Promise<void> => {
    const content = await file.vault.cachedRead(file);
    MarkdownPreviewRenderer.registerPostProcessor(postProcessor);
    await MarkdownRenderer.render($app, content, el, file.path, $view);
    MarkdownPreviewRenderer.unregisterPostProcessor(postProcessor);
  };

  const trashFile = async (e: Event) => {
    e.stopPropagation();
    await file.vault.trash(file, true);
    await updateLayoutNextTick();
  };

  // const openFile = async () =>
  //   await $app.workspace.getLeaf("tab").openFile(file);

  const openFile = async () => {}
    // await $app.workspace.getLeaf("tab").openFile(file);

  const trashIcon = (element: HTMLElement) => setIcon(element, "trash");

  const changeColor = (newColor: string) => {
    selectedColor = newColor;
    saveColor(file.path, newColor); // Save the selected color
    updateLayoutNextTick(); // Ensure the layout is updated after changing the color
  };

  onMount(() => {
    (async () => {
      await renderFile(contentDiv);
      await updateLayoutNextTick();
      translateTransition = true;
    })();
    return () => updateLayoutNextTick();
  });

</script>

<div
  class="card"
  class:transition={translateTransition}
  transition:blur
  onclick={openFile}
  role="link"
  onkeydown={openFile}
  tabindex="0"
  style="border-color: {selectedColor};"
>
  <div bind:this={contentDiv}></div>
  <div class="card-menu">
    <button
      class="clickable-icon"
      use:trashIcon
      onclick={trashFile}
      aria-label="Delete file"
    ></button>
    <div class="color-picker">
      {#each colors as colorOption}
        <button
          class="color-option"
          style="background-color: {colorOption};"
          onclick={() => changeColor(colorOption)}
          onkeydown={(e) => e.key === 'Enter' && changeColor(colorOption)}
          aria-label="Change color to {colorOption}"
        ></button>
      {/each}
    </div>
  </div>
</div>

<style>
  .card {
    position: absolute;
    background-color: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    padding: var(--card-padding);
    word-wrap: break-word;
    overflow-y: hidden;
    margin: 0;
    width: 300px;
    height: 250px;
  }
  
  .card.transition {
    transition-property: transform;
    transition-duration: 0.2s;
  }

  .card {
    font-size: 0.8rem;
  }

  .card :global(p),
  .card :global(ul) {
    margin: 0.3rem 0;
  }

  .card :global(h1),
  .card :global(h2),
  .card :global(h3) {
    margin: 0 0 0.3rem;
  }

  .card :global(ul) {
    padding-left: var(--size-4-5);
  }

  .card :global(p:has(> span.image-embed):not(:has(br))) {
    margin: 0;
  }

  .card :global(span.image-embed) {
    margin: 0 calc(-1 * var(--card-padding));
    width: calc(100% + 2 * var(--card-padding));
  }

  /* Images embeds alone in a paragraph */
  .card :global(p:has(> span.image-embed):not(:has(br)) span.image-embed) {
    display: block;
    & :global(img) {
      display: block;
    }
  }

  /* Image embeds followed by line break in same paragraph */
  .card :global(p:has(> span.image-embed):has(br) span.image-embed) {
    display: inline-block;
  }

  /** Embed notes */
  .card :global(p:has(> span.markdown-embed)),
  .card :global(.block-language-dataview) {
    overflow: hidden;
    max-height: 5rem;
    position: relative;
  }

  .card :global(p:has(> span.markdown-embed) > .embed-shadow),
  .card :global(.block-language-dataview > .embed-shadow) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    box-shadow: inset 0 -2rem 1rem -1rem var(--background-primary-alt);
  }

  .card:hover {
    /* background-color: var(--background-modifier-hover); */
    border-color: var(--border-color-hover);
  }

  .card :global(h3) {
    word-wrap: break-word;
  }

  /* .card .card-menu {
    margin: calc(-1 * var(--card-padding));
    margin-top: 0;
    border-top: 1px solid var(--background-modifier-border);
    padding: var(--size-4-1) var(--card-padding);
    background-color: var(--background-primary);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-4-1);
  } */

  .card .card-menu {
    position: absolute;
    top: 5px;
    right: 5px;
    /* width: 20px; */
    /* height: 20px; */
    /* background-color: red; */
    display: none;
    /* cursor: pointer; */
  }


  .card:hover .card-menu {
    display: block;
  }

  /* .card .card-menu .clickable-icon {
    color: var(--tab-text-color-focused-active);
    background-color: var(--background-modifier-hover);
  } */

  /* .delete-button {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 20px;
    height: 20px;
    background-color: red;
    display: none;
    cursor: pointer;
  }

  .card:hover .delete-button {
    display: block;
  } */

  .color-picker {
    display: flex;
    gap: 5px;
    margin-top: 5px;
  }

  .color-option {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    cursor: pointer;
  }

</style>
