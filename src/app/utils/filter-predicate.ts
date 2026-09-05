export function filterPredicate<T>(value: any): value is T {
  return !!value;
}
