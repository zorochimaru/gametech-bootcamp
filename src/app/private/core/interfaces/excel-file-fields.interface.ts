export interface ExcelFileFields
  extends Record<string, string | number | undefined | Date> {
  name: string;
  order: number;
  count: number;
  image?: string;
}
