'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  week: string;
  premium: number;
  payouts: number;
}

export function FinancialChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis
          dataKey="week"
          tick={{ fontSize: 12 }}
          tickFormatter={(v: string) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${v}`} />
        <Tooltip
          formatter={(value) => `₹${Number(value).toLocaleString()}`}
          labelFormatter={(label) => `Week of ${String(label)}`}
        />
        <Legend />
        <Bar dataKey="premium" fill="#8B5CF6" name="Premium" />
        <Bar dataKey="payouts" fill="#3B82F6" name="Payouts" />
      </BarChart>
    </ResponsiveContainer>
  );
}
