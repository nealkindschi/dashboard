export default function PanelFallback() {
  return (
    <div className="panel">
      <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 200 }} />
    </div>
  );
}
