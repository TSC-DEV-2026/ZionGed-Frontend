import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Home,
  FileText,
  Settings2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  exact?: boolean;
};

const NAV: NavItem[] = [
  {
    label: "Início",
    to: "/",
    icon: <Home className="h-4 w-4" />,
    exact: true,
  },
  {
    label: "Criar Documentos",
    to: "/documents/create",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    label: "Regras",
    to: "/rules",
    icon: <Settings2 className="h-4 w-4" />,
  },
];

type SideMenuProps = {
  topClass?: string;
};

export default function SideMenu({ topClass = "top-24" }: SideMenuProps) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Abrir menu"
          className={cn(
            "group fixed left-3 z-50 h-12 w-12 rounded-full overflow-hidden",
            "transition-all duration-300 ease-out",
            "shadow-md shadow-slate-400/40",
            "active:scale-95 hover:scale-105 hover:cursor-pointer",
            topClass,
            open
              ? "scale-0 pointer-events-none opacity-0"
              : "scale-100 opacity-100"
          )}
        >
          <span className="absolute inset-0 rounded-full bg-linear-to-br from-emerald-500 via-emerald-600 to-emerald-700" />

          <span className="absolute inset-0.5 rounded-full bg-white/95 backdrop-blur-sm border border-white/70" />

          <span
            className="
              pointer-events-none absolute -left-1/2 top-0 h-full w-2/3
              translate-x-[-60%] rotate-12
              bg-linear-to-r from-white/0 via-white/40 to-white/0
              opacity-0 group-hover:opacity-100
              transition-all duration-500 ease-out
              group-hover:translate-x-[180%]
            "
          />

          <span className="relative z-10 flex h-full w-full items-center justify-center">
            <span className="flex flex-col items-center justify-center gap-1">
              <span
                className="
                  h-0.5 w-4 rounded-full bg-slate-700
                  transition-all duration-300 ease-out
                  group-hover:bg-slate-900 group-hover:w-5
                "
              />
              <span
                className="
                  h-0.5 w-4 rounded-full bg-slate-700
                  transition-all duration-300 ease-out
                  group-hover:bg-slate-900 group-hover:w-6
                "
              />
              <span
                className="
                  h-0.5 w-4 rounded-full bg-slate-700
                  transition-all duration-300 ease-out
                  group-hover:bg-slate-900 group-hover:w-5
                "
              />
            </span>
          </span>
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-[300px] p-0 transition-transform duration-200 data-[state=closed]:duration-200"
      >
        <SheetHeader className="p-4 border-b bg-white">
          <SheetTitle className="text-left text-slate-800">ZionGed</SheetTitle>
        </SheetHeader>

        <nav className="p-2 bg-white">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);

            return (
              <SheetClose asChild key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                    active
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                      : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </SheetClose>
            );
          })}
        </nav>

        <div className="mt-auto p-2 border-t bg-white">
          <SheetClose asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-red-50 text-red-700"
              onClick={() => {
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}