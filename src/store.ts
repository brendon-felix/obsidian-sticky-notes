import {
    type App,
    ItemView,
    TFile,
    parseYaml, // Import parseYaml function
} from "obsidian";
import { derived, get, writable } from "svelte/store";

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

export const saveColor = (filePath: string, color: string) => {
    colorMap[filePath] = color;
    saveColorMap();
	console.log(colorMap);
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
};
