import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { derived, get, writable } from "svelte/store";
import { StickyNotesView, VIEW_TYPE } from "./view";
import store from "./store";

import { FolderSuggest } from "./FolderSuggestor";

interface StickyNotesSettings {
	sticky_notes_folder: string;
}

const DEFAULT_SETTINGS: StickyNotesSettings = {
	sticky_notes_folder: "",
}

export default class StickyNotesPlugin extends Plugin {
	settings: StickyNotesSettings;

	async onload() {
		await this.loadSettings();
		store.app.set(this.app);

		this.registerView(
			VIEW_TYPE,
			(leaf) => new StickyNotesView(leaf, this)
		);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('sticky-note', 'Sticky Notes', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-sticky-notes',
			name: 'View sticky notes',
			callback: () => {
				this.activateView();
			}
		});
		this.addCommand({
			id: 'create-new-sticky-note',
			name: 'Create new sticky note',
			callback: () => {
				this.create_new_sticky_note();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new StickyNotesSettingsTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async create_new_sticky_note() {
		const root = this.app.vault.getRoot().path;
		// const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
		const timestamp = Date.now();
		const filename = `${timestamp}`;
		const path = `${root}Sticky Notes/${filename}.md`;
		console.log(`${path}`);
		const created_note = await this.app.vault.create(path, "");
		const active_leaf = this.app.workspace.getLeaf(false);
		await active_leaf.openFile(created_note, {
			state: { mode: "source" },
		});
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);
		
		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}
		workspace.revealLeaf(leaf);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class StickyNotesSettingsTab extends PluginSettingTab {
	plugin: StickyNotesPlugin;

	constructor(app: App, plugin: StickyNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", {
			text: "Options for File Chucker",
		});

		new Setting(this.containerEl)
            .setName("Sticky Notes folder location")
            .setDesc("Sticky notes are created and viewed here.")
            .addSearch((cb) => {
                new FolderSuggest(this.app, cb.inputEl);
                cb.setPlaceholder("Example: folder1/folder2")
                    .setValue(this.plugin.settings.sticky_notes_folder)
                    .onChange((new_folder) => {
                        this.plugin.settings.sticky_notes_folder = new_folder;
                        this.plugin.saveSettings();
                    });
                // @ts-ignore
                cb.containerEl.addClass("templater_search");
            });
	}
}