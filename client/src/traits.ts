// ==========================================================
//  traits.ts — єдине джерело правди для списку характеристик.
//  Використовується і в GameTable.jsx, і в HostGodMode.tsx,
//  щоб порядок/іконки/підписи ніде не розходились.
// ==========================================================

export interface Trait {
  key: string;
  label: string;
  icon: string;
}

export const TRAITS: Trait[] = [
  { key: "profession", label: "Професія", icon: "💼" },
  { key: "health", label: "Здоров'я", icon: "⚕️" },
  { key: "biology", label: "Стать і вік", icon: "🧬" },
  { key: "phobia", label: "Фобія", icon: "😨" },
  { key: "baggage", label: "Багаж", icon: "🎒" },
  { key: "fact", label: "Факт", icon: "📌" },
];
