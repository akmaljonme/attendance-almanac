<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Multi-tenant: every center-owned table has `center_id`; access is enforced by RLS via `is_member()` / `has_center_role()` — UI permission checks in `src/lib/center.tsx` are cosmetic only.
- Money is stored as integer UZS (`bigint`); never use floats for amounts.
- Debt is derived, not stored: `v_tuition_obligations` (monthly per enrollment, optional first-month proration) minus non-voided payments minus adjustments = `v_student_balances.balance`. Keep all balance logic there.
- Payments are never deleted or edited; corrections are voids with a reason or `financial_adjustments`. Audit triggers log finance/attendance changes.
- Signed-in app lives under `src/routes/_authenticated/app.*`; the `app.tsx` layout loads the user's center membership and redirects to `/onboarding` when none exists.
- Creator operations live in authenticated server functions, authorize through `public.user_roles`, and only then dynamically load the privileged client; center roles do not grant global access.
- Admin-issued usernames map deterministically to synthetic auth emails; `account_access` protects usernames and blocked state outside editable profiles.
- Login verifies Turnstile server-side before password auth; missing CAPTCHA configuration fails closed. Auth signup trigger allows only admin-provisioned accounts.
- `/onboarding` is an access-pending screen, not self-service center creation; creator provisioning is transactional through a service-only RPC.
