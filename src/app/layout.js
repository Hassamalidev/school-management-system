import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui";

export const metadata = {
  title: "Kindle Sprout — Student Management System",
  description:
    "Student records, fee structure, monthly challans and payment tracking for Kindle Sprout Daycare & School, Islamabad.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
