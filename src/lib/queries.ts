import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function run<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export const coursesQ = (c: string) =>
  queryOptions({ queryKey: ["courses", c], queryFn: () => run(supabase.from("courses").select("*").eq("center_id", c).order("name")) });

export const teachersQ = (c: string) =>
  queryOptions({ queryKey: ["teachers", c], queryFn: () => run(supabase.from("teachers").select("*").eq("center_id", c).order("full_name")) });

export const groupsQ = (c: string) =>
  queryOptions({
    queryKey: ["groups", c],
    queryFn: () =>
      run(
        supabase
          .from("groups")
          .select("*, courses(name), teachers(full_name), enrollments(id, status)")
          .eq("center_id", c)
          .order("name"),
      ),
  });

export const studentsQ = (c: string) =>
  queryOptions({
    queryKey: ["students", c],
    queryFn: () =>
      run(
        supabase
          .from("students")
          .select("*, enrollments(id, status, group_id, groups(name, course_id))")
          .eq("center_id", c)
          .order("created_at", { ascending: false }),
      ),
  });

export const balancesQ = (c: string) =>
  queryOptions({ queryKey: ["balances", c], queryFn: () => run(supabase.from("v_student_balances").select("*").eq("center_id", c)) });

export const paymentsQ = (c: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["payments", c, from, to],
    queryFn: () =>
      run(
        supabase
          .from("payments")
          .select("*, students(full_name, phone), groups(name)")
          .eq("center_id", c)
          .gte("paid_on", from)
          .lte("paid_on", to)
          .order("paid_on", { ascending: false })
          .order("created_at", { ascending: false }),
      ),
  });

export const expensesQ = (c: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["expenses", c, from, to],
    queryFn: () =>
      run(supabase.from("expenses").select("*").eq("center_id", c).gte("spent_on", from).lte("spent_on", to).order("spent_on", { ascending: false })),
  });

/** Every query key family touched by financial writes. */
export const FIN_KEYS = [["payments"], ["balances"], ["dashboard"], ["student"], ["reports"]];
