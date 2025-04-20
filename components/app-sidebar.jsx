"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import pb from "@/services/pocketbase";

import {
  BookOpen,
  Bot,
  Frame,
  Map,
  PieChart,
  SquareTerminal,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// This is sample data.
const data = {
  // Truck Navigation
  navMain: [
    {
      title: "Trucks",
      url: "",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Manage Trucks",
          url: "/trucks",
        },
        {
          title: "Assign Trucks",
          url: "#",
        },
      ],
    },
    {
      title: "Drivers",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "View Drivers",
          url: "#",
        },
        {
          title: "Route Drivers",
          url: "#",
        },
      ],
    },
    {
      title: "Maintenance",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Manage Request",
          url: "#",
        },
        {
          title: "Manage Maintenance",
          url: "#",
        },
        {
          title: "Maintenance Logs",
          url: "#",
        },
      ],
    },
    {
      title: "Analytics",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Fuel Data",
          url: "#",
        },
        {
          title: "Performance Data",
          url: "#",
        },
        {
          title: "Truck Data",
          url: "#",
        },
      ],
    },
  ],

  // Quick Links Section
  projects: [
    {
      name: "Truck Management",
      url: "#",
      icon: Frame,
    },
    {
      name: "Driver Management",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Tracking Information",
      url: "#",
      icon: Map,
    },
    {
      name: "Maintenance Request",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }) {

  // Default Data
  const [userData, setUserData] = useState({
    name: 'Guest User',
    email: 'No email available',
    avatar: '/Images/avatar_placeholder.jpg',
  });

  // Fetch Actual Data
  useEffect(() => {
    // Update user data once the component mounts on client side
    if (pb.authStore.record) {
      const userName = pb.authStore.record.name || '';
      const userEmail = pb.authStore.record.email || '';
      const userAvatar = `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/${pb.authStore.record.collectionId}/${pb.authStore.record.id}/${pb.authStore.record.avatar}`;

      setUserData({
        name: userName,
        email: userEmail,
        avatar: userAvatar,
      });
    }
  }, []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* TODO: Create a top header thing here */}
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
