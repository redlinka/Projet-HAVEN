interface RoomSession {
  roomId: string;
  userName: string;
  gameId: string;
  isAdmin: boolean;
  difficulty: { cols: number; rows: number };
}

const KEY = "room_session";

export const RoomSessionService = {
  save(session: RoomSession): void {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  },
  load(): RoomSession | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear(): void {
    sessionStorage.removeItem(KEY);
  },
};
