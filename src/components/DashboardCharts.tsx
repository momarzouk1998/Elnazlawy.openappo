"use client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface WeeklyDatum { day: string; income: number; expense: number; net: number; }

export function WeeklyBarChart({ data }: { data: WeeklyDatum[] }) {
  return (
    <div style={{ width: "100%", height: 288, minHeight: 200 }}>
      <ResponsiveContainer width="100%" height={288}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="income" name="الوارد" fill="#10B981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expense" name="المصروف" fill="#F2994A" radius={[6, 6, 0, 0]} />
          <Bar dataKey="net" name="الصافي" fill="#3B82F6" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

