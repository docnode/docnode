import "@/app/global.css";
import { Analytics } from "@vercel/analytics/react";
import { Suspense } from "react";
import PostHogPageView from "./PostHogPageView";
import { AISearchTrigger } from "@/components/search";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        <Analytics />
        <AISearchTrigger />
        {children}
      </body>
    </html>
  );
}
