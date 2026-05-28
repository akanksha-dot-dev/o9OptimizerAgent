import React, { useMemo } from 'react';

/**
 * RadarChart — A reusable SVG radar/spider chart.
 *
 * @param {Array<{label: string, value: number}>} data  – values 0-100
 * @param {number} [size=280]  – rendered max width/height
 * @param {string} [color='#3b82f6'] – accent colour for the data polygon
 */
export default function RadarChart({ data = [], size = 280, color = '#3b82f6' }) {
  const sides = data.length;
  const cx = 50;
  const cy = 50;
  const maxR = 36; // max radius in viewBox units (leaves room for labels)

  // Pre-compute angle offsets (start from top, i.e. -90°)
  const angles = useMemo(
    () =>
      Array.from({ length: sides }, (_, i) => {
        const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
        return { cos: Math.cos(angle), sin: Math.sin(angle) };
      }),
    [sides],
  );

  /** Return SVG coordinate at `r` distance along axis `i`. */
  const pt = (i, r) => ({
    x: cx + angles[i].cos * r,
    y: cy + angles[i].sin * r,
  });

  /** Build a polygon-points string for a ring at `fraction` of maxR. */
  const ringPoints = (fraction) =>
    angles
      .map((_, i) => {
        const { x, y } = pt(i, maxR * fraction);
        return `${x},${y}`;
      })
      .join(' ');

  /** Build the data polygon points string. */
  const dataPoints = useMemo(
    () =>
      data
        .map((d, i) => {
          const r = (Math.min(Math.max(d.value, 0), 100) / 100) * maxR;
          const { x, y } = pt(i, r);
          return `${x},${y}`;
        })
        .join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, angles],
  );

  /** Unique id so multiple charts on one page don't clash gradients. */
  const gradientId = useMemo(
    () => `radar-grad-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  if (sides < 3) return null;

  const ringFractions = [0.33, 0.66, 1];
  const labelOffset = 7; // extra radius for label placement

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        style={{ width: '100%', maxWidth: size, height: 'auto', overflow: 'visible' }}
        role="img"
        aria-label="Radar chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* ---------- Concentric grid rings (33%, 66%, 100%) ---------- */}
        {ringFractions.map((f) => (
          <polygon
            key={f}
            points={ringPoints(f)}
            fill="none"
            stroke="var(--border-subtle, #e2e6ef)"
            strokeWidth={f === 1 ? '0.4' : '0.25'}
            strokeDasharray={f === 1 ? 'none' : '1,1'}
            opacity="0.7"
          />
        ))}

        {/* ---------- Axis lines from center to each vertex ---------- */}
        {angles.map((_, i) => {
          const { x, y } = pt(i, maxR);
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--border-subtle, #e2e6ef)"
              strokeWidth="0.2"
              opacity="0.55"
            />
          );
        })}

        {/* ---------- Data polygon (gradient fill + stroke) ---------- */}
        <polygon
          points={dataPoints}
          fill={`url(#${gradientId})`}
          stroke={color}
          strokeWidth="0.55"
          strokeLinejoin="round"
        />

        {/* ---------- Data dots at each vertex ---------- */}
        {data.map((d, i) => {
          const r = (Math.min(Math.max(d.value, 0), 100) / 100) * maxR;
          const { x, y } = pt(i, r);
          return (
            <circle
              key={`dot-${i}`}
              cx={x}
              cy={y}
              r="1.1"
              fill={color}
              stroke="var(--bg-card, #fff)"
              strokeWidth="0.4"
            />
          );
        })}

        {/* ---------- Axis labels ---------- */}
        {data.map((d, i) => {
          const { x, y } = pt(i, maxR + labelOffset);

          // text-anchor based on horizontal position
          let anchor = 'middle';
          if (x < cx - 1) anchor = 'end';
          else if (x > cx + 1) anchor = 'start';

          // vertical nudge for top/bottom labels
          let dy = '0.35em';
          if (y < cy - maxR) dy = '-0.15em';
          else if (y > cy + maxR) dy = '0.85em';

          const displayLabel =
            d.label.length > 14 ? d.label.substring(0, 13) + '…' : d.label;

          return (
            <g key={`label-${i}`}>
              <text
                x={x}
                y={y - 1.2}
                textAnchor={anchor}
                dominantBaseline="central"
                dy={dy}
                fill="var(--text-secondary, #475569)"
                fontSize="3"
                fontWeight="600"
                fontFamily="var(--font-sans, system-ui)"
              >
                {displayLabel}
              </text>
              <text
                x={x}
                y={y + 2.8}
                textAnchor={anchor}
                dominantBaseline="central"
                dy={dy}
                fill={color}
                fontSize="2.8"
                fontWeight="700"
                fontFamily="var(--font-mono, monospace)"
              >
                {Math.round(d.value)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
