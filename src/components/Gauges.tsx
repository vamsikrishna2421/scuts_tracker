import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { C, interestColor, stageMeta } from '../theme';
import type { PipelineStage } from '../types';

export function InterestRing({ score, size = 64, stroke = 7 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = interestColor(score);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.3, fontWeight: '800', color: C.text }}>{score}</Text>
        <Text style={{ fontSize: size * 0.13, color: C.textDim, marginTop: -2 }}>interest</Text>
      </View>
    </View>
  );
}

export function InterestBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: C.border, overflow: 'hidden' }}>
      <View style={{ height: 6, width: `${pct}%`, backgroundColor: interestColor(score), borderRadius: 3 }} />
    </View>
  );
}

export function Sparkline({ values, width, height = 120 }: { values: number[]; width: number; height?: number }) {
  if (values.length < 2 || width <= 0) return null;
  const pad = 10;
  const xs = (i: number) => pad + (i / (values.length - 1)) * (width - 2 * pad);
  const ys = (v: number) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (height - 2 * pad);
  const pts = values.map((v, i) => `${xs(i)},${ys(v)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline points={pts} fill="none" stroke={C.indigo} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <Circle key={i} cx={xs(i)} cy={ys(v)} r={3.5} fill={interestColor(v)} />
      ))}
    </Svg>
  );
}

export function PipelineStrip({ counts }: { counts: { stage: PipelineStage; count: number }[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {counts.map((c) => {
        const m = stageMeta(c.stage);
        return (
          <View key={c.stage} style={{ flex: 1, backgroundColor: m.color + '1A', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: m.color }}>{c.count}</Text>
            <Text numberOfLines={1} style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{m.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
