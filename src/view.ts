import { ItemView, WorkspaceLeaf, TAbstractFile, TFile } from "obsidian";
import Root from './Root.svelte';
import { mount, unmount } from 'svelte';
import { derived, get, writable } from "svelte/store";
import store, { Sort } from "./store";


export const VIEW_TYPE_EXAMPLE = 'example-view';

export class ExampleView extends ItemView {
    // counter: ReturnType<typeof Root> | undefined;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return 'Sticky Notes';
	}

	async onOpen() {
        const viewContent = this.containerEl.children[1];
        store.view.set(this);
        let md_files = this.app.vault.getMarkdownFiles();
        // console.log(md_files);
        store.files.set(md_files);
        store.displayedCount.set(50);
        console.log(get(store.displayedFiles));
        mount(Root, {target: viewContent});
	}

	async onClose() {
        // if (this.counter) {
        //     unmount(this.counter);
        // }
	}
}
