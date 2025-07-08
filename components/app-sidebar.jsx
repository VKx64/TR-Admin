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

// Navigation configuration
const data = {
  // Main Navigation
  navMain: [
    {
      title: "Analytics Dashboard",
      url: "/analytics",
      icon: PieChart,
      isActive: false,
      items: [
        {
          title: "Analytics Hub",
          url: "/analytics",
        },
        {
          title: "Fuel Analytics",
          url: "/analytics/fuel",
        },
        {
          title: "Maintenance Analytics",
          url: "/analytics/maintenance",
        },
        {
          title: "Trip Analytics",
          url: "/analytics/trips",
        },
        {
          title: "Usage Analytics",
          url: "/analytics/usage",
        },
      ],
    },
    {
      title: "Truck Management",
      url: "",
      icon: SquareTerminal,
      isActive: false,
      items: [
        {
          title: "Vehicle Overview",
          url: "/trucks",
        },
        {
          title: "Vehicle Assignment",
          url: "/assign_trucks",
        },
        {
          title: "Fuel Management",
          url: "/refuel",
        },
        {
          title: "GPS Tracking",
          url: "/gps",
        },
        {
          title: "Add New Vehicle",
          url: "/create_trucks",
        },
      ],
    },
    {
      title: "Driver Operations",
      url: "#",
      icon: Bot,
      isActive: false,
      items: [
        {
          title: "Driver Directory",
          url: "/drivers",
        },
        {
          title: "Route Planning",
          url: "#",
        },
      ],
    },
    {
      title: "Maintenance & Service",
      url: "#",
      icon: BookOpen,
      isActive: false,
      items: [
        {
          title: "Service Overview",
          url: "/maintenance",
        },
        {
          title: "Service Requests",
          url: "/maintenance_request",
        },
        {
          title: "Service History",
          url: "/maintenance_history",
        },
      ],
    },
  ],
  // Quick Access Links
  projects: [
    {
      name: "Analytics Dashboard",
      url: "/analytics",
      icon: Frame,
    },
    {
      name: "Truck Overview",
      url: "/trucks",
      icon: Frame,
    },
    {
      name: "Driver Management",
      url: "/drivers",
      icon: PieChart,
    },
    {
      name: "Service Requests",
      url: "/maintenance_request",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }) {
  // State to track if component is mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);

  // Default Data
  const [userData, setUserData] = useState({
    name: 'Guest User',
    email: 'No email available',
    avatar: '/Images/avatar_placeholder.jpg',
  });

  // Fetch Actual Data
  useEffect(() => {
    // Set mounted flag first
    setIsMounted(true);

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

  // Don't render user data until component is mounted to prevent hydration mismatch
  const displayUserData = isMounted ? userData : {
    name: 'Guest User',
    email: 'No email available',
    avatar: '/Images/avatar_placeholder.jpg',
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* TODO: Create a top header thing here */}
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
        <NavMain items={data.navMain} />
      </SidebarContent>      <SidebarFooter>
        <NavUser user={displayUserData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
