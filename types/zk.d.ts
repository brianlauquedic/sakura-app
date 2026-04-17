// Ambient module declarations for ZK toolchain (snarkjs, circomlibjs).
// These libraries ship without TypeScript types — we loose-type them as
// `any` here because the surface we use is narrow and covered by the
// wrappers in `lib/zk-proof.ts`.

declare module "snarkjs" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export = content;
}

declare module "circomlibjs" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export = content;
}
