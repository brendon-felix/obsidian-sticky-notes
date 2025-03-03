import {
    type App,
    ItemView,
    TFile,
    parseYaml,
    stringifyYaml,
} from "obsidian";
import { derived, get, writable } from "svelte/store";
import { type StickyNotesSettings } from "./main";

export enum Sort {
    Created = "ctime",
    Modified = "mtime",
}

export const app = writable<App>();
export const view = writable<ItemView>();
export const files = writable<TFile[]>([]);
export const sort = writable<Sort>(Sort.Modified);

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
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
        const frontmatter = parseYaml(frontmatterMatch[1]);
        return frontmatter.color;
    }
    return undefined;
};

const sortedFiles = derived(
    [sort, files],
    ([$sort, $files]) =>
      [...$files].sort(
        (a: TFile, b: TFile) =>
          b.stat[$sort] - a.stat[$sort],
      ),
    [] as TFile[],
);

export const displayedCount = writable(0);
export const displayedFiles = writable<TFile[]>([]);

displayedFiles.set(
    get(sortedFiles)
      .slice(0, get(displayedFiles).length),
);

sortedFiles.subscribe(($sortedFiles) => {
    displayedFiles.set(
      $sortedFiles
        .slice(0, get(displayedFiles).length),
    );
});

displayedCount.subscribe((count) => {
    displayedFiles.set(
      get(sortedFiles)
        .slice(0, count),
    );
});

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
};
