import { get } from 'svelte/store';
import { manualOrder, saveManualOrder } from './store';

let draggedItem: string | null = null;

export const onDragStart = (event: DragEvent, path: string) => {
	draggedItem = path;
	event.dataTransfer?.setData('text/plain', path);
};

export const onDragOver = (event: DragEvent) => {
	event.preventDefault();
};

export const onDrop = (event: DragEvent, targetPath: string) => {
	event.preventDefault();
	const order = get(manualOrder);
	const draggedIndex = order.indexOf(draggedItem!);
	const targetIndex = order.indexOf(targetPath);

	if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
		order.splice(draggedIndex, 1);
		order.splice(targetIndex, 0, draggedItem!);
		manualOrder.set(order);
		saveManualOrder();
	}
	draggedItem = null;
};
