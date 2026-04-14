import { createContext, useContext } from "react";
import type { RoomService } from "../services/RoomService";

/**
 * Context allowing child components (RoomCreator, RoomJoiner)
 * to access the ChatManager without passing through props.
 *
 * Usage in a child component:
 *   const chatManager = useChatManager();
 */
export const RoomServiceContext = createContext<RoomService | null>(null);

/**
 * Utility hook to consume the RoomServiceContext.
 * Throws an error if used outside a RoomServiceContext.Provider.
 */
export function useRoomService(): RoomService {
  const ctx = useContext(RoomServiceContext);
  if (!ctx) {
    throw new Error(
      "useRoomService must be used inside a <RoomServiceContext.Provider>",
    );
  }
  return ctx;
}
