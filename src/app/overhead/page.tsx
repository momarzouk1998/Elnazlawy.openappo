"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/store/user-store"
import { useApi } from "@/hooks/useApi"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PageHeader from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBox, FilterBar } from "@/components/SearchFilter"
import { Button } from "@/components/ui/Button"
import { exportToExcel } from "@/lib/excel"
import { formatCurrency, formatDate } from "@/lib/format"
import RowEditor, { type FieldDef } from "@/components/ui/RowEditor"

const overheadFields: FieldDef[] = [
  { name: "date", label: "التاريخ", type: "date", required: true },
  { name: "description", label: "البيان", required: true },
  { name: "amount", label: "المبلغ", type: "number", required: true },
  { name: "notes", label: "ملاحظات", rows: 2 },
]

export default function OverheadPage() {
  const router = useRouter()
  const { user: profile } = useUserStore()
  const { data, loading } = useApi<{ expenses: any[]; items?: any[] }>("/api/overhead?limit=500")
  const rows: any[] = data?.expenses ?? data?.items ?? []
  const [search, setSearch] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const filtered = useMemo(() => rows.filter((r) =>
    (!search || (r.description ?? "").toLowerCase().includes(search.toLowerCase())) &&
    (!fromDate || String(r.date) >= fromDate) &&
    (!toDate || String(r.date) <= toDate)
  ), [rows, search, fromDate, toDate])

  const total = filtered.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekTotal = filtered.filter((r) => new Date(r.date) >= weekAgo).reduce((s, r) => s + Number(r.amount ?? 0), 0)

  if (!profile) return null

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="النثريات" subtitle="مصاريف تشغيل المصنع العامة" helpTitle="النثريات" helpDescription="كهرباء، أجور عمال، شحن، إلخ." backHref="/journal" actions={<Button onClick={() => router.push("/overhead/new")}>+ نثريات جديدة</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="card bg-gradient-to-br from-brand-orange to-brand-orange-dark text-white"><div className="text-xs opacity-90">إجمالي النثريات</div><div className="text-2xl font-extrabold">{formatCurrency(total)}</div></div>
        <div className="card bg-white border-r-4 border-brand-orange"><div className="text-xs text-gray-500">آخر 7 أيام</div><div className="text-2xl font-extrabold text-brand-black">{formatCurrency(weekTotal)}</div></div>
        <div className="card bg-white border-r-4 border-brand-orange"><div className="text-xs text-gray-500">عدد السجلات</div><div className="text-2xl font-bold text-brand-black">{filtered.length}</div></div>
      </div>
      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1"><SearchBox value={search} onChange={setSearch} placeholder="ابحث في البيان..." /></div>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-3 py-2.5 border rounded-lg" />
          <Button variant="secondary" onClick={() => exportToExcel(filtered as any, "overhead")}>تصدير</Button>
        </FilterBar>
      </div>
      <DataTable
        loading={loading}
        rows={filtered}
        emptyMessage="لا توجد نثريات"
        columns={[
          { key: "date", label: "التاريخ", render: (r) => formatDate(r.date) },
          { key: "category", label: "التصنيف", render: (r) => r.category ? <span className="badge bg-purple-100 text-purple-700 border-purple-300">{r.category}</span> : "-" },
          { key: "description", label: "البيان" },
          { key: "worker", label: "العامل", render: (r) => r.worker?.name || "-" },
          { key: "amount", label: "المبلغ", render: (r) => <span className="font-bold text-red-600">{formatCurrency(Number(r.amount ?? 0))}</span> },
          { key: "notes", label: "ملاحظات" },
          { key: "_actions", label: "إجراءات", render: (r) => <RowEditor row={r} apiBase="/api/overhead" fields={overheadFields} entityLabel="النثريات" deleteHint="لا يمكن حذف هذه الحركة لأنها مرتبطة بحركة يومية" /> },
        ]}
      />
    </DashboardLayout>
  )
}

