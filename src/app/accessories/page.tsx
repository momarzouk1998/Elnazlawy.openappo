"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserStore } from "@/store/user-store"
import { useApi } from "@/hooks/useApi"
import DashboardLayout from "@/components/layout/DashboardLayout"
import PageHeader from "@/components/PageHeader"
import { DataTable } from "@/components/DataTable"
import { SearchBox, FilterBar } from "@/components/SearchFilter"
import { Button } from "@/components/ui/Button"
import { exportToExcel, importFromExcel } from "@/lib/excel"
import { formatCurrency } from "@/lib/format"
import RowEditor, { type FieldDef } from "@/components/ui/RowEditor"

const accessoryFields: FieldDef[] = [
  { name: "item_name", label: "اسم الصنف", required: true },
  { name: "code", label: "الكود", required: true },
  { name: "type", label: "النوع" },
  { name: "unit_price", label: "سعر الوحدة", type: "number" },
  { name: "quantity_in", label: "الكمية المبدئية", type: "number" },
  { name: "notes", label: "ملاحظات", rows: 2 },
]

export default function AccessoriesPage() {
  const router = useRouter()
  const { user: profile } = useUserStore()
  const { data, loading } = useApi<{ items: any[] }>("/api/accessories?limit=500")
  const { data: suppliersData } = useApi<{ items: any[] }>("/api/suppliers?limit=500")
  const rows = data?.items ?? []
  const suppliers = suppliersData?.items ?? []
  const [search, setSearch] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [availableOnly, setAvailableOnly] = useState(false)
  const [importing, setImporting] = useState(false)

  const types = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r: any) => { if (r.type) set.add(r.type) })
    return Array.from(set).sort()
  }, [rows])

  const filtered = useMemo(() => rows.filter((a: any) => {
    const matchSearch = !search || a.item_name.toLowerCase().includes(search.toLowerCase()) || (a.code ?? "").toLowerCase().includes(search.toLowerCase())
    const matchSup = !supplierFilter || String(a.supplier_id) === supplierFilter
    const matchType = !typeFilter || a.type === typeFilter
    const matchAvail = !availableOnly || a.quantity_remaining > 0
    return matchSearch && matchSup && matchType && matchAvail
  }), [rows, search, supplierFilter, typeFilter, availableOnly])

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setImporting(true)
    try {
      const excelData = await importFromExcel<any>(file)
      let ok = 0, fail = 0
      for (const r of excelData) {
        const supplierName = String(r["الشركة"] || r["المورد"] || "").trim()
        const supplier = suppliers.find((s: any) => s.name === supplierName)
        const payload = {
          item_name: String(r["البيان"] || r["item_name"] || "").trim(),
          code: String(r["الكود"] || r["code"] || "").trim(),
          type: String(r["النوع"] || r["type"] || "").trim(),
          supplier_id: supplier?.id ?? null,
          unit_price: Number(r["السعر"] || r["unit_price"] || 0),
          quantity_in: Number(r["العدد"] || r["quantity_in"] || 0),
          notes: String(r["ملاحظات"] || r["notes"] || "").trim() || null,
        }
        if (!payload.item_name || !payload.code) { fail++; continue }
        const res = await fetch("/api/accessories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        if (res.ok) ok++; else fail++
      }
      alert("تم استيراد " + ok + " بنجاح" + (fail ? "، فشل " + fail : ""))
      location.reload()
    } finally { setImporting(false); e.target.value = "" }
  }

  if (!profile) return null

  return (
    <DashboardLayout profile={profile}>
      <PageHeader title="مخزون الاكسسوارات" subtitle={rows.length + " صنف إجمالي"} helpTitle="مخزون الاكسسوارات" helpDescription="إدارة مفصلات، سكك درج، مجاري، كاوتش، إلخ. نفس فكرة الألواح: ابحث أولاً، لو الصنف موجود زود الكمية، لو مش موجود أنشئ صنف جديد. الكود فريد لكل مورد." backHref="/dashboard" actions={<>
        <label className="btn-secondary cursor-pointer">{importing ? "جاري..." : "📤 استيراد Excel"}<input type="file" accept=".xlsx,.xls" hidden onChange={handleImport} /></label>
        <Button variant="secondary" onClick={() => exportToExcel(filtered.map(({ id, supplier_name, total_price, ...rest }: any) => rest as any), "accessories_inventory")}>تصدير</Button>
        <Button onClick={() => router.push("/accessories/buy")}>🛒 شراء</Button>
        <Button variant="secondary" onClick={() => router.push("/accessories/new")}>+ اكسسوار جديد</Button>
      </>} />
      {/* إجمالي المخزون */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            <div className="text-xs opacity-90">عدد الأصناف المتبقية</div>
            <div className="text-2xl font-extrabold">{rows.filter((a: any) => a.quantity_remaining > 0).length}</div>
          </div>
          <div className="card bg-gradient-to-br from-blue-500 to-blue-700 text-white">
            <div className="text-xs opacity-90">إجمالي الكمية المتبقية</div>
            <div className="text-2xl font-extrabold">{rows.reduce((s: number, a: any) => s + Number(a.quantity_remaining || 0), 0)}</div>
          </div>
          <div className="col-span-2 md:col-span-1 card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <div className="text-xs opacity-90">قيمة المخزون الحالي</div>
            <div className="text-2xl font-extrabold">{formatCurrency(rows.reduce((s: number, a: any) => s + (Number(a.unit_price || 0) * Number(a.quantity_remaining || 0)), 0))}</div>
          </div>
        </div>
      )}
      <div className="card mb-4">
        <FilterBar>
          <div className="flex-1 min-w-[200px]"><SearchBox value={search} onChange={setSearch} placeholder="ابحث بالاسم أو الكود..." /></div>
          <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white"><option value="">كل الموردين</option>{suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white"><option value="">كل الأنواع</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="accent-brand-orange" />المتوفر فقط</label>
          <div className="text-sm text-gray-500 mr-auto">النتائج: <strong>{filtered.length}</strong></div>
        </FilterBar>
      </div>
      <DataTable loading={loading} rows={filtered} emptyMessage="لا توجد اكسسوارات." columns={[
        { key: "item_name", label: "البيان", render: (r: any) => <Link href={"/accessories/" + r.id} className="text-brand-orange hover:underline font-medium">{r.item_name}</Link> },
        { key: "code", label: "الكود", render: (r: any) => <code className="text-xs bg-gray-100 px-2 py-1 rounded">{r.code}</code> },
        { key: "type", label: "النوع" },
        { key: "supplier_name", label: "المورد" },
        { key: "unit_price", label: "السعر", render: (r: any) => formatCurrency(Number(r.unit_price ?? 0)) },
        { key: "quantity_in", label: "الداخل" },
        { key: "quantity_used", label: "المستخدم" },
        { key: "quantity_remaining", label: "المتبقي", render: (r: any) => <span className={r.quantity_remaining > 0 ? "font-bold text-green-600" : "text-gray-400"}>{r.quantity_remaining}</span> },
        { key: "total_price", label: "الإجمالي", render: (r: any) => <span className="font-bold">{formatCurrency(Number(r.total_price ?? 0))}</span> },
        { key: "_actions", label: "إجراءات", render: (r: any) => <RowEditor row={r} apiBase="/api/accessories" fields={accessoryFields} entityLabel="الاكسسوار" deleteHint="لا يمكن حذف هذا الصنف لأنه مُستخدم في أوردرات أو مُسجّل في اليومية" extraButtons={<Link href={"/accessories/buy"} onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-green-100 rounded text-base" title="شراء كمية">🛒</Link>} /> },
      ]} />
    </DashboardLayout>
  )
}

