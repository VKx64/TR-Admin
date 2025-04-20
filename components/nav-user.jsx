"use client"

import React, { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { logout } from "@/services/authentication"
import { useRouter } from "next/navigation"
import pb from "@/services/pocketbase"

export function NavUser() {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = pb.authStore?.record;
    if (currentUser) {
      setUser(currentUser);
      console.log("User data:", currentUser);
    }
  }, []);

  // Derive values from state, handling null case
  const username = user?.username;
  const email = user?.email;
  const userAvatar = user ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${user.collectionId}/${user.id}/${user.avatar}` : null;

  // Logout handler function
  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={userAvatar} alt={username || ''} />
                <AvatarFallback className="rounded-lg">
                  {username ? username.charAt(0).toUpperCase() : 'U'} {/* Show first letter or 'U' */}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{username || 'Loading...'}</span>
                <span className="truncate text-xs">{email || '...'}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={userAvatar} alt={username || ''} />
                  <AvatarFallback className="rounded-lg">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{username || 'Loading...'}</span>
                  <span className="truncate text-xs">{email || '...'}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck className="mr-2 size-4" /> {/* Added margin */}
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2 size-4" /> {/* Added margin */}
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 size-4" /> {/* Added margin */}
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
