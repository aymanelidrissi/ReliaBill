export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function toFixed2(n: number): string {
  return round2(n).toFixed(2)
}

export function sum(arr: number[]): number {
  return round2(arr.reduce((a, b) => a + b, 0))
}
