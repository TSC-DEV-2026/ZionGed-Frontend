import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  FilePenLine,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import {
  deleteRule,
  getRuleDetail,
  listRules,
  updateRule,
} from "@/services/rules.service";
import type { RegraResumo } from "@/types/rules";

export default function ListRules() {
  const navigate = useNavigate();
  const { user } = useUser();
  const userId = Number(user?.pessoa?.id || 0);

  const [rules, setRules] = useState<RegraResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionRuleId, setActionRuleId] = useState<number | null>(null);

  const loadRules = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await listRules(userId);
      setRules(data);
    } catch (error) {
      console.error("Erro ao carregar regras", error);
      toast.error("Não foi possível carregar as regras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [userId]);

  const handleToggleActive = async (ruleId: number) => {
    try {
      setActionRuleId(ruleId);

      const detail = await getRuleDetail(ruleId);

      await updateRule(ruleId, {
        user_id: detail.user_id,
        nome: detail.nome,
        descricao: detail.descricao,
        ativo: !detail.ativo,
        campos: detail.campos.map((campo) => ({
          nome_campo: campo.nome_campo,
          chave_tag: campo.chave_tag,
          tipo: campo.tipo,
          obrigatorio: campo.obrigatorio,
          ordem: campo.ordem,
          posicao_nome: campo.posicao_nome,
          placeholder: campo.placeholder,
          mascara: campo.mascara,
        })),
      });

      toast.success("Status da regra atualizado com sucesso.");
      await loadRules();
    } catch (error) {
      console.error("Erro ao alternar regra", error);
      toast.error("Não foi possível atualizar o status da regra.");
    } finally {
      setActionRuleId(null);
    }
  };

  const handleDelete = async (ruleId: number) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta regra?"
    );

    if (!confirmed) return;

    try {
      setActionRuleId(ruleId);
      await deleteRule(ruleId);
      toast.success("Regra excluída com sucesso.");
      await loadRules();
    } catch (error) {
      console.error("Erro ao excluir regra", error);
      toast.error("Não foi possível excluir a regra.");
    } finally {
      setActionRuleId(null);
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              className="flex items-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 mt-10"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={loadRules}
                disabled={loading}
                className="cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCcw className="w-4 h-4" />
                )}
                Recarregar
              </Button>

              <Button
                type="button"
                onClick={() => navigate("/rules/create")}
                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Nova regra
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4 border-b border-slate-200">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
                Regras e tags
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Cadastre as regras que serão usadas no upload web com a mesma
                lógica do executável.
              </p>
            </div>

            <div className="px-6 sm:px-10 py-6 sm:py-8">
              {loading ? (
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando regras...
                </div>
              ) : rules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="text-slate-700 font-medium">
                    Nenhuma regra cadastrada
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    Crie a primeira regra para começar a configurar suas tags.
                  </div>
                  <div className="mt-4">
                    <Button
                      type="button"
                      onClick={() => navigate("/rules/create")}
                      className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Criar regra
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[960px] w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Atualizado em</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rules.map((rule) => {
                        const busy = actionRuleId === rule.id;

                        return (
                          <tr
                            key={rule.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 text-sm text-slate-700">
                              {rule.id}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">
                                {rule.nome}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {rule.descricao?.trim() || "Sem descrição"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium border ${
                                  rule.ativo
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {rule.ativo ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatDateTime(rule.atualizado_em)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() =>
                                    navigate(`/rules/${rule.id}/edit`)
                                  }
                                  className="cursor-pointer"
                                >
                                  <FilePenLine className="w-4 h-4" />
                                  Editar
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleToggleActive(rule.id)}
                                  disabled={busy}
                                  className="cursor-pointer"
                                >
                                  {busy ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : null}
                                  {rule.ativo ? "Inativar" : "Ativar"}
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => handleDelete(rule.id)}
                                  disabled={busy}
                                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function formatDateTime(value: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}