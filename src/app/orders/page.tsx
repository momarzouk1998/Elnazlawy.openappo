"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserStore } from "@/store/user-store"
import { useApi } from "@/hooks/useApi"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PageHeader from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBox } from "@/components/SearchFilter"
import { Button } from "@/components/ui/Button"
import { exportToExcel } from "@/lib/excel"
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS, ORDER_TYPE_LABELS, daysBetween } from "@/lib/format"

interface Order {
  id: string; order_name: string; status: string; order_type: string
  customer_id: string | null; branch_id: string | null
  start_date: string | null; end_date: string | null; duration_days: number | null
  order_total: number | string | null; customer_name?: string; branch_name?: string
  notes?: string | null
}

export default function OrdersPage() {
  const router = useRouter()
  const { user: profile } = useUserStore()
  const { data, loading, refetch } = useApi<{ items: any[] }>("/api/orders?limit=500")
  const { data: branchesData } = useApi<{ items: any[] }>("/api/branches?limit=500")
  const rows: Order[] = data?.items ?? []
  const branches = branchesData?.items ?? []
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)
  const pageSize = 20

  const filtered = useMemo(() => {
    return rows.filter((o) => {
      const matchSearch = !search || o.order_name.toLowerCase().includes(search.toLowerCase()) || (o.customer_name ?? "").toLowerCase().includes(search.toLowerCase())
      const matchBranch = !branchFilter || String(o.branch_id) === branchFilter
      const matchStatus = !statusFilter || o.status === statusFilter
      const matchType = !typeFilter || o.order_type === typeFilter
      const matchDate = (!fromDate || (o.start_date && String(o.start_date) >= fromDate)) && (!toDate || (o.start_date && String(o.start_date) <= toDate))
      return matchSearch && matchBranch && matchStatus && matchType && matchDate
    })
  }, [rows, search, branchFilter, statusFilter, typeFilter, fromDate, toDate])

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const activeFiltersCount = [branchFilter, statusFilter, typeFilter, fromDate, toDate].filter(Boolean).length

  function clearFilters() {
    setBranchFilter("")
    setStatusFilter("")
    setTypeFilter("")
    setFromDate("")
    setToDate("")
  }

  async function deleteOrder(row: Order) {
    if (!window.confirm("هل تريد حذف الأوردر " + row.order_name + "؟ سيتم إرجاع المواد للمخزون.")) return
    const res = await fetch("/api/orders/" + row.id, { method: "DELETE" })
    if (res.ok) refetch()
    else { const json = await res.json().catch(() => ({})); window.alert("خطأ: " + (json?.error?.message || res.status)) }
  }

  if (!profile) return null

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="الأوردرات" subtitle={filtered.length + " أوردر مطابق للفلاتر"} helpTitle="الأوردرات" helpDescription="هنا كل أوردرات المصنع. ابحث بالاسم أو العميل، فلتر بالمعرض أو الحالة أو التاريخ." backHref="/dashboard" actions={<Button onClick={() => router.push("/orders/new")}>+ أوردر جديد</Button>} />
      <div className="card mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]"><SearchBox value={search} onChange={setSearch} placeholder="ابحث باسم الأوردر أو العميل..." /></div>
          <Button variant="secondary" onClick={() => setFilterOpen(true)} className="relative">تصفية{activeFiltersCount > 0 && <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFiltersCount}</span>}</Button>
          <Button variant="secondary" onClick={() => exportToExcel(filtered as any, "orders")}>تصدير</Button>
        </div>
      </div>

      {filterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFilterOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold">تصفية الأوردرات</h2><button onClick={() => setFilterOpen(false)} className="p-1 hover:bg-gray-100 rounded-lg">✕</button></div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">المعرض</label><select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="">كل المعارض</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="">كل الحالات</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">النوع</label><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="">كل الأنواع</option>{Object.entries(ORDER_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label><input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              {activeFiltersCount > 0 && <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">تم تطبيق {activeFiltersCount} فلتر (يمكن دمجهم معاً)</div>}
            </div>
            <div className="flex justify-between gap-2 pt-4 mt-4 border-t"><Button variant="secondary" onClick={clearFilters}>مسح الفلاتر</Button><Button onClick={() => setFilterOpen(false)}>تطبيق</Button></div>
          </div>
        </div>
      )}

      <DataTable loading={loading} rows={paged} emptyMessage="لا توجد أوردرات" columns={[
        { key: "order_name", label: "اسم الأوردر", render: (r) => <Link href={"/orders/" + r.id} className="font-semibold text-brand-orange hover:underline">{r.order_name}</Link> },
        { key: "type", label: "النوع", render: (r) => ORDER_TYPE_LABELS[r.order_type] || r.order_type },
        { key: "customer_name", label: "العميل" },
        { key: "branch_name", label: "المعرض" },
        { key: "status", label: "الحالة", render: (r) => <span className={"badge " + STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</span> },
        { key: "start_date", label: "البدء", render: (r) => formatDate(r.start_date) },
        { key: "duration", label: "المدة", render: (r) => { const computed = daysBetween(r.start_date, r.end_date); const days = r.duration_days ?? computed; return days != null ? days + " يوم" : "-" } },
        { key: "total", label: "الإجمالي", render: (r) => <span className="font-bold">{formatCurrency(Number(r.order_total ?? r.total ?? 0))}</span> },
        { key: "_actions", label: "إجراءات", render: (r) => <div className="flex items-center justify-center gap-1"><Link href={"/orders/" + r.id} className="p-1.5 hover:bg-blue-100 rounded text-base" title="عرض">👁️</Link><Link href={"/orders/" + r.id + "/edit"} className="p-1.5 hover:bg-blue-100 rounded text-base" title="تعديل">✏️</Link><Link href={"/orders/" + r.id + "/invoice"} className="p-1.5 hover:bg-blue-100 rounded text-base" title="طباعة فاتورة">🧾</Link>{profile?.role === "admin" && <button onClick={() => deleteOrder(r)} className="p-1.5 hover:bg-red-100 rounded text-base" title="حذف">🗑️</button>}</div> },
      ]} />

      {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-4"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>السابق</Button><span className="text-sm text-gray-600">صفحة {page} من {totalPages}</span><Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button></div>}
    </DashboardLayout>
  )
}

