
// TODO: Create a new note button
// TODO: Add notification on deletion and undo option
//   TODO: Add support for Ctrl+Z and Ctrl+Y
// TODO: Store state of note order, color, etc.
// TODO: Figure out a better format for automatic titles
//   TODO: Add setting to configure automatic title format
// TODO: Create menu for selecting note color
// TODO: Improve layout, possibly use a single column
// TODO: Add a search bar
// TODO: Implement in-card editing
// TODO: Add option to open notes in same tab, new tab, new window, new pane, etc.
// TODO: Add drag and drop functionality to reorder notes
// TODO: Add drag and drop functionality to trash notes

// FIX: Border highlight on hover

import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from 'obsidian';
import { StickyNotesView, VIEW_TYPE } from "./view";
import store from "./store";

import { FolderSuggest } from "./FolderSuggestor";

interface StickyNotesSettings {
	sticky_notes_folder: string;
}

export const DEFAULT_SETTINGS: StickyNotesSettings = {
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

		this.addSettingTab(new StickyNotesSettingsTab(this.app, this));

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
			// leaf = workspace.getLeaf(false);
			leaf = workspace.getLeaf("tab");
		}
		await leaf.setViewState({ type: VIEW_TYPE, active: true });
		// workspace.revealLeaf(leaf);
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
			text: "Sticky Notes Settings",
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