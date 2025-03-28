import {
    type App,
    ItemView,
    TFile,
    parseYaml,
} from "obsidian";
import { derived, get, writable } from "svelte/store";
import { type StickyNotesSettings } from "./main";
import { StickyNotesView } from "./view";

export enum Sort {
	ModifiedDesc = "modifiedDesc",   // new to old
	ModifiedAsc = "modifiedAsc",     // old to new
	CreatedDesc = "createdDesc",     // new to old
	CreatedAsc = "createdAsc",       // old to new
	Color = "color",
	Manual = "manual",
}

export const app = writable<App>();
export const view = writable<StickyNotesView>();
export const files = writable<TFile[]>([]);

// Change: Initialize sort from localStorage if available.
const storedSort = localStorage.getItem('stickyNotesSort');
export const sort = writable<Sort>(storedSort ? JSON.parse(storedSort) : Sort.ModifiedDesc);
sort.subscribe(value => {
	localStorage.setItem('stickyNotesSort', JSON.stringify(value));
});

export const colorMap = writable<Record<string, string>>({});

export const saveColorMap = () => {
    localStorage.setItem('stickyNotesColorMap', JSON.stringify(get(colorMap)));
};

export const loadColorMap = () => {
    const savedColorMap = localStorage.getItem('stickyNotesColorMap');
    if (savedColorMap) {
        colorMap.set(JSON.parse(savedColorMap));
    }
};

export const settings = writable<StickyNotesSettings>();

export const saveColor = async (filePath: string, color: string) => {
    const fileName = filePath.split('/').pop();
    const currentSettings = get(settings);
    if (currentSettings.set_color_in_frontmatter) {
        console.log("Setting color in frontmatter is not implemented yet.");
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
    } else {
        if (fileName) {
            const currentColorMap = get(colorMap);
            currentColorMap[fileName] = color;
            colorMap.set(currentColorMap);
            saveColorMap();
        }
	}
};

export const loadColor = (filePath: string): string | undefined => {
    const fileName = filePath.split('/').pop();
    const currentColorMap = get(colorMap);
    return fileName ? currentColorMap[fileName] : undefined;
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
export const manualOrderLoaded = writable(false);

export const saveManualOrder = () => {
	localStorage.setItem('stickyNotesManualOrder', JSON.stringify(get(manualOrder)));
};

export const loadManualOrder = () => {
	const savedOrder = localStorage.getItem('stickyNotesManualOrder');
	if (savedOrder) {
		manualOrder.set(JSON.parse(savedOrder));
	}
	manualOrderLoaded.set(true);
};

loadManualOrder();

const sortedFiles = derived(
	[files, sort, manualOrder, colorMap],
	([$files, $sort, $manualOrder, $colorMap]) => {
		if ($sort === Sort.Manual && $manualOrder.length > 0) {
			const orderedFiles = $manualOrder
				 .map(name => $files.find(file => file.name === name))
				.filter(Boolean);
			const unorderedFiles = $files.filter(file => !$manualOrder.includes(file.name));
			return [...orderedFiles, ...unorderedFiles];
		} else if ($sort === Sort.ModifiedDesc) {
			return $files.slice().sort((a, b) => b.stat.mtime - a.stat.mtime);
		} else if ($sort === Sort.ModifiedAsc) {
			return $files.slice().sort((a, b) => a.stat.mtime - b.stat.mtime);
		} else if ($sort === Sort.CreatedDesc) {
			return $files.slice().sort((a, b) => b.stat.ctime - a.stat.ctime);
		} else if ($sort === Sort.CreatedAsc) {
			return $files.slice().sort((a, b) => a.stat.ctime - b.stat.ctime);
		} else if ($sort === Sort.Color) {
			return $files.slice().sort((a, b) => {
				const colorA = $colorMap[a.name] || "";
				const colorB = $colorMap[b.name] || "";
				return colorA.localeCompare(colorB);
			});
		}
		return $files;
	},
	[] as TFile[],
);

files.subscribe((fileList) => {
	// // Only update manualOrder if sort is Manual and manual order has been loaded.
	// if (get(sort) !== Sort.Manual || !get(manualOrderLoaded)) return;
	
	// const currentOrder = get(manualOrder);
	// const fileNames = fileList.map(file => file.name);
	
	// // Preserve saved order for existing files.
	// const filteredOrder = currentOrder.filter(name => fileNames.includes(name));
	// // Append any new files (preserving fileList order).
	// const missingFiles = fileNames.filter(name => !filteredOrder.includes(name));
	// const updatedOrder = [...filteredOrder, ...missingFiles];
	
	// if (JSON.stringify(updatedOrder) !== JSON.stringify(currentOrder)) {
	// 	manualOrder.set(updatedOrder);
	// 	saveManualOrder();
	// }
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
