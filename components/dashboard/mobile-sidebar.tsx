"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="text-lg font-bold text-primary">Pixels Juniors</h2>
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Sidebar Content */}
          <div className="relative flex w-64 max-w-[80%] flex-col bg-white">
            <button
              onClick={() => setOpen(false)}
              className="absolute left-2 top-2 rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            <div onClick={() => setOpen(false)} className="h-full w-full">
              <Sidebar isMobile />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
