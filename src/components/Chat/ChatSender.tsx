import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import "../../styles/components/Chat/ChatSender.css";

interface ChatSenderProps {
  onMessageEntered: (message: string) => void;
}

export default function ChatSender({ onMessageEntered }: ChatSenderProps) {
  const [messageInput, setMessageInput] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (messageInput.trim()) {
      onMessageEntered(messageInput);
      setMessageInput("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sender-form">
      <input
        type="text"
        placeholder="Message"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        aria-label="Nouveau message"
      />
      <button
        type="submit"
        disabled={!messageInput.trim()}
        aria-label="Envoyer le message"
      >
        <Send size={20} />
      </button>
    </form>
  );
}
