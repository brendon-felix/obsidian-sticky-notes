<script lang="ts">
	import {
		setIcon,
		TFile,
	} from "obsidian";
	import { onMount, tick, onDestroy } from "svelte";
	import { blur } from "svelte/transition";
	import { saveColor, extractColorFromFrontmatter, manualOrder, saveManualOrder } from "./store";
	import CardContents from "./CardContents.svelte";

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

	const colors = ["#FFD700", "#FF6347", "#90EE90", "#87CEEB", "#DDA0DD"];

	let isHoveringTop: boolean = $state(false);

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

	onMount(async () => {
		const frontmatterColor = await extractColorFromFrontmatter(file);
		if (frontmatterColor) {
			selectedColor = frontmatterColor;
		}
		await updateLayoutNextTick();
		translateTransition = true;
	});

	onDestroy(() => {
		updateLayoutNextTick();
	});

</script>

<div
	class="card"
	class:transition={translateTransition}
	transition:blur
	style="border-color: {selectedColor}; width: {cardWidth}px; height: {cardHeight}px;"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	ondragstart={(event) => onDragStart(event, file.path)}
	ondragover={(event) => onDragOver(event, file.path)}
	ondrop={handleDrop}
	draggable="true"
	role="group"
>
	<CardContents {file} {updateLayoutNextTick} />
	<div class="card-menu-wrapper" class:visible={isHoveringTop}>
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
	}
	
	.card.transition {
		transition-property: transform;
		transition-duration: 0.2s;
	}

	.card {
		font-size: 0.9rem;
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
		background-color: var(--background-primary);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 10px;
		border-bottom: 1px solid var(--background-modifier-border);
		border-top: 0px solid var(--background-modifier-border);
		transition: top 0.2s ease-in-out;
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
		gap: 2px;
	}

	.color-option {
		width: 20px;
		height: 16px;
		cursor: pointer;
		border-radius: 4px;
	}

	.clickable-icon {
		cursor: pointer;
	}

</style>
