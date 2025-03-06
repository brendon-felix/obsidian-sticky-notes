<script lang="ts">
	import type { TFile } from "obsidian";
	import { onMount, tick, onDestroy } from "svelte";
	import { MarkdownPreviewRenderer, MarkdownRenderer } from "obsidian";
	import { extractColorFromFrontmatter, newStickyNote, app, view } from "./store";
	import { get } from "svelte/store";
	
	export let file: TFile;
	export let updateLayoutNextTick: () => Promise<void>;
	
	let contentDiv: HTMLElement | null = null;
	let isEditing: boolean = false;
	let editorContent: string = "";
	let textareaEl: HTMLTextAreaElement | null = null;
	let isClosing: boolean = false;
	// NEW flag to avoid duplicate close from focusout after Escape
	let closedByEscape: boolean = false;
	
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
		if (saveChanges) {
			if (editorContent !== originalContent) {
				await file.vault.modify(file, editorContent);
				await updateLayoutNextTick();
			}
		} else {
			editorContent = originalContent;
		}
		isEditing = false;
		await tick();
		if (contentDiv !== null) await renderFile(contentDiv);
		isClosing = false;
		// reset the flag so that future focusouts can trigger closing if needed.
		closedByEscape = false;
	};
	
	const handleCardClick = (event: MouseEvent) => {
		if ((event.target as HTMLElement).closest('.card-menu') || isEditing) return;
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
	};
	
	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && isEditing) {
			closedByEscape = true;
			closeEditor(true);
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

<div class="card-contents" role="button" tabindex="0" on:click={handleCardClick} on:keydown={handleKeyDown}>
	{#if isEditing}
		<textarea bind:this={textareaEl} bind:value={editorContent} on:focusout={() => { if (!isClosing && !closedByEscape) closeEditor(true); }} on:keydown={handleTextareaKeydown}></textarea>
	{:else}
		<div class="read-view" bind:this={contentDiv}></div>
	{/if}
</div>

<style>
	.card-contents {
		width: 100%;
        height: 100%;
	}
	.read-view {
		padding: var(--card-padding);
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
