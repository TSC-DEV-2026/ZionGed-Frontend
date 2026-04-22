import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FaUserAlt } from "react-icons/fa";
import { toast } from "sonner";

export default function Header() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();

  const displayName = useMemo(() => {
    const nome = (user?.pessoa?.nome || "").trim();
    if (nome) return nome;

    const email = (user?.email || "").trim();
    if (email) return email.split("@")[0] || "Usuário";

    return "Usuário";
  }, [user?.pessoa?.nome, user?.email]);

  const initials = useMemo(() => {
    const nome = (user?.pessoa?.nome || "").trim();
    if (!nome) return "US";

    const parts = nome.split(/\s+/).slice(0, 2);
    return parts.map((p) => (p[0] || "").toUpperCase()).join("") || "US";
  }, [user?.pessoa?.nome]);

  const loginToken = user?.pessoa?.login_token || "";

  const handleLogout = async () => {
    await logout();
  };

  const handleCopyToken = async () => {
    if (!loginToken) return;

    try {
      await navigator.clipboard.writeText(loginToken);
      toast.success("Token copiado com sucesso.");
    } catch (error) {
      console.error("Erro ao copiar token", error);
      toast.error("Não foi possível copiar o token.");
    }
  };

  return (
    <header className="flex h-[65px] w-full items-center bg-linear-to-r from-[#42F51F] via-[#48cf3e] to-[#318844]">
      <div className="flex w-full items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-3">
          <img
            className="max-h-56 pt-2 w-52"
            src="/logo.png"
            alt="logo do site"
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-3 text-black hover:bg-white/30 cursor-pointer"
                >
                  <span className="hidden text-sm font-medium md:block">
                    {displayName}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-white/80 text-black">
                      {initials || <FaUserAlt size={16} />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-72">
                <DropdownMenuLabel className="text-sm">
                  {displayName}
                  <div className="text-xs font-normal text-muted-foreground truncate">
                    {user.email}
                  </div>
                </DropdownMenuLabel>

                {loginToken ? (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-2">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Token de acesso
                      </div>
                      <div className="rounded-md border bg-slate-50 px-2 py-2 text-xs break-all text-slate-700">
                        {loginToken}
                      </div>
                    </div>

                    <DropdownMenuItem
                      onClick={handleCopyToken}
                      className="cursor-pointer"
                    >
                      Copiar token
                    </DropdownMenuItem>
                  </>
                ) : null}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 cursor-pointer"
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="secondary"
              className="bg-white/80 text-black hover:bg-white cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}