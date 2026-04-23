import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import RuleForm from "@/components/rules/RuleForm";
import { createRule } from "@/services/rules.service";
import type { RegraPayload } from "@/types/rules";

export default function CreateRule() {
  const navigate = useNavigate();
  const { user } = useUser();
  const userId = Number(user?.pessoa?.id || 0);

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (payload: RegraPayload) => {
    try {
      setSaving(true);
      await createRule(payload);
      toast.success("Regra criada com sucesso.");
      navigate("/rules");
    } catch (error: any) {
      console.error("Erro ao criar regra", error);
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        "Não foi possível criar a regra.";
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <Header />

      <div>
        <SideMenu topClass="top-20" />
      </div>

      <main className="flex-1 bg-slate-50">
        <section className="w-full max-w-7xl mx-auto px-4 lg:px-6 pt-8 lg:pt-10 pb-12 flex flex-col">
          <div className="mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/rules")}
              className="flex items-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 mt-10"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4 border-b border-slate-200">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
                Nova regra
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Cadastre uma nova regra e defina os campos/tags que serão usados
                no upload.
              </p>
            </div>

            <div className="px-6 sm:px-10 py-6 sm:py-8">
              <RuleForm
                userId={userId}
                saving={saving}
                submitLabel="Criar regra"
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}