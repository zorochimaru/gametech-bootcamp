export type PartialSubtype<T extends S, S> = Omit<T, keyof S> & Partial<S>;

export type ReplacePropertiesType<T, D, R> = {
  [P in keyof T]: T[P] extends D ? R : T[P];
};

export type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type ListPropertiesOfSpecificType<T, D> = keyof {
  [P in keyof T as T[P] extends D ? P : never]: T[P];
};

export type Newable<T> = { new (...args: any[]): T };
