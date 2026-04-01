import "../../styles/components/Chat/ChatterLoading.css";

export default function ChatterLoading() {
  return (
    <div className="chatter-loading">
      <div className="chatter-spinner" />
      <p>Connexion au salon en cours...</p>
    </div>
  );
}
