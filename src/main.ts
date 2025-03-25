// TODO: Finish implementing default color setting
//   TODO: Make default color setting take effect on new notes
// TODO: When newly created note is not at the beginning, scroll to it
// TODO: Add command or menu option to remove color mapping and/or manual ordering
//   TODO: Remove all local storage data when uninstalling
// TODO: Find better way to cut off text for efficiency (variable card size means this is not simple)
// TODO: Add option to sort notes by color
// TODO: On card hover, indicate it is clickable (modify background and/or border color)
// TODO: Emphasize the current note being edited
// TODO: Add command to delete current sticky note
// TODO: Suport selecting multiple notes to delete or change color or move positions
// TODO: Add setting to configure default note color
// TODO: Add key commands to zoom in/out of root
// TODO: Add reset button to reset note color to default
// TODO: Add setting for naming pattern (currently Unix timestamp)
// TODO: Add notification on deletion and undo option
//   TODO: Add support for Ctrl+Z and Ctrl+Y
// TODO: Add a search bar
// TODO: Add right-click menu
//   TODO: Add option to delete note
//   TODO: Add option to open notes in same tab, new tab, new window, new pane, etc.
// TODO: Add drag and drop functionality to trash notes
// TODO: Emphasize the current color selected in color selection
//   TODO: shift/translate outline for emphasis to show swtich in color

// FIX: Make sure only one card can be selected at a time
//   TODO: Support shift-click and ctrl-click for multiple selection
// FIX: Reset colors command doesn't take effect until reloading
// FIX: Make card size peristent across re-open and reload
// FIX: Support ribbon menu while editing (just shift text area instead of covering it)
// FIX: Text is often blurry while editing a sticky note
// FIX: Changing folder path setting leads to odd behavior
// FIX: Layout is updated in the background while view port is 0 x 0
// 		which causes invalid layouts (all stacked on top of each other)
// FIX: Finishing implementing set frontmatter color property
// FIX: With big card size, zooming in makes the card size too big

// REFACTOR: Place settings code in it's own src file
// REFACTOR: Place svelte components in their own folder

import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	WorkspaceLeaf,
} from 'obsidian';
import { StickyNotesView, VIEW_TYPE } from "./view";
import store, { loadColorMap, settings, newStickyNote, displayedCount } from "./store";
import { manualOrder, saveManualOrder } from "./store";
import { colorMap, saveColorMap } from "./store";

import { FolderSuggest } from "./FolderSuggestor";
import { writable, get } from "svelte/store";

const colors: { [key: string]: string } = {
	"Yellow": "#E6B905",
	"Green": "#6FD262",
	"Blue": "#5AC0E7",
	"Purple": "#C78EFF",
	"Pink": "#EA86C2",
	"Red": "#FF7F50",
	"Gray": "#AAAAAA",
	// "darkgray": "#454545",
};

export interface StickyNotesSettings {
	sticky_notes_folder: string;
	set_color_in_frontmatter: boolean;
	// default_note_color: string;
}

export const DEFAULT_SETTINGS: StickyNotesSettings = {
	sticky_notes_folder: "",
	set_color_in_frontmatter: false,
	// default_note_color: "Yellow"
}

export default class StickyNotesPlugin extends Plugin {
	settings: StickyNotesSettings;

	async onload() {
		await this.loadSettings();
		store.app.set(this.app);
		settings.set(this.settings);
		loadColorMap();

		this.registerView(
			VIEW_TYPE,
			(leaf) => new StickyNotesView(leaf, this)
		);

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
			callback: async () => {
				await this.activateView();
				await this.create_new_sticky_note(true);
			}
		});

		this.addCommand({
			id: 'reset-all-sticky-notes-colors',
			name: 'Reset all sticky notes colors to default',
			callback: async () => {
				await this.resetAllStickyNotesColors();
			}
		});

		this.addSettingTab(new StickyNotesSettingsTab(this.app, this));

	}

	onunload() {

	}

	async create_new_sticky_note(inline: boolean = false) {
		const root = this.app.vault.getRoot().path;
		const timestamp = Math.floor(Date.now() / 1000);
		const filename = `${timestamp}`;
		const path = `${root}Sticky Notes/${filename}.md`;
		const created_note = await this.app.vault.create(path, "");
		if (inline) {
			newStickyNote.set(created_note.path);
			manualOrder.update(order => [created_note.name, ...order.filter(p => p !== created_note.name)]);
			saveManualOrder();
			displayedCount.update(count => count + 1); // Increase the displayed count
		} else {
			const active_leaf = this.app.workspace.getLeaf(false);
			await active_leaf.openFile(created_note, {
				state: { mode: "source" },
			});
		}
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
		settings.set(this.settings);
	}

	async resetAllStickyNotesColors() {
		// const defaultColor = colors[this.settings.default_note_color];
		const defaultColor = colors["Gray"];
		colorMap.update(currentColorMap => {
			for (const key in currentColorMap) {
				currentColorMap[key] = defaultColor;
			}
			return currentColorMap;
		});
		saveColorMap();
		const viewInstance = get(store.view);
		viewInstance?.root?.updateLayoutNextTick();
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
            .setDesc("Sticky notes are created and viewed from here.")
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

		new Setting(this.containerEl)
			.setName("Set color in frontmatter")
			.setDesc("When enabled, sets the color property in the frontmatter of the note when its color is changed.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.set_color_in_frontmatter)
					.onChange(async (value: boolean) => {
						this.plugin.settings.set_color_in_frontmatter = value;
						await this.plugin.saveSettings();
					});
			});

		// const defaultColorStore = writable(this.plugin.settings.default_note_color);

		// new Setting(this.containerEl)
		// 	.setName("Default note color")
		// 	.setDesc("Specify the default color for new sticky notes.")
		// 	.addDropdown((dropdown) => {
		// 		Object.keys(colors).forEach((colorName: string) => {
		// 			dropdown.addOption(colorName, colorName);
		// 		});
		// 		dropdown.setValue(this.plugin.settings.default_note_color)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.default_note_color = value;
		// 				defaultColorStore.set(colors[value]);
		// 				await this.plugin.saveSettings();
		// 			});
		// 	})
		// 	.addExtraButton((button) => {
		// 		button.setIcon("dot")
		// 			.setTooltip("Selected color")
		// 			.extraSettingsEl.style.backgroundColor = colors[this.plugin.settings.default_note_color];
		// 		defaultColorStore.subscribe((color) => {
		// 			button.extraSettingsEl.style.backgroundColor = color;
		// 		});
		// 	});
	}
}