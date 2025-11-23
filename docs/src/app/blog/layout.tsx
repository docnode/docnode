import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

const options: BaseLayoutProps = {
  ...baseOptions,
  themeSwitch: {
    enabled: false,
  },
  links: [
    ...(baseOptions.links ?? []),
    {
      type: "main",
      text: "Blog",
      url: "/blog",
    },
    {
      type: "main",
      text: "Documentation",
      url: "/docs",
    },
  ],
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <RootProvider theme={{ ...baseOptions, forcedTheme: "dark" }}>
      <HomeLayout {...options}>{children}</HomeLayout>
    </RootProvider>
  );
}
