import ClientLayout from "./ClientLayout";
import { notFound } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV !== "development") return notFound();

  return (
    <>
      <h1>Your doc:</h1>
      <ClientLayout>{children}</ClientLayout>
    </>
  );
}
