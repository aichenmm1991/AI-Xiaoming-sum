export type GameMode = 'classic' | 'time';

export interface Block {
  id: string;
  value: number;
  row: number;
  col: number;
  isRemoving?: boolean;
}

export interface GameState {
  grid: (Block | null)[][];
  target: number;
  score: number;
  level: number;
  gameOver: boolean;
  selectedIds: string[];
  mode: GameMode;
  timeLeft: number;
}
