import React from 'react';

interface Props {
  remaining: number;
  total: number;
}

export function Timer({ remaining, total }: Props) {
  const ratio = remaining / total;
  const isUrgent = remaining <= 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: '100%', height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${ratio * 100}%`,
            backgroundColor: isUrgent ? '#DC2626' : '#2563EB',
            borderRadius: 2,
            transition: 'width 1s linear, background-color 0.3s',
          }}
        />
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, color: isUrgent ? '#DC2626' : '#2563EB', letterSpacing: -0.5 }}>
        {remaining}
      </span>
    </div>
  );
}
