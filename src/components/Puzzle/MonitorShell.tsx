import "../../styles/components/Puzzle/MonitorShell.css";

export default function MonitorShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="monitor-shell">
      <div className="monitor-frame">
        <div className="monitor-crt">
          <div className="monitor-overlay" />
          <div className="monitor-content">{children}</div>
        </div>
      </div>
    </div>
  );
}
