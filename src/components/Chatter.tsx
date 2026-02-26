import ChatDisplayer from "./ChatDisplayer";
import ChatSender from "./ChatSender";
import listMessage from "../data/messages.json";
import "../styles/components/Chatter.css";

export default function Chatter() {
  return (
    <div className="chatter">
      <ChatDisplayer listMessage={listMessage} />
      <ChatSender onMessageEntered={() => {}} />
    </div>
  );
}
