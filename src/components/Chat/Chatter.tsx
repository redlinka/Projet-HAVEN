import ChatterLoading from "./ChatterLoading";
import ChatterLobby from "./ChatterLobby";
import ChatterRoom from "./ChatterRoom";

import { useRoom } from "../../contexts/RoomContext";

export default function Chatter({ initialRoomId }: { initialRoomId?: string }) {
  const { state } = useRoom();

  if (state === "connecting") return <ChatterLoading />;

  if (state === "idle") return <ChatterLobby initialRoomId={initialRoomId} />;

  return <ChatterRoom />;
}
