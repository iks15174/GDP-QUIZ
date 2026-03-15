import React from 'react';

interface Props {
  streak: number;
}

export function StreakBar({ streak }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 4, paddingBottom: 4 }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i <= streak ? '#2563EB' : '#E5E7EB',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>3연속 정답 시 1원 적립</span>
    </div>
  );
}
