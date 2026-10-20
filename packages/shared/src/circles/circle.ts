/** Full circle in API responses */
export interface Circle {
  id: string;
  name: string;
  color: string | null;
  parentCircleId: string | null;
  sortOrder: number;
  friendCount: number;
  createdAt: string;
  updatedAt: string;
}
