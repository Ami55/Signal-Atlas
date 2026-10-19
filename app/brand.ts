// Shared deployment configuration; defaults are fictional examples.
export const targetBrand = process.env.NEXT_PUBLIC_TARGET_BRAND?.trim() || "Example Travel";
export const targetDomain = (process.env.NEXT_PUBLIC_TARGET_DOMAIN?.trim() || "example.com").replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "").toLowerCase();
export function isBrandDomain(hostname: string) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return host === targetDomain || host.endsWith(`.${targetDomain}`);
}
export function mentionsBrand(text: string) {
  return text.toLowerCase().includes(targetBrand.toLowerCase());
}
