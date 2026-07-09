# Mazaya Furniture Management System - PRD

## Overview
Mazaya is a furniture factory management system (مصنع مزايا للأثاث) located in Damietta, Egypt. It manages inventory, orders, financial journal, showrooms/branches, customers, suppliers, workers, contractors, and overhead expenses.

## Target Users
- Factory admin (full access)
- Branch managers (limited to their branch data)
- Workers

## Key Features
1. **Authentication**: Login with username/password, JWT-based sessions, remember me
2. **Dashboard**: Inventory value, open orders, completed orders, financial balance, recent journal
3. **Orders Management**: CRUD, search, filter, pagination, invoice printing, Excel export
4. **Customers Management**: CRUD, search, inline edit, Excel export
5. **Suppliers Management**: CRUD, search, payment types, Excel export
6. **Branches (Showrooms)**: CRUD, search, Excel export
7. **Workers Management**: CRUD, expense tracking, Excel export
8. **Contractors Management**: CRUD, search, Excel export
9. **Accessories Inventory**: CRUD, purchase from suppliers, Excel export
10. **Boards Inventory**: CRUD, purchase from suppliers, Excel export
11. **Financial Journal**: Entries list, filters, summary report
12. **Overhead Expenses**: CRUD, date filtering, Excel export
13. **Reports**: Inventory, orders, cashflow, suppliers, overhead, workers reports
14. **User Profile**: View profile, change password
15. **Admin Panel**: User management, material types management

## Tech Stack
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS 4
- State: Zustand
- Backend: Next.js API routes, Prisma ORM
- Database: PostgreSQL
- Auth: JWT (jose), bcryptjs
- Charts: recharts
- Export: xlsx

## Language
Arabic (RTL) interface
