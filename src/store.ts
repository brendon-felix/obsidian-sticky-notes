
import {
    type App,
    ItemView,
    TFile,
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

const sortedFiles = derived(
    [sort, files],
    ([$sort, $files]) =>
      [...$files].sort(
        (a: TFile, b: TFile) =>
        //   ($pinnedFiles.includes(b.path) ? 1 : 0) -
        // 	($pinnedFiles.includes(a.path) ? 1 : 0) ||
          b.stat[$sort] - a.stat[$sort],
      ),
    [] as TFile[],
);

export const displayedCount = writable(0);
export const displayedFiles = writable<TFile[]>([]);

displayedFiles.set(
    get(sortedFiles)
    //   .filter((f) => !get(searchResultsExcluded).has(f))
      .slice(0, get(displayedFiles).length),
);

sortedFiles.subscribe(($sortedFiles) => {
    displayedFiles.set(
      $sortedFiles
        // .filter((f) => !get(searchResultsExcluded).has(f))
        .slice(0, get(displayedFiles).length),
    );
});

displayedCount.subscribe((count) => {
    displayedFiles.set(
      get(sortedFiles)
        // .filter((f) => !get(searchResultsExcluded).has(f))
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
};
