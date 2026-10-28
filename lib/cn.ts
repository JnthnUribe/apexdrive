type ClassValue = string | false | null | undefined;

/** Une clases condicionales sin dependencias. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
