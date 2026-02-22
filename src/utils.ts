import { Block } from './types';
import { GRID_ROWS, GRID_COLS, BLOCK_VALUES, TARGET_MIN, TARGET_MAX } from './constants';

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const createBlock = (row: number, col: number, value?: number): Block => ({
  id: generateId(),
  value: value ?? BLOCK_VALUES[Math.floor(Math.random() * BLOCK_VALUES.length)],
  row,
  col,
});

export const generateTarget = () => {
  return Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
};

export const createInitialGrid = (rows: number): (Block | null)[][] => {
  const grid: (Block | null)[][] = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => null)
  );

  for (let r = GRID_ROWS - 1; r >= GRID_ROWS - rows; r--) {
    for (let c = 0; c < GRID_COLS; c++) {
      grid[r][c] = createBlock(r, c);
    }
  }

  return grid;
};

export const getSelectedSum = (grid: (Block | null)[][], selectedIds: string[]) => {
  let sum = 0;
  grid.forEach(row => {
    row.forEach(block => {
      if (block && selectedIds.includes(block.id)) {
        sum += block.value;
      }
    });
  });
  return sum;
};
