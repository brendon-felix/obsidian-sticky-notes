import {
    type App,
    ItemView,
    TFile,
    parseYaml,
} from "obsidian";
import { derived, get, writable } from "svelte/store";
import { type StickyNotesSettings } from "./main";

export enum Sort {
	ModifiedDesc = "modifiedDesc",   // new to old
	ModifiedAsc = "modifiedAsc",     // old to new
	CreatedDesc = "createdDesc",     // new to old
	CreatedAsc = "createdAsc",       // old to new
	Manual = "manual",
}

export const app = writable<App>();
export const view = writable<ItemView>();
export const files = writable<TFile[]>([]);
export const sort = writable<Sort>(Sort.ModifiedDesc);

export const colorMap: Record<string, string> = {};

export const saveColorMap = () => {
    localStorage.setItem('stickyNotesColorMap', JSON.stringify(colorMap));
};

export const loadColorMap = () => {
    const savedColorMap = localStorage.getItem('stickyNotesColorMap');
    if (savedColorMap) {
        Object.assign(colorMap, JSON.parse(savedColorMap));
    }
};

export const settings = writable<StickyNotesSettings>();

export const saveColor = async (filePath: string, color: string) => {
    const currentSettings = get(settings);
    if (currentSettings.set_color_in_frontmatter) {
        // const file = get(app).vault.getAbstractFileByPath(filePath) as TFile;
        // if (file) {
        //     const content = await file.vault.read(file);
        //     const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        //     let newContent;
        //     if (frontmatterMatch) {
        //         const frontmatter = parseYaml(frontmatterMatch[1]);
        //         frontmatter.color = color;
        //         newContent = content.replace(
        //             /^---\n[\s\S]*?\n---/,
        //             `---\n${stringifyYaml(frontmatter)}---`
        //         );
        //     } else {
        //         newContent = `---\ncolor: ${color}\n---\n${content}`;
        //     }
        //     await file.vault.modify(file, newContent);
        // }
		console.log("Setting color in frontmatter is not implemented yet.");
    } else {
		colorMap[filePath] = color;
		saveColorMap();
	}
};

export const loadColor = (filePath: string): string | undefined => {
    return colorMap[filePath];
};

export const extractColorFromFrontmatter = async (file: TFile): Promise<string | undefined> => {
    const content = await file.vault.cachedRead(file);
    const frontmatterMatch = content.match(/^---\n([\\s\S]*?)\n---/);
    if (frontmatterMatch) {
        const frontmatter = parseYaml(frontmatterMatch[1]);
        return frontmatter.color;
    }
    return undefined;
};

export const manualOrder = writable<string[]>([]);

export const saveManualOrder = () => {
	localStorage.setItem('stickyNotesManualOrder', JSON.stringify(get(manualOrder)));
};

export const loadManualOrder = () => {
	const savedOrder = localStorage.getItem('stickyNotesManualOrder');
	if (savedOrder) {
		manualOrder.set(JSON.parse(savedOrder));
	}
};

loadManualOrder();

const sortedFiles = derived(
	[files, sort, manualOrder],
	([$files, $sort, $manualOrder]) => {
		if ($sort === Sort.Manual && $manualOrder.length > 0) {
			const orderedFiles = $manualOrder
				.map(path => $files.find(file => file.path === path))
				.filter(Boolean);
			const unorderedFiles = $files.filter(file => !$manualOrder.includes(file.path));
			return [...orderedFiles, ...unorderedFiles];
		} else if ($sort === Sort.ModifiedDesc) {
			return $files.slice().sort((a, b) => b.stat.mtime - a.stat.mtime);
		} else if ($sort === Sort.ModifiedAsc) {
			return $files.slice().sort((a, b) => a.stat.mtime - b.stat.mtime);
		} else if ($sort === Sort.CreatedDesc) {
			return $files.slice().sort((a, b) => b.stat.ctime - a.stat.ctime);
		} else if ($sort === Sort.CreatedAsc) {
			return $files.slice().sort((a, b) => a.stat.ctime - b.stat.ctime);
		}
		return $files;
	},
	[] as TFile[],
);

files.subscribe((fileList) => {
	const currentOrder = get(manualOrder);
	const newOrder = fileList.map(file => file.path);
	const filteredOrder = currentOrder.filter(path => newOrder.includes(path));
	const missingFiles = newOrder.filter(path => !filteredOrder.includes(path));
	const updatedOrder = [...filteredOrder, ...missingFiles];
	if (JSON.stringify(updatedOrder) !== JSON.stringify(currentOrder)) {
		manualOrder.set(updatedOrder);
		saveManualOrder();
	}
});

export const displayedCount = writable(0);
export const displayedFiles = writable<TFile[]>([]);

displayedFiles.set(
    get(sortedFiles)
      .filter((file): file is TFile => file !== undefined)
      .slice(0, get(displayedFiles).length),
);

sortedFiles.subscribe(($sortedFiles) => {
    displayedFiles.set(
      $sortedFiles
        .filter((file): file is TFile => file !== undefined)
        .slice(0, get(displayedFiles).length),
    );
});
displayedCount.subscribe((count) => {
    displayedFiles.set(
      get(sortedFiles)
        .filter((file): file is TFile => file !== undefined)
        .slice(0, count),
    );
});

export const newStickyNote = writable<string | null>(null);

export default {
    files,
    sort,
    displayedCount,
    displayedFiles,
    app,
    view,
    saveColor,
    loadColor,
	colorMap,
    saveColorMap,
    loadColorMap,
    extractColorFromFrontmatter,
    settings,
	manualOrder,
	saveManualOrder,
	loadManualOrder,
    newStickyNote,
};
