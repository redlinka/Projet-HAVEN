import { useState, type SyntheticEvent } from "react";
import { Send } from "lucide-react";
import "../../styles/components/Chat/ChatSender.css";

export default function ChatSender(props: {
  onMessageEntered: (messageSend: string) => void;
}) {
  const [messageInput, setMessageInput] = useState("");

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();
    props.onMessageEntered(messageInput);
    setMessageInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="sender-form">
      <input
        type="text"
        placeholder="Message"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
      />
      <button type="submit">
        <Send size={20} />
      </button>
    </form>
  );
}
