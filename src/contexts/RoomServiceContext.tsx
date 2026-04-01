import { createContext, useContext } from "react";
import type { RoomService } from "../services/RoomService";

/**
 * Context permettant aux composants enfants (RoomCreator, RoomJoiner)
 * d'accéder au ChatManager sans passer par les props.
 *
 * Usage dans un composant enfant :
 *   const chatManager = useChatManager();
 */
export const RoomServiceContext = createContext<RoomService | null>(null);

/**
 * Hook utilitaire pour consommer le RoomServiceContext.
 * Lance une erreur si utilisé hors d'un RoomServiceContext.Provider.
 */
export function useRoomService(): RoomService {
  const ctx = useContext(RoomServiceContext);
  if (!ctx) {
    throw new Error(
      "useRoomService doit être utilisé à l'intérieur d'un <RoomServiceContext.Provider>",
    );
  }
  return ctx;
}
