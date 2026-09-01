export function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="section-header">
      <span className="section-num">{num}</span>
      <h2 className="section-title">{title}</h2>
      <div className="section-line" />
    </div>
  );
}
