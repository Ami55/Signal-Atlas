import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "Signal Atlas — AI Search Evidence";
  const description = "Capture and track brand mentions and citations in Google AI Overviews.";
  return {
    title,
    description,
    icons: { icon: "/favicon.svg" },
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<AppAbout/></body></html>;
}


function AppAbout(){return <><style>{".sg-app-about{position:fixed;right:20px;bottom:20px;z-index:40;max-width:calc(100vw - 32px);font-family:Inter,system-ui,sans-serif;color:#20203a;text-align:left;line-height:1.6;letter-spacing:normal}.sg-app-about>summary{display:flex;align-items:center;justify-content:space-between;gap:18px;list-style:none;cursor:pointer;border:1px solid #dcd5f1;border-radius:14px;background:#fff;color:#493188;padding:12px 16px;font-size:13px;font-weight:750;box-shadow:0 5px 24px #20154816}.sg-app-about>summary::-webkit-details-marker{display:none}.sg-app-about>summary:focus-visible{outline:3px solid #987bff;outline-offset:3px}.sg-app-about .sg-about-toggle{font-size:20px;line-height:1;transition:transform .15s}.sg-app-about[open]{width:410px;max-width:calc(100vw - 32px);border:1px solid #dcd5f1;border-radius:17px;background:#fff;box-shadow:0 20px 70px #15102b30}.sg-app-about[open]>summary{border:0;border-bottom:1px solid #eeeaf5;border-radius:17px 17px 0 0;box-shadow:none}.sg-app-about[open] .sg-about-toggle{transform:rotate(45deg)}.sg-app-about .sg-about-content{padding:22px;max-height:65vh;max-height:65svh;overflow:auto;overscroll-behavior:contain}.sg-app-about h2{font-size:21px;line-height:1.25;letter-spacing:-.5px;color:#201638;margin:0 0 18px;font-weight:800}.sg-app-about h3{font-size:10px;text-transform:uppercase;letter-spacing:1.3px;font-weight:800;color:#7355a5;margin:20px 0 7px}.sg-app-about p{font-size:13px;font-weight:400;line-height:1.75;color:#5c566b;margin:0}.sg-app-about .sg-about-credit{font-size:11px;margin-top:22px;padding-top:14px;border-top:1px solid #eeeaf5;color:#877d97}@media(max-width:600px){.sg-app-about{right:16px;bottom:16px}.sg-app-about .sg-about-content{padding:18px;max-height:60svh}}@media print{.sg-app-about{display:none}}@media(prefers-reduced-motion:reduce){.sg-app-about .sg-about-toggle{transition:none}}"}</style><details className="sg-app-about" data-app-about="Signal-Atlas"><summary>About this app <span className="sg-about-toggle" aria-hidden="true">+</span></summary><div className="sg-about-content"><h2>Signal Atlas</h2><h3>The idea</h3><p>The idea is to make captured AI-search evidence easier to organize and revisit, rather than relying on scattered screenshots or impressions.</p><h3>The problem it addresses</h3><p>Scattered answers and source observations make visibility research difficult to compare and explain.</p><h3>Who it helps</h3><p>SEO strategists and marketers researching how a brand appears in AI-assisted search.</p><h3>What you can do</h3><p>Provides a workspace for reviewing AI-search answers, citations, brand signals, and supporting evidence.</p><h3>The intended outcome</h3><p>Organize AI-search evidence into a clearer view of brand visibility.</p><p className="sg-about-credit">Created by SEO Girl - Ami. Review research, generated drafts, and illustrative examples before applying them.</p></div></details></>;}
