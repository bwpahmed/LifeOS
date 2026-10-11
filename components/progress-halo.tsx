import "./progress-halo.css";

type Props = {
  value: number;
  label?: string;
  caption?: string;
  compact?: boolean;
};

export function ProgressHalo({value, label="PROGRESS", caption="Keep showing up", compact=false}:Props) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value)?Math.round(value):0));
  const rings = [
    {radius:76, count:17, size:4.2},
    {radius:95, count:22, size:4.0},
    {radius:113, count:27, size:3.8},
  ];
  return (
    <div className={"lifeos-halo"+(compact?" lifeos-halo-compact":"")} role="img" aria-label={label+": "+pct+" percent"}>
      <svg className="lifeos-halo-art" viewBox="0 0 300 180" aria-hidden="true">
        {rings.flatMap(({radius,count,size},ring)=>{
          return Array.from({length:count},(_,i)=>{
            const angle=Math.PI-(Math.PI*i/(count-1));
            const x=150+radius*Math.cos(angle);
            const y=139-radius*Math.sin(angle);
            const active=(i/(count-1))*100<=pct;
            return <circle key={ring+"-"+i} cx={x} cy={y} r={size}
              fill={active?(ring===2?"#16b887":"#21bd8e"):(ring===2?"#f2a6ba":"#f1d3dc")}
            />;
          });
        })}
      </svg>
      <div className="lifeos-halo-value">
        <strong>{pct}<span>%</span></strong>
        <span>{label}</span>
      </div>
      <p>{caption}</p>
    </div>
  );
}
