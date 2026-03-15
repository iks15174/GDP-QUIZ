import React from 'react';

interface Props {
  code: string;
  nameKo: string;
  nameEn: string;
  flagEmoji: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  result?: 'correct' | 'wrong' | null;
}

export function CountryCard({ nameKo, nameEn, flagEmoji, onPress, selected, disabled, result }: Props) {
  const borderColor =
    result === 'correct' ? '#059669' :
    result === 'wrong'   ? '#E5E7EB' :
    selected             ? '#2563EB' : '#E5E7EB';

  const bgColor =
    result === 'correct' ? '#F0FDF4' :
    result === 'wrong'   ? '#F9FAFB' :
    selected             ? '#EEF2FF' : '#FFFFFF';

  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        flex: 1,
        border: `1.5px solid ${borderColor}`,
        borderRadius: 20,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        minHeight: 156,
        justifyContent: 'center',
        backgroundColor: bgColor,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color 0.2s, background-color 0.2s',
      }}
    >
      <span style={{ fontSize: 44 }}>{flagEmoji}</span>
      <span style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>{nameKo}</span>
      <span style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>{nameEn}</span>
      {result === 'correct' && (
        <span style={{
          marginTop: 6,
          backgroundColor: '#DCFCE7',
          padding: '3px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 700,
          color: '#059669',
        }}>정답</span>
      )}
      {result === 'wrong' && (
        <span style={{
          marginTop: 6,
          backgroundColor: '#F1F5F9',
          padding: '3px 10px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          color: '#94A3B8',
        }}>오답</span>
      )}
    </button>
  );
}
