import { ItemView, WorkspaceLeaf, TAbstractFile, TFile } from "obsidian";
import Root from './Root.svelte';
import { mount, unmount } from 'svelte';
import { get } from "svelte/store";
import store, { extractColorFromFrontmatter } from "./store";
import StickyNotesPlugin from "./main";
import { manualOrder, saveManualOrder } from './store';

export const VIEW_TYPE = 'sticky-notes-view';
export const NUM_LOAD = 20;


let draggedItem: string | null = null;

export const onDragStart = (event: DragEvent, path: string) => {
	draggedItem = path;
	event.dataTransfer?.setData('text/plain', path);
};

export const onDragOver = (event: DragEvent) => {
	event.preventDefault();
};

export const onDrop = (event: DragEvent, targetPath: string) => {
	event.preventDefault();
	const order = get(manualOrder);
	const draggedIndex = order.indexOf(draggedItem!);
	const targetIndex = order.indexOf(targetPath);

	if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
		order.splice(draggedIndex, 1);
		order.splice(targetIndex, 0, draggedItem!);
		manualOrder.set(order);
		saveManualOrder();
	}
	draggedItem = null;
};

export class StickyNotesView extends ItemView {
    root: ReturnType<typeof Root> | undefined;
	plugin: StickyNotesPlugin;
	lastWidth: number;
	lastHeight: number;
	viewContent: HTMLElement; // existing: scrolling container
    autoScrollHandler: (event: DragEvent) => void; // existing: initial handler
    scrollVelocity: number = 0; // new property for velocity
    autoScrollFrameId: number | null = null; // new property for requestAnimationFrame id
    dragEndHandler: (event: DragEvent) => void; // new property for drag end handler

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

    // new method to update scrolling on every animation frame
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
        // Update auto-scroll handler to compute velocity based on proximity to edge
        this.autoScrollHandler = (event: DragEvent) => {
            const rect = viewContent.getBoundingClientRect();
            const threshold = 50;
            // Reset velocity if not dragging
            if (!draggedItem) {
                this.scrollVelocity = 0;
                return;
            }
            const maxSpeed = 20; // updated maximum scroll speed (was 10)
            const topDistance = event.clientY - rect.top;
            const bottomDistance = rect.bottom - event.clientY;
            if (topDistance < threshold) {
                this.scrollVelocity = -maxSpeed * (1 - topDistance / threshold);
            } else if (bottomDistance < threshold) {
                this.scrollVelocity = maxSpeed * (1 - bottomDistance / threshold);
            } else {
                this.scrollVelocity = 0;
            }
            // Start loop if not already running and velocity is non-zero
            if (this.scrollVelocity !== 0 && this.autoScrollFrameId === null) {
                this.autoScrollFrameId = requestAnimationFrame(this.autoScrollLoop);
            }
        };
        viewContent.addEventListener("dragover", this.autoScrollHandler);
        // Add handler to stop scrolling when dragging ends
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
				store.saveColor(file.path, color);
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
		// Remove auto-scroll listener and cancel any pending animation
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
