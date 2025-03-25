import { ItemView, WorkspaceLeaf, TAbstractFile, TFile } from "obsidian";
import Root from './Root.svelte';
import { mount, unmount } from 'svelte';
import { get } from "svelte/store";
import store, { extractColorFromFrontmatter, Sort } from "./store";
import StickyNotesPlugin from "./main";
import { manualOrder, saveManualOrder } from './store';

export const VIEW_TYPE = 'sticky-notes-view';
export const NUM_LOAD = 20;


let draggedItem: string | null = null;

export const onDragStart = (event: DragEvent, path: string) => {
	draggedItem = path.split('/').pop() ?? null;
    event.dataTransfer?.setData('text/plain', draggedItem!);
};

export const onDragOver = (event: DragEvent) => {
	event.preventDefault();
};

export const onDrop = (event: DragEvent, targetPath: string) => {
	event.preventDefault();
	const targetName = targetPath.split('/').pop();
	const currentSort = get(store.sort);
	let newOrder: string[] = [];
	if (currentSort !== Sort.Manual) {
		// Build order from current sort criteria
		const unsortedFiles = get(store.files);
		let sortedList = unsortedFiles.slice();
		if (currentSort === Sort.ModifiedDesc) {
			sortedList.sort((a, b) => b.stat.mtime - a.stat.mtime);
		} else if (currentSort === Sort.ModifiedAsc) {
			sortedList.sort((a, b) => a.stat.mtime - b.stat.mtime);
		} else if (currentSort === Sort.CreatedDesc) {
			sortedList.sort((a, b) => b.stat.ctime - a.stat.ctime);
		} else if (currentSort === Sort.CreatedAsc) {
			sortedList.sort((a, b) => a.stat.ctime - b.stat.ctime);
		} else if (currentSort === Sort.Color) {
			sortedList.sort((a, b) => {
				const colorA = get(store.colorMap)[a.name] || "";
				const colorB = get(store.colorMap)[b.name] || "";
				return colorA.localeCompare(colorB);
			});
		}
		newOrder = sortedList.map(file => file.name);
	} else {
		newOrder = get(manualOrder);
	}
	const draggedIndex = newOrder.indexOf(draggedItem!);
	const targetIndex = targetName ? newOrder.indexOf(targetName) : -1;
	console.log(`Dropped ${draggedItem} (index ${draggedIndex}) on ${targetName} (index ${targetIndex})`);
	if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
		newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, draggedItem!);
		manualOrder.set(newOrder);
		saveManualOrder();
		// Switch to manual sort so the moved card stays in place.
		store.sort.set(Sort.Manual);
		// Trigger grid update after reordering
		const viewInstance = get(store.view);
		viewInstance?.root?.updateLayoutNextTick();
	}
	draggedItem = null;
};

export class StickyNotesView extends ItemView {
    root: ReturnType<typeof Root> | undefined;
	plugin: StickyNotesPlugin;
	lastWidth: number;
	lastHeight: number;
	viewContent: HTMLElement;
    autoScrollHandler: (event: DragEvent) => void;
    scrollVelocity: number = 0;
    autoScrollFrameId: number | null = null;
    dragEndHandler: (event: DragEvent) => void;

	constructor(leaf: WorkspaceLeaf, plugin: StickyNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.navigation = false;
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return 'Sticky Notes';
	}

	onResize() {
		const { clientWidth, clientHeight } = this.containerEl;
		if (
			(clientWidth !== 0 && clientHeight !== 0) &&
			(this.lastWidth !== clientWidth || this.lastHeight !== clientHeight)
		) {
			this.lastWidth = clientWidth;
			this.lastHeight = clientHeight;
			this.root?.updateLayoutNextTick();
		}
	}

    autoScrollLoop = () => {
        this.viewContent.scrollTop += this.scrollVelocity;
        if (this.scrollVelocity !== 0) {
            this.autoScrollFrameId = requestAnimationFrame(this.autoScrollLoop);
        } else {
            this.autoScrollFrameId = null;
        }
    };

	async onOpen() {
        const viewContent = this.containerEl.children[1] as HTMLElement;
        this.viewContent = viewContent;
        this.autoScrollHandler = (event: DragEvent) => {
            const rect = viewContent.getBoundingClientRect();
            const threshold = 50;
            if (!draggedItem) {
                this.scrollVelocity = 0;
                return;
            }
            const maxSpeed = 20;
            const topDistance = event.clientY - rect.top;
            const bottomDistance = rect.bottom - event.clientY;
            if (topDistance < threshold) {
                this.scrollVelocity = -maxSpeed * (1 - topDistance / threshold);
            } else if (bottomDistance < threshold) {
                this.scrollVelocity = maxSpeed * (1 - bottomDistance / threshold);
            } else {
                this.scrollVelocity = 0;
            }
            if (this.scrollVelocity !== 0 && this.autoScrollFrameId === null) {
                this.autoScrollFrameId = requestAnimationFrame(this.autoScrollLoop);
            }
        };
        viewContent.addEventListener("dragover", this.autoScrollHandler);
        this.dragEndHandler = (event: DragEvent) => {
            this.scrollVelocity = 0;
            if (this.autoScrollFrameId !== null) {
                cancelAnimationFrame(this.autoScrollFrameId);
                this.autoScrollFrameId = null;
            }
            draggedItem = null;
        };
        document.addEventListener("dragend", this.dragEndHandler);
        store.view.set(this);
        let md_files = this.app.vault.getMarkdownFiles();
		const folderPath = this.plugin.settings.sticky_notes_folder;
		md_files = md_files.filter(file => file.path.startsWith(folderPath));
		for (const file of md_files) {
			const color = await extractColorFromFrontmatter(file);
			if (color) {
				store.saveColor(file.name, color);
			}
		}
        store.files.set(md_files);
		this.registerEvent(
			this.app.vault.on("create", async (file: TAbstractFile) => {
				if (!this.app.workspace.layoutReady) {
					return;
				}
				if (file instanceof TFile && file.extension === "md") {
					store.files.update((files) => files?.concat(file));
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", async (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === "md") {
					store.files.update((files) =>
						files?.filter((f) => f.path !== file.path),
					);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", async (file: TAbstractFile) => {
				if (file instanceof TFile && file.extension === "md") {
					store.files.update((files) =>
						files?.map((f) => (f.path === file.path ? file : f)),
					);
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on("rename",
				async (file: TAbstractFile, oldPath: string) => {
					if (file instanceof TFile && file.extension === "md") {
						store.files.update((files) =>
							files?.map((f) => (f.path === oldPath ? file : f)),
						);
					}
				},
			),
		);
        store.displayedCount.set(NUM_LOAD);
        this.root = mount(Root, { 
            target: viewContent, 
            props: { 
                onDragStart, 
                onDragOver, 
                onDrop,
                createNewNote: () => this.plugin.create_new_sticky_note(true)
            } 
        });
		this.lastWidth = this.containerEl.clientWidth;
		this.lastHeight = this.containerEl.clientHeight;

		viewContent.addEventListener("scroll", async () => {
			if (
				viewContent.scrollTop + viewContent.clientHeight >
				viewContent.scrollHeight - 500
			) {
				store.displayedCount.set(get(store.displayedFiles).length + NUM_LOAD);
			}
		});
	}

	async onClose() {
		store.displayedCount.set(NUM_LOAD);
        if (this.viewContent && this.autoScrollHandler) {
            this.viewContent.removeEventListener("dragover", this.autoScrollHandler);
        }
        document.removeEventListener("dragend", this.dragEndHandler);
        if (this.autoScrollFrameId !== null) {
            cancelAnimationFrame(this.autoScrollFrameId);
            this.autoScrollFrameId = null;
        }
		if (this.root) {
			unmount(this.root);
		}
	}
}
