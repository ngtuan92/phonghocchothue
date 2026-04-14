// app/layout.tsx
import type { Metadata } from "next";
import "@mantine/core/styles.css";
import { Providers } from "@/lib/query-client";
import { ConfigProvider } from "@/context/ConfigProvider";
import { Toaster } from "react-hot-toast";
import "../index.css";
import "../App.css";
import "react-slideshow-image/dist/styles.css";
import MantineProviderWrapper from "./MantineProviderWrapper";
import GoogleVerificationMeta from "@/components/GoogleVerificationMeta";

export const metadata: Metadata = {
  metadataBase: new URL("https://phonghocchothue.com"),
  title: {
    default: "Thuê Phòng Học Chất Lượng – Giá Tốt",
    template: "%s | Thuê Phòng Học Chất Lượng – Giá Tốt",
  },
  description: "Website cho thuê phòng chuyên nghiệp, uy tín.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body suppressHydrationWarning>
        <Providers>
          <MantineProviderWrapper>
            <ConfigProvider>
              <GoogleVerificationMeta />
              {children}
              <Toaster />
            </ConfigProvider>
          </MantineProviderWrapper>
        </Providers>
      </body>
    </html>
  );
}
