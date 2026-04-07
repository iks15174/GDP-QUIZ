import React from 'react';

interface Props {
  streak: number;
}

export function StreakBar({ streak }: Props) {
  const remaining = Math.max(0, 3 - streak);

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4, paddingBottom: 4 }}>
      <span style={{ fontSize: 13, color: '#D97706', fontWeight: 600 }}>
        {remaining > 0 ? `앞으로 ${remaining}문제 맞추면 1원` : '1원 적립!'}
      </span>
    </div>
  );
}
