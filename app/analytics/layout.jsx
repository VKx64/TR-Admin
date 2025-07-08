import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export default function AnalyticsLayout({
  children,
}) {
  return (
    <div className={cn(inter.className, "min-h-screen bg-background")}>
      {children}
    </div>
  );
}
