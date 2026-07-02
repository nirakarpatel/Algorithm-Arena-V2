import React from 'react';

const PermissionLegend = ({ title = 'Access Guide', items = [], note }) => {
  if (!items.length && !note) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-secondary footer-page">{title}</h3>
        {note ? <p className="text-xs text-tertiary mt-1 footer-page">{note}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/[0.08] px-3 py-2.5">
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg ${item.iconClass || 'bg-white/5 text-secondary'}`}>
                <Icon size={16} />
              </div>
              <div>
                <p className="text-sm font-bold text-primary select-none">{item.label}</p>
                <p className="text-xs text-tertiary leading-relaxed footer-page">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionLegend;
