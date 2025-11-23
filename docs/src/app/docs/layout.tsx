import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

const options: BaseLayoutProps = {
  ...baseOptions,
  links: [
    ...(baseOptions.links ?? []),
    {
      type: "main",
      text: "Blog",
      url: "/blog",
    },
  ],
};

export default function Layout({ children }: LayoutProps<"/docs">) {
  return (
    <RootProvider theme={{ ...options }}>
      <DocsLayout tree={source.pageTree} {...options}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
