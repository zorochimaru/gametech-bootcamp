export function exhaustiveCheck(arg: never): never {
  throw new Error(`Should never run with arg: ${arg}`);
}
