import { ItemView, WorkspaceLeaf, TAbstractFile, TFile } from "obsidian";
import Root from './Root.svelte';
import { mount, unmount } from 'svelte';
import { derived, get, writable } from "svelte/store";
import store, { Sort } from "./store";
import StickyNotesPlugin from "./main";

export const VIEW_TYPE = 'sticky-notes-view';

export class StickyNotesView extends ItemView {
    root: ReturnType<typeof Root> | undefined;
	plugin: StickyNotesPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: StickyNotesPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return 'Sticky Notes';
	}

	onResize() {
		this.root?.updateLayoutNextTick();
	}

	async onOpen() {
        const viewContent = this.containerEl.children[1];
        store.view.set(this);
        let md_files = this.app.vault.getMarkdownFiles();
		const folderPath = this.plugin.settings.sticky_notes_folder;
		md_files = md_files.filter(file => file.path.startsWith(folderPath));
        // console.log(md_files);
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
			this.app.vault.on(
			  "rename",
			  async (file: TAbstractFile, oldPath: string) => {
				if (file instanceof TFile && file.extension === "md") {
				  store.files.update((files) =>
					files?.map((f) => (f.path === oldPath ? file : f)),
				  );
				}
			  },
			),
		  );
        // store.displayedCount.set(50);
        console.log(get(store.displayedFiles));
        this.root = mount(Root, {target: viewContent});

		viewContent.addEventListener("scroll", async () => {
			if (
			  viewContent.scrollTop + viewContent.clientHeight >
			  viewContent.scrollHeight - 500
			) {
			  store.displayedCount.set(get(store.displayedFiles).length + 25);
			}
		  });
	}

	async onClose() {
		store.displayedCount.set(25);
        // if (this.counter) {
        //     unmount(this.counter);
        // }
	}
}
