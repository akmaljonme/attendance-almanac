// Introductory plan offers. Prices may change; edit here to reconfigure.
export const PLANS = [
  {
    id: "start",
    name: "Start",
    price: "199 000",
    desc: "Kichik markazlar uchun",
    featured: false,
    features: ["100 tagacha o'quvchi", "2 ta xodim", "Davomat va to'lovlar"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "399 000",
    desc: "O'sayotgan markazlar uchun",
    featured: true,
    features: ["500 tagacha o'quvchi", "10 ta xodim", "Hisobotlar va CSV eksport", "Xarajatlar hisobi"],
  },
  {
    id: "business",
    name: "Biznes",
    price: "699 000",
    desc: "Ko'p filialli markazlar uchun",
    featured: false,
    features: ["Cheksiz o'quvchilar", "Cheksiz xodimlar", "Barcha imkoniyatlar", "Ustuvor yordam"],
  },
] as const;
