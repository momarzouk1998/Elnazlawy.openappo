import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import prisma from "@/lib/db/prisma"
import { auditLog } from "@/lib/audit"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "500")
    const category = searchParams.get("category") || ""
    const where: any = {}
    if (category) where.category = category
    const offset = (page - 1) * limit
    const [items, total] = await Promise.all([
      prisma.material_types.findMany({ where, orderBy: [{ sort_order: "asc" }, { name: "asc" }], skip: offset, take: limit }),
      prisma.material_types.count({ where }),
    ])
    return NextResponse.json({ ok: true, data: { items, total, page, limit } })
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "غير مسجل الدخول" } }, { status: 401 })
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "غير مصرح" } }, { status: 403 })
    console.error("Error:", e)
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: e?.message || "حدث خطأ" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const name = (body.name || body.value || "").trim()
    const category = body.category || "board"

    if (!name) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "اسم المادة مطلوب" } }, { status: 400 })
    }
    if (!["board", "accessory"].includes(category)) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "التصنيف يجب أن يكون board أو accessory" } }, { status: 400 })
    }

    const existing = await prisma.material_types.findFirst({ where: { name }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ ok: true, data: await prisma.material_types.findUnique({ where: { id: existing.id } }) }, { status: 200 })
    }

    const sort_order = body.sort_order ?? 99
    const materialType = await prisma.material_types.create({ data: { name, category, sort_order } })
    auditLog({ user_id: admin.id, action: "create", table_name: "material_types", row_id: materialType.id, after: materialType })
    return NextResponse.json({ ok: true, data: materialType }, { status: 201 })
  } catch (e: any) {
    if (e.status === 401) return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "غير مسجل الدخول" } }, { status: 401 })
    if (e.status === 403) return NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "غير مصرح" } }, { status: 403 })
    console.error("Error:", e)
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: e?.message || "حدث خطأ" } }, { status: 500 })
  }
}

