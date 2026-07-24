import { useEffect, useRef } from 'react'

/**
 * Animated SVG risk gauge (0-100 score)
 */
export default function RiskMeter({ score = 0, level = 'LOW', size = 200 }) {
  const needleRef = useRef(null)

  const color = level === 'HIGH' ? '#EF4444' : level === 'MEDIUM' ? '#F59E0B' : '#10B981'
  const r = size * 0.38
  const cx = size / 2
  const cy = size / 2 + size * 0.05
  const strokeWidth = size * 0.07

  // Arc helper
  const polarToXY = (angle, radius) => {
    const rad = ((angle - 180) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  const arcPath = (startAngle, endAngle, radius) => {
    const start = polarToXY(startAngle, radius)
    const end = polarToXY(endAngle, radius)
    const large = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`
  }

  // Score → angle (0° = left, 180° = right, score 0-100 maps 0-180°)
  const needleAngle = (score / 100) * 180
  const needleTip = polarToXY(needleAngle, r * 0.85)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Background arc */}
        <path
          d={arcPath(0, 180, r)}
          fill="none"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Low zone (0–35) */}
        <path
          d={arcPath(0, 63, r)}
          fill="none"
          stroke="#10B981"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Medium zone (35–65) */}
        <path
          d={arcPath(63, 117, r)}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={strokeWidth}
          opacity="0.7"
        />
        {/* High zone (65–100) */}
        <path
          d={arcPath(117, 180, r)}
          fill="none"
          stroke="#EF4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Needle */}
        <line
          ref={needleRef}
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={color}
          strokeWidth={size * 0.025}
          strokeLinecap="round"
          style={{ transition: 'all 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        />
        {/* Centre dot */}
        <circle cx={cx} cy={cy} r={size * 0.04} fill={color} />

        {/* Score text */}
        <text x={cx} y={cy - r * 0.25} textAnchor="middle" fill="white" fontSize={size * 0.18} fontWeight="800" fontFamily="Inter">
          {score}
        </text>
        <text x={cx} y={cy - r * 0.04} textAnchor="middle" fill="#94A3B8" fontSize={size * 0.07} fontFamily="Inter">
          RISK SCORE
        </text>

        {/* Labels */}
        <text x={size * 0.08} y={cy + size * 0.1} fill="#10B981" fontSize={size * 0.065} fontFamily="Inter" fontWeight="600">LOW</text>
        <text x={cx - size * 0.09} y={size * 0.12} fill="#F59E0B" fontSize={size * 0.065} fontFamily="Inter" fontWeight="600">MED</text>
        <text x={size * 0.78} y={cy + size * 0.1} fill="#EF4444" fontSize={size * 0.065} fontFamily="Inter" fontWeight="600">HIGH</text>
      </svg>

      {/* Risk level badge */}
      <div
        className="px-6 py-2 rounded-full text-sm font-bold tracking-wider border"
        style={{ color, borderColor: color, background: `${color}15` }}
      >
        {level} RISK
      </div>
    </div>
  )
}
