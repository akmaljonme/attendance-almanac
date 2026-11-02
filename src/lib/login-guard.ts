export type LoginGuard = { protected: boolean; token?: string; locked_until?: string | null; busy?: boolean };

export function assertLoginAllowed(guard: LoginGuard) {
  if (guard.locked_until) throw new Error("Ketma-ket xato urinishlar sabab kirish 15 daqiqaga cheklangan. Keyinroq qayta urinib ko'ring.");
  if (guard.busy) throw new Error("Kirish tekshirilmoqda. Birozdan keyin qayta urinib ko'ring.");
  if (guard.protected && !guard.token) throw new Error("Kirish himoyasi mavjud emas. Keyinroq qayta urinib ko'ring.");
}