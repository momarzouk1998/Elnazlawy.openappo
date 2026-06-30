import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import prisma from "@/lib/db/prisma"
import { auditLog } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    const offset = (page - 1) * limit

    const where: any = { deleted_at: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.suppliers.findMany({ where, orderBy: { created_at: "desc" }, skip: offset, take: limit }),
      prisma.suppliers.count({ where }),
    ])

    return NextResponse.json({ ok: true, data: { items, total, page, limit } })
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "غير مسجل الدخول" } }, { status: e.status })
    console.error("Suppliers list error:", e)
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: e?.message || "حدث خطأ" } }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, payment_type, phone, notes } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "اسم المورد مطلوب" } }, { status: 400 })
    }

    // accept any Arabic or English payment type
    const pt = payment_type || "نقدي"

    const item = await prisma.suppliers.create({
      data: { name: name.trim(), payment_type: pt, phone: phone || null, notes: notes || null },
    })

    auditLog({ user_id: user.id, action: "create", table_name: "suppliers", row_id: item.id, after: item })

    return NextResponse.json({ ok: true, data: item }, { status: 201 })
  } catch (e: any) {
    if (e.status) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "غير مسجل الدخول" } }, { status: e.status })
    console.error("Supplier create error:", e)
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: e?.message || "حدث خطأ" } }, { status: 500 })
  }
}

