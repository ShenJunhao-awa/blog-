declare module "bun" {
  export const $: (...args: any[]) => any;
}

declare module "strip-indent" {
  const stripIndent: (value: string) => string;
  export default stripIndent;
}

declare module "node:fs/promises" {
  export function readdir(path: string | Buffer | URL, options?: { recursive?: boolean } | null): Promise<string[]>;
  export function unlink(path: string | Buffer | URL): Promise<void>;
}

declare const process: {
  env: Record<string, string | undefined>;
  execPath: string;
  exit(code?: number): never;
};

declare const Bun: {
  file(path: string): { exists(): Promise<boolean> };
  write(path: string, content: string): Promise<void>;
};
