import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import RuleForm from "@/components/rules/RuleForm";
import { getRuleDetail, updateRule } from "@/services/rules.service";
import type { RegraDetalhe, RegraPayload } from "@/types/rules";

export default function EditRule() {
  const navigate = useNavigate();
  const params = useParams();
  const ruleId = Number(params.id || 0);

  const [rule, setRule] = useState<RegraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadRule() {
      if (!ruleId) {
        toast.error("Regra inválida.");
        navigate("/rules");
        return;
      }

      try {
        setLoading(true);
        const data = await getRuleDetail(ruleId);
        setRule(data);
      } catch (error) {
        console.error("Erro ao carregar regra", error);
        toast.error("Não foi possível carregar a regra.");
        navigate("/rules");
      } finally {
        setLoading(false);
      }
    }

    loadRule();
  }, [ruleId, navigate]);

  const handleSubmit = async (payload: RegraPayload) => {
    try {
      setSaving(true);
      await updateRule(ruleId, payload);
      toast.success("Regra atualizada com sucesso.");
      navigate("/rules");
    } catch (error: any) {
      console.error("Erro ao atualizar regra", error);
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        "Não foi possível atualizar a regra.";
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
                Editar regra
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Atualize os campos e tags da regra selecionada.
              </p>
            </div>

            <div className="px-6 sm:px-10 py-6 sm:py-8">
              {loading ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando regra...
                </div>
              ) : rule ? (
                <RuleForm
                  userId={rule.user_id}
                  saving={saving}
                  submitLabel="Salvar alterações"
                  initialData={{
                    nome: rule.nome,
                    descricao: rule.descricao,
                    ativo: rule.ativo,
                    campos: rule.campos,
                  }}
                  onSubmit={handleSubmit}
                />
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}