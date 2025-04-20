"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar"
import { metadata } from "./metadata";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import pb from '@/services/pocketbase';
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"; // Import Toaster

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname?.startsWith('/login');

  useEffect(() => {
    // Check if the user is authenticated
    if (!pb.authStore.isValid) {
      router.push('/login');
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SidebarProvider>
          {!isAuthPage && <AppSidebar />}
          <SidebarInset>
            {children}
          </SidebarInset>
        </SidebarProvider>
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
