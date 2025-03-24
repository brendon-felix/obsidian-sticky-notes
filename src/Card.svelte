<script lang="ts">
	import type { TFile } from "obsidian";
	import { setIcon, MarkdownPreviewRenderer, MarkdownRenderer, MarkdownEditView, MarkdownView } from "obsidian";
	import { onMount, tick, onDestroy } from "svelte";
	import { blur } from "svelte/transition";
	import { saveColor, extractColorFromFrontmatter, newStickyNote, app, view, manualOrder, saveManualOrder } from "./store";
	// import CardContents from "./CardContents.svelte";
	import { get } from "svelte/store";

	// import type { TFile } from "obsidian";
	// import { onMount, tick, onDestroy } from "svelte";

	interface Props {
		file: TFile;
		updateLayoutNextTick: () => Promise<void>;
		color?: string;
		onDragStart: (event: DragEvent, path: string) => void;
		onDragOver: (event: DragEvent, path: string) => void;
		onDrop: (event: DragEvent, path: string) => void;
		cardWidth: number;
		cardHeight: number;
	}

	let { file, updateLayoutNextTick, color, onDragStart, onDragOver, onDrop, cardWidth, cardHeight }: Props = $props();
	
	let translateTransition: boolean = $state(false);
	let selectedColor: string = $state(color || "#FFD700");
	let isHoveringTop: boolean = $state(false);
	let contentDiv: HTMLElement | null = $state(null);
	let isSelected: boolean = $state(false);
	let isEditing: boolean = $state(false);
	let editorContent: string = $state("");
	let textareaEl: HTMLTextAreaElement | null = $state(null);
	let isClosing: boolean = $state(false);
	let closedByEscape: boolean = $state(false);
	
	const colors = ["#FFD700", "#FF6347", "#90EE90", "#87CEEB", "#DDA0DD"];

	const trashFile = async (e: Event) => {
		e.stopPropagation();
		await file.vault.trash(file, true);
		manualOrder.update(order => order.filter(path => path !== file.path));
		console.log("trashFile() calling saveManualOrder()");
		saveManualOrder();
		await tick();
		window.dispatchEvent(new Event("resize"));
		await updateLayoutNextTick();
	};

	const trashIcon = (element: HTMLElement) => setIcon(element, "trash");

	const changeColor = async (newColor: string) => {
		selectedColor = newColor;
		await saveColor(file.name, newColor);
		updateLayoutNextTick();
	};

	const handleMouseMove = (event: MouseEvent) => {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		isHoveringTop = event.clientY - rect.top < 30;
	};

	const handleMouseLeave = () => {
		isHoveringTop = false;
	};

	const handleDrop = (event: DragEvent) => {
		onDrop(event, file.name);
	};
	
	function postProcessor(element: HTMLElement, context: any) {
		if (context.sourcePath !== file.path) return;
		if (element.children.length === 0) return;
				// Do other logic (remove blocks or whatever)
	}
	
	const renderFile = async (el: HTMLElement): Promise<void> => {
		const content = await file.vault.cachedRead(file);
		editorContent = content;
		MarkdownPreviewRenderer.registerPostProcessor(postProcessor);
		await MarkdownRenderer.render(get(app), content, el, file.path, get(view));
		MarkdownPreviewRenderer.unregisterPostProcessor(postProcessor);
	};
	
	const closeEditor = async (saveChanges: boolean = true) => {
		if (isClosing) return;
		isClosing = true;
		const originalContent = await file.vault.cachedRead(file);
		if (editorContent !== originalContent) {
			await file.vault.modify(file, editorContent);
			await updateLayoutNextTick();
		}
		// if (saveChanges) {
		// } else {
		// 	editorContent = originalContent;
		// }
		isEditing = false;
		// isSelected = false;
		translateTransition = true;
		await tick();
		if (contentDiv !== null) await renderFile(contentDiv);
		isClosing = false;
		// reset the flag so that future focusouts can trigger closing if needed.
		closedByEscape = false;
	};
	
	const handleCardClick = (event: MouseEvent) => {
		if ((event.target as HTMLElement).closest('.card-menu') || isEditing) return;
		if (isSelected) {
			isEditing = true;
			tick().then(() => {
				if (textareaEl) {
					const scrollTop = textareaEl.scrollTop;
					textareaEl.focus();
					const frontmatterEnd = editorContent.indexOf('---', 3) + 4;
					const startPosition = frontmatterEnd > 3 ? frontmatterEnd : 0;
					textareaEl.setSelectionRange(startPosition, startPosition);
					textareaEl.scrollTop = scrollTop;
				}
			});
		} else {
			isSelected = true;
			newStickyNote.set(file.path);
			translateTransition = false;
			updateLayoutNextTick();
		}
	};
	
	const handleKeyDown = async (event: KeyboardEvent) => {
		event.preventDefault();
		if (event.key === "Escape" && isSelected) {
			if(isSelected) {
				if(isEditing) {
					closedByEscape = true;
					await closeEditor(false);
					translateTransition = true;
				} else {
					isSelected = false;
				}
			}
		}
	};
	
	const handleTextareaKeydown = async (event: KeyboardEvent) => {
		if (event.key === "Tab") {
			event.preventDefault();
			if (textareaEl) {
				const start = textareaEl.selectionStart;
				const end = textareaEl.selectionEnd;
				textareaEl.value = textareaEl.value.substring(0, start) + "\t" + textareaEl.value.substring(end);
				textareaEl.selectionStart = textareaEl.selectionEnd = start + 1;
				editorContent = textareaEl.value;
			}
		} else if (event.key === "Escape" && isEditing) {
			event.preventDefault();
			event.stopPropagation();
			closedByEscape = true;
			await closeEditor(true);
		}
	};

	onMount(async () => {
		const frontmatterColor = await extractColorFromFrontmatter(file);
		if (frontmatterColor) {
			selectedColor = frontmatterColor;
		}
		await updateLayoutNextTick();
		translateTransition = true;

		if (contentDiv !== null) await renderFile(contentDiv);
		if (get(newStickyNote) === file.path) {
			isEditing = true;
			newStickyNote.set(null);
			await tick();
			if (textareaEl) textareaEl.focus();
		}
		await updateLayoutNextTick();
		document.addEventListener("keydown", handleKeyDown);
	});

	onDestroy(() => {
		document.removeEventListener("keydown", handleKeyDown);
		updateLayoutNextTick();
	});

</script>

<div
	class="card"
	class:transition={translateTransition}
	class:selected={isSelected}
	transition:blur
	style="border-color: {selectedColor}; width: {cardWidth}px; height: {cardHeight}px;"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	ondragstart={(event) => onDragStart(event, file.path)}
	ondragover={(event) => onDragOver(event, file.path)}
	ondrop={handleDrop}
	draggable={!isEditing}
	role="group"
>
	<div class="card-contents" role="button" tabindex="0" onclick={handleCardClick} onkeydown={handleKeyDown}>
		{#if isEditing}
			<textarea bind:this={textareaEl} bind:value={editorContent} onfocusout={() => { if (!isClosing && !closedByEscape) closeEditor(true); }} onkeydown={handleTextareaKeydown}></textarea>
		{:else}
			<div class="read-view" bind:this={contentDiv}></div>
		{/if}
	</div>
	<div class="card-menu-wrapper" class:visible={isHoveringTop} style="background-color: {selectedColor};">
		<div class="card-menu">
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
		font-size: 0.9rem;
	}
	
	.card.transition {
		transition-property: transform;
		transition-duration: 0.2s;
	}

	.card.selected {		
		/* border-width: 3px; */
		/* border-top-width: 8px; */
		background-color: var(--background-primary);
	}

	.card:hover {
		border-color: var(--border-color-hover);
	}

	.card:hover .card-menu-wrapper {
		display: flex;
	}

	.card-menu-wrapper {
		position: absolute;
		top: -30px;
		left: 0;
		right: 0;
		height: 30px;
		/* background-color: var(--background-primary); */
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px;
		border-bottom: 1px solid var(--background-modifier-border);
		/* border-top: 0px solid var(--background-modifier-border); */
		border-top: none;
		transition: top 0.1s ease-in-out;
	}

	.card-menu-wrapper.visible {
		top: 0;
	}

	.card-menu {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
	}

	.color-picker {
		display: flex;
		gap: 0px;
	}

	.color-option {
		/* width: 20px; */
		height: 100%;
		cursor: pointer;
		border-radius: 0px;
		box-shadow: none;
	}

	.clickable-icon {
		cursor: pointer;
	}

	.card-contents {
		width: 100%;
		height: 100%;
	}
	.read-view {
		padding: var(--card-padding);
	}
	.read-view :global(ul) {
		padding-left: var(--size-4-5);
	}
	.read-view :global(pre) {
		white-space: pre-wrap;
		word-wrap: break-word;
	}
	.read-view :global(table) {
		width: 100%;
		border-collapse: collapse;
	}
	.read-view :global(th),
	.read-view :global(td) {
		border: 1px solid var(--background-modifier-border);
		padding: 4px 8px;
	}
	.read-view :global(th) {
		background-color: var(--background-secondary);
		font-weight: bold;
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

</style>
