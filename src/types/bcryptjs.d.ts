declare module 'bcryptjs' {
  export function hashSync(s: string, rounds?: number): string;
  export function compareSync(s: string, hash: string): boolean;

  const _default: {
    hashSync: typeof hashSync;
    compareSync: typeof compareSync;
  };

  export default _default;
}
