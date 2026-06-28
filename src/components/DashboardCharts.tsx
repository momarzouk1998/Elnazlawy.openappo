"use client";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface WeeklyDatum { day: string; income: number; expense: number; net: number; }
interface StatusDatum { name: string; value: number; }

const PIE_COLORS = ["#F2994A", "#3B82F6", "#10B981", "#6B7280"];

export function WeeklyBarChart({ data }: { data: WeeklyDatum[] }) {
  return (
    <div className="w-full h-full" style={{ minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={200}>
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
  );
}

export function StatusPieChart({ data }: { data: StatusDatum[] }) {
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-400">لا توجد أوردرات</div>;
  return (
    <div className="w-full h-full" style={{ minHeight: 200 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e: any) => `${e.name}: ${e.value}`}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
