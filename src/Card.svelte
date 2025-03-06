<script lang="ts">
  import {
    type MarkdownPostProcessorContext,
    MarkdownPreviewRenderer,
    MarkdownRenderer,
    setIcon,
    TFile,
  } from "obsidian";
  import { onMount, tick, onDestroy } from "svelte"; // Import onDestroy from svelte
  import { blur } from "svelte/transition";
  import { app, view, saveColor, extractColorFromFrontmatter, newStickyNote, manualOrder, saveManualOrder } from "./store"; // Import saveColor and extractColorFromFrontmatter functions
  import { assert, is } from "tsafe";
  import { get } from "svelte/store";

  interface Props {
    file: TFile;
    updateLayoutNextTick: () => Promise<void>;
    color?: string;
    onDragStart: (event: DragEvent, path: string) => void;
    onDragOver: (event: DragEvent, path: string) => void;
    onDrop: (event: DragEvent, path: string) => void;
  }

  let { file, updateLayoutNextTick, color, onDragStart, onDragOver, onDrop }: Props = $props();

  let contentDiv: HTMLElement | null = $state(null);
  let translateTransition: boolean = $state(false);
  let selectedColor: string = $state(color || "#FFD700");
  let isEditing: boolean = $state(false);
  let editorContent: string = $state("");
  let isClosing: boolean = $state(false); // new flag to guard closeEditor
  let textareaEl: HTMLTextAreaElement; // NEW: reference to the textarea element

  const colors = ["#FFD700", "#FF6347", "#90EE90", "#87CEEB", "#DDA0DD"];

  let isHoveringTop: boolean = $state(false);

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
      charCount < 300 &&
      ++lastBlockIndex
    );

    // Remove all blocks after the last block
    for (let i = element.children.length - 1; i > lastBlockIndex; i--) {
      element.children[i]?.remove();
    }
  }

  const renderFile = async (el: HTMLElement): Promise<void> => {
    const content = await file.vault.cachedRead(file);
    editorContent = content;
    MarkdownPreviewRenderer.registerPostProcessor(postProcessor);
    await MarkdownRenderer.render($app, content, el, file.path, $view);
    MarkdownPreviewRenderer.unregisterPostProcessor(postProcessor);
  };

  const trashFile = async (e: Event) => {
    e.stopPropagation();
    await file.vault.trash(file, true);
    manualOrder.update(order => order.filter(path => path !== file.path));
    saveManualOrder();
    await tick();
    window.dispatchEvent(new Event("resize"));
    await updateLayoutNextTick();
  };

  // const openFile = async () =>
  //   await $app.workspace.getLeaf("tab").openFile(file);

  const trashIcon = (element: HTMLElement) => setIcon(element, "trash");

  const changeColor = async (newColor: string) => {
    selectedColor = newColor;
    await saveColor(file.path, newColor); // Save the selected color
    updateLayoutNextTick(); // Ensure the layout is updated after changing the color
  };

  const closeEditor = async () => {
    if (isClosing) return; // prevent duplicate execution
    isClosing = true;
    if (editorContent !== await file.vault.cachedRead(file)) {
      await file.vault.modify(file, editorContent);
      await updateLayoutNextTick();
    }
    isEditing = false;
    await tick(); // Wait for the DOM to update
    if (contentDiv !== null) {
      await renderFile(contentDiv);
    }
    isClosing = false;
  };

  const handleCardClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('.card-menu') || isEditing) {
      return;
    }
    isEditing = true;
    tick().then(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        const scrollTop = textarea.scrollTop;
        textarea.focus();
        const frontmatterEnd = editorContent.indexOf('---', 3) + 4;
        const startPosition = frontmatterEnd > 3 ? frontmatterEnd : 0;
        textarea.setSelectionRange(startPosition, startPosition);
        textarea.scrollTop = scrollTop;
      }
    });
  };

  const handleCardKeyPress = () => {
    // isEditing = true;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isEditing) {
      closeEditor();
    }
  };

  const handleTextareaKeydown = async (event: KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + "\t" + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
      editorContent = textarea.value;
    } else if (event.key === "Escape" && isEditing) {
      event.preventDefault();
      event.stopPropagation(); // Stop further propagation to global listener
      await closeEditor();
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    isHoveringTop = event.clientY - rect.top < 30;
  };

  const handleMouseLeave = () => {
    isHoveringTop = false;
  };

  const handleDrop = (event: DragEvent) => {
    onDrop(event, file.path);
  };

  onMount(async () => {
    const frontmatterColor = await extractColorFromFrontmatter(file);
    if (frontmatterColor) {
      selectedColor = frontmatterColor;
    }
    if (contentDiv !== null) {
      await renderFile(contentDiv);
    }
    // Enable editing if this card is the newly created sticky note.
    if (get(newStickyNote) === file.path) {
      isEditing = true;
      newStickyNote.set(null);
      await tick(); // wait for the textarea to be rendered
      if (textareaEl) {
        textareaEl.focus();
      }
    }
    await updateLayoutNextTick();
    translateTransition = true;
    document.addEventListener("keydown", handleKeyDown);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });

  // Add re-layout on card destroy to update the grid after a card is removed.
  onDestroy(() => {
    updateLayoutNextTick();
  });

</script>

<div
  class="card"
  class:transition={translateTransition}
  transition:blur
  onclick={handleCardClick}
  role="link"
  onkeydown={handleCardKeyPress}
  tabindex="0"
  style="border-color: {selectedColor};"
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  ondragstart={(event) => onDragStart(event, file.path)}
  ondragover={(event) => onDragOver(event, file.path)}
  ondrop={handleDrop}
  draggable="true"
>
  {#if isEditing}
    <textarea bind:this={textareaEl} bind:value={editorContent} onfocusout={closeEditor} onkeydown={handleTextareaKeydown}></textarea>
  {:else}
    <div class="read-view" bind:this={contentDiv}></div>
  {/if}
  <div class="card-menu" class:visible={isHoveringTop && !isEditing}>
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
    <button
      class="clickable-icon"
      use:trashIcon
      onclick={trashFile}
      aria-label="Delete file"
    ></button>
  </div>
</div>

<style>
  .card {
    position: absolute;
    background-color: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    border-top-width: 5px;
    padding: 0;
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
    font-size: 0.9rem;
  }

  .read-view {
    padding: var(--card-padding);
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

  /* .card :global(ul) {
    padding-left: var(--size-4-5);
  } */

  .card :global(p:has(> span.image-embed):not(:has(br))) {
    margin: 0;
  }

  .card :global(span.image-embed) {
    margin: var(--card-padding) 0;
    width: 100%;
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
    /* box-shadow: inset 0 -2rem 1rem -1rem var(--background-primary-alt); */
  }

  .card:hover {
    border-color: var(--border-color-hover);
  }

  .card:hover .card-menu {
    display: flex;
  }

  .card :global(h3) {
    word-wrap: break-word;
  }

  .card .card-menu {
    position: absolute;
    top: -30px;
    left: 0;
    right: 0;
    height: 30px;
    background-color: var(--background-primary);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 10px;
    border-bottom: 1px solid var(--background-modifier-border);
    transition: top 0.2s ease-in-out;
  }

  .card .card-menu.visible {
    top: 0;
  }

  .color-picker {
    display: flex;
    gap: 2px;
    margin-right: 10px;
  }

  .color-option {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .clickable-icon {
    cursor: pointer;
  }

  textarea {
    width: 100%;
    height: 100%;
    border: none;
    resize: none;
    padding: var(--card-padding);
    font-size: 0.9rem;
    background-color: var(--background-primary-alt);
    color: var(--text-normal);
  }

  .card :global(pre) {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .card :global(code) {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .card :global(ul),
  .card :global(ol) {
    padding-left: 1rem;
  }

  .card :global(ul ul),
  .card :global(ol ol) {
    padding-left: 1rem;
  }

</style>
