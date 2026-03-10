declare module 'sharp' {
  interface SharpInstance {
    metadata(): Promise<{ width?: number; height?: number; channels?: number }>;
    extract(region: { left: number; top: number; width: number; height: number }): SharpInstance;
    blur(sigma?: number): SharpInstance;
    png(): SharpInstance;
    toBuffer(): Promise<Buffer>;
    raw(): SharpInstance;
    toBuffer(options: { resolveWithObject: true }): Promise<{ data: Buffer; info: { channels?: number } }>;
  }
  function sharp(input: Buffer): SharpInstance;
  export default sharp;
}
