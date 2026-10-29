# Markazly

O'quv markazlari uchun boshqaruv tizimi: o'quvchilar, guruhlar, davomat, to'lovlar va qarzdorlik hisobi bitta joyda.

**Demo:** https://attendance-almanac.lovable.app

## Imkoniyatlar

- O'quvchilar, o'qituvchilar, kurslar va guruhlarni boshqarish
- Dars jadvali va davomatni belgilash
- To'lovlar, chegirmalar va avtomatik qarzdorlik hisobi
- Xarajatlar va moliyaviy hisobotlar (CSV eksport)
- Rollar: egasi, administrator, o'qituvchi, qabulxona
- Har bir markaz ma'lumotlari alohida (multi-tenant)

## Texnologiyalar

- [TanStack Start](https://tanstack.com/start) + React 19 + TypeScript
- Tailwind CSS 4, Radix UI
- Supabase (Postgres, Auth, RLS)
- Drizzle ORM, Vitest

## Ishga tushirish

[Bun](https://bun.sh) kerak.

```sh
bun install
bun run dev
```

Muhit o'zgaruvchilari `.env` faylida saqlanadi (Supabase URL va publishable kalit).

## Skriptlar

| Buyruq           | Vazifasi                      |
| ---------------- | ----------------------------- |
| `bun run dev`    | Dev serverni ishga tushirish  |
| `bun run build`  | Production build              |
| `bun run lint`   | ESLint va Prettier tekshiruvi |
| `bun run test`   | Testlarni ishga tushirish     |
| `bun run format` | Kodni formatlash              |

## Arxitektura

- Har bir markazga tegishli jadvalda `center_id` bor; kirish huquqi RLS (`is_member()`, `has_center_role()`) orqali nazorat qilinadi.
- Pul summalari butun son (UZS, `bigint`) sifatida saqlanadi.
- Qarzdorlik saqlanmaydi, `v_tuition_obligations` va `v_student_balances` view'laridan hisoblanadi.
- To'lovlar o'chirilmaydi va tahrirlanmaydi: tuzatish bekor qilish (void) yoki `financial_adjustments` orqali bajariladi.
