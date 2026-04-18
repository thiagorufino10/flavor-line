// Formatação monetária BRL padrão: R$ 10.033,94
const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatBRL = (value: number | string | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return brlFormatter.format(0);
  return brlFormatter.format(num);
};

// Apenas o número formatado: 10.033,94 (sem o "R$ ")
export const formatBRLNumber = (value: number | string | null | undefined): string => {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(num)) return "0,00";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};
