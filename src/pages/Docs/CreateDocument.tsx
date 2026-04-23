import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  ArrowLeft,
  FilePlus2,
  FolderOpen,
  Loader2,
  RefreshCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { listRules, getRuleDetail } from "@/services/rules.service";
import { uploadDesktopBatch } from "@/services/document-desktop.service";
import type {
  DynamicFieldState,
  FieldSource,
  RegraDetalhe,
  RegraResumo,
  UploadMode,
  UploadSelectedFile,
} from "@/types/document-upload";
import {
  buildBatchItemsPayload,
  buildDynamicFieldsFromRule,
  coerceSelectedFiles,
  createDocumentSchema,
  getEffectiveFieldSource,
  mergeSelectedFiles,
  validateRequiredFieldsPreview,
} from "@/utils/documentUpload";

const fieldConfigSchema = z.object({
  origem: z.enum(["manual", "arquivo", "pasta"]),
  valor_manual: z.string(),
  posicao: z
    .string()
    .trim()
    .min(1, "Informe a posição.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, {
      message: "Posição deve ser um número inteiro maior ou igual a 1.",
    }),
  separador: z.string(),
  pasta_nivel: z
    .string()
    .trim()
    .min(1, "Informe o nível da pasta.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) >= 0, {
      message: "Nível da pasta deve ser um número inteiro maior ou igual a 0.",
    }),
});

export default function CreateDocument() {
  const navigate = useNavigate();
  const { user } = useUser();

  const [rules, setRules] = useState<RegraResumo[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [selectedRule, setSelectedRule] = useState<RegraDetalhe | null>(null);
  const [uploadMode, setUploadMode] = useState<UploadMode>("hibrido");
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldState[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<UploadSelectedFile[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingRuleDetail, setLoadingRuleDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
      folderInputRef.current.setAttribute("multiple", "");
    }
  }, []);

  const userId = Number(user?.pessoa?.id || 0);

  useEffect(() => {
    async function loadRules() {
      if (!userId) return;

      try {
        setLoadingRules(true);
        const data = await listRules(userId);
        setRules(data);
      } catch (error) {
        console.error("Erro ao carregar regras", error);
        toast.error("Não foi possível carregar as regras.");
      } finally {
        setLoadingRules(false);
      }
    }

    loadRules();
  }, [userId]);

  useEffect(() => {
    async function loadRuleDetail() {
      const ruleId = Number(selectedRuleId);

      if (!ruleId) {
        setSelectedRule(null);
        setDynamicFields([]);
        return;
      }

      try {
        setLoadingRuleDetail(true);
        const detail = await getRuleDetail(ruleId);
        setSelectedRule(detail);
        setDynamicFields(buildDynamicFieldsFromRule(detail));
      } catch (error) {
        console.error("Erro ao carregar detalhe da regra", error);
        toast.error("Não foi possível carregar os detalhes da regra.");
        setSelectedRule(null);
        setDynamicFields([]);
      } finally {
        setLoadingRuleDetail(false);
      }
    }

    loadRuleDetail();
  }, [selectedRuleId]);

  const validationIssues = useMemo(() => {
    const errors: string[] = [];

    dynamicFields.forEach((field) => {
      const parsed = fieldConfigSchema.safeParse({
        origem: getEffectiveFieldSource(uploadMode, field.origem),
        valor_manual: field.valor_manual,
        posicao: field.posicao,
        separador: field.separador,
        pasta_nivel: field.pasta_nivel,
      });

      if (!parsed.success) {
        parsed.error.issues.forEach((issue) => {
          errors.push(`${field.campo.nome_campo}: ${issue.message}`);
        });
      }
    });

    if (selectedRule && selectedFiles.length > 0) {
      errors.push(
        ...validateRequiredFieldsPreview(
          selectedRule,
          uploadMode,
          dynamicFields,
          selectedFiles
        )
      );
    }

    return errors;
  }, [dynamicFields, selectedFiles, selectedRule, uploadMode]);

  const totalTagsPreview = useMemo(() => {
    try {
      const items = buildBatchItemsPayload(selectedFiles, uploadMode, dynamicFields);
      return items.reduce((acc, item) => acc + item.tags.length, 0);
    } catch {
      return 0;
    }
  }, [selectedFiles, uploadMode, dynamicFields]);

  const isReadyToSubmit = useMemo(() => {
    const parsed = createDocumentSchema.safeParse({
      regra_id: Number(selectedRuleId),
      modo_tags: uploadMode,
      total_arquivos: selectedFiles.length,
    });

    return parsed.success && validationIssues.length === 0 && !!selectedRule;
  }, [selectedRuleId, uploadMode, selectedFiles.length, validationIssues.length, selectedRule]);

  const handleBack = () => navigate("/");

  const handleRefreshRules = async () => {
    if (!userId) {
      toast.error("Usuário não identificado.");
      return;
    }

    try {
      setLoadingRules(true);
      const data = await listRules(userId);
      setRules(data);
      toast.success("Regras recarregadas com sucesso.");
    } catch (error) {
      console.error("Erro ao atualizar regras", error);
      toast.error("Não foi possível atualizar as regras.");
    } finally {
      setLoadingRules(false);
    }
  };

  const handleSelectFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectFolderClick = () => {
    folderInputRef.current?.click();
  };

  const handleAddFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files || []);
    const normalized = coerceSelectedFiles(incoming);

    if (!normalized.length) {
      toast.error("Nenhum PDF válido foi selecionado.");
      event.target.value = "";
      return;
    }

    setSelectedFiles((current) => mergeSelectedFiles(current, normalized));
    event.target.value = "";
  };

  const handleRemoveFile = (id: string) => {
    setSelectedFiles((current) => current.filter((item) => item.id !== id));
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
  };

  const updateField = (
    index: number,
    patch: Partial<DynamicFieldState>
  ) => {
    setDynamicFields((current) =>
      current.map((item, idx) => (idx === index ? { ...item, ...patch } : item))
    );
  };

  const handleModeChange = (value: string) => {
    setUploadMode(value as UploadMode);
    setDynamicFields((current) =>
      current.map((field) => ({
        ...field,
        origem:
          value === "manual"
            ? "manual"
            : value === "arquivo" && field.origem === "manual"
            ? "arquivo"
            : field.origem,
      }))
    );
  };

  const handleSubmit = async () => {
    const parsed = createDocumentSchema.safeParse({
      regra_id: Number(selectedRuleId),
      modo_tags: uploadMode,
      total_arquivos: selectedFiles.length,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dados inválidos.";
      toast.error(firstError);
      return;
    }

    if (!selectedRule) {
      toast.error("Selecione uma regra válida.");
      return;
    }

    if (validationIssues.length > 0) {
      toast.error(validationIssues[0] || "Existem inconsistências nos campos.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        user_id: userId,
        regra_id: Number(selectedRuleId),
        modo_tags: uploadMode,
        itens: buildBatchItemsPayload(selectedFiles, uploadMode, dynamicFields),
      };

      const files = selectedFiles.map((item) => item.file);
      const response = await uploadDesktopBatch(payload, files);

      if (response.total_erro > 0) {
        const firstError =
          response.resultados.find((item) => !item.sucesso)?.erro ||
          "Alguns arquivos falharam.";
        toast.warning(
          `Upload concluído com ${response.total_sucesso} sucesso(s) e ${response.total_erro} erro(s). ${firstError}`
        );
      } else {
        toast.success(
          `Upload concluído com sucesso. ${response.total_sucesso} arquivo(s) enviado(s).`
        );
      }

      setSelectedFiles([]);
      navigate("/home");
    } catch (error: any) {
      console.error("Erro ao enviar lote", error);
      const detail =
        error?.response?.data?.detail ||
        error?.message ||
        "Não foi possível concluir o upload.";
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 mt-10"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4 border-b border-slate-200">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <h1 className="text-center xl:text-left text-xl sm:text-2xl font-semibold text-slate-800">
                    Criação de documento
                  </h1>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard title="Regras" value={String(rules.length)} />
                  <SummaryCard
                    title="Arquivos"
                    value={String(selectedFiles.length)}
                  />
                  <SummaryCard
                    title="Campos"
                    value={String(dynamicFields.length)}
                  />
                  <SummaryCard
                    title="Tags geradas"
                    value={String(totalTagsPreview)}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-10 py-6 sm:py-8 space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  <div className="w-full lg:max-w-md">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Regra do cliente
                    </label>
                    <Select
                      value={selectedRuleId}
                      onValueChange={setSelectedRuleId}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Selecione uma regra" />
                      </SelectTrigger>
                      <SelectContent>
                        {rules.map((rule) => (
                          <SelectItem key={rule.id} value={String(rule.id)}>
                            {rule.id} - {rule.nome} {rule.ativo ? "" : "(inativa)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-full lg:max-w-xs">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Modo das tags
                    </label>
                    <Select value={uploadMode} onValueChange={handleModeChange}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">manual</SelectItem>
                        <SelectItem value="arquivo">arquivo</SelectItem>
                        <SelectItem value="hibrido">hibrido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRefreshRules}
                      disabled={loadingRules}
                      className="cursor-pointer"
                    >
                      {loadingRules ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-4 h-4" />
                      )}
                      Recarregar regras
                    </Button>
                  </div>
                </div>

                {selectedRule ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">

                    <div className="rounded-xl border bg-white p-4">
                      <div className="font-semibold text-slate-800">Descrição</div>
                      <div className="mt-1">
                        {selectedRule.descricao?.trim() || "Sem descrição."}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="border-b border-slate-200 px-4 sm:px-5 py-4">
                  <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                    Campos dinâmicos da regra
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Cada campo pode ser preenchido manualmente, extraído do nome
                    do arquivo ou da pasta relativa.
                  </p>
                </div>

                {!selectedRule ? (
                  <div className="px-4 sm:px-5 py-8 text-sm text-slate-500">
                    Selecione uma regra para carregar os campos.
                  </div>
                ) : loadingRuleDetail ? (
                  <div className="px-4 sm:px-5 py-8 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando campos...
                  </div>
                ) : dynamicFields.length === 0 ? (
                  <div className="px-4 sm:px-5 py-8 text-sm text-slate-500">
                    Esta regra não possui campos cadastrados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Campo</th>
                          <th className="px-4 py-3">Tag</th>
                          <th className="px-4 py-3">Origem</th>
                          <th className="px-4 py-3">Valor manual</th>
                          <th className="px-4 py-3">Posição</th>
                          <th className="px-4 py-3">Separador</th>
                          <th className="px-4 py-3">Nível pasta</th>
                          <th className="px-4 py-3">Obrigatório</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dynamicFields.map((field, index) => {
                          const effectiveSource = getEffectiveFieldSource(
                            uploadMode,
                            field.origem
                          );
                          const isManualMode = uploadMode === "manual";
                          const manualDisabled =
                            effectiveSource === "manual"
                              ? false
                              : uploadMode === "arquivo"
                              ? true
                              : false;
                          const posDisabled = effectiveSource === "manual";
                          const separatorDisabled = effectiveSource === "manual";
                          const folderLevelDisabled = effectiveSource !== "pasta";

                          const parsed = fieldConfigSchema.safeParse({
                            origem: effectiveSource,
                            valor_manual: field.valor_manual,
                            posicao: field.posicao,
                            separador: field.separador,
                            pasta_nivel: field.pasta_nivel,
                          });

                          const fieldErrors = parsed.success
                            ? []
                            : parsed.error.issues.map((issue) => issue.message);

                          return (
                            <tr
                              key={`${field.campo.id}-${field.campo.chave_tag}`}
                              className="border-t border-slate-100 align-top"
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-800">
                                  {field.campo.nome_campo}
                                </div>
                                {field.campo.placeholder ? (
                                  <div className="text-xs text-slate-500 mt-1">
                                    {field.campo.placeholder}
                                  </div>
                                ) : null}
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-700">
                                {field.campo.chave_tag}
                              </td>

                              <td className="px-4 py-3">
                                <Select
                                  value={effectiveSource}
                                  onValueChange={(value) =>
                                    updateField(index, {
                                      origem: value as FieldSource,
                                    })
                                  }
                                  disabled={isManualMode}
                                >
                                  <SelectTrigger className="w-[140px] bg-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manual">manual</SelectItem>
                                    <SelectItem value="arquivo">arquivo</SelectItem>
                                    <SelectItem value="pasta">pasta</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={field.valor_manual}
                                  onChange={(e) =>
                                    updateField(index, {
                                      valor_manual: e.target.value,
                                    })
                                  }
                                  disabled={manualDisabled}
                                  placeholder="Valor manual"
                                  className="w-[210px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={1}
                                  value={field.posicao}
                                  onChange={(e) =>
                                    updateField(index, {
                                      posicao: e.target.value,
                                    })
                                  }
                                  disabled={posDisabled}
                                  className="w-[90px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="text"
                                  value={field.separador}
                                  onChange={(e) =>
                                    updateField(index, {
                                      separador: e.target.value,
                                    })
                                  }
                                  disabled={separatorDisabled}
                                  className="w-[120px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </td>

                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={field.pasta_nivel}
                                  onChange={(e) =>
                                    updateField(index, {
                                      pasta_nivel: e.target.value,
                                    })
                                  }
                                  disabled={folderLevelDisabled}
                                  className="w-[110px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                              </td>

                              <td className="px-4 py-3">
                                <div
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                                    field.campo.obrigatorio
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {field.campo.obrigatorio ? "Sim" : "Não"}
                                </div>

                                {fieldErrors.length > 0 ? (
                                  <div className="mt-2 text-xs text-red-600 space-y-1">
                                    {fieldErrors.map((message, idx) => (
                                      <div key={idx}>{message}</div>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-800">
                      Arquivos para envio
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Você pode selecionar PDFs avulsos ou uma pasta inteira.
                      Quando a pasta for escolhida, o navegador envia o caminho
                      relativo e a lógica de pasta passa a funcionar.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleAddFiles}
                      className="hidden"
                    />

                    <input
                      ref={folderInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleAddFiles}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectFilesClick}
                      className="cursor-pointer"
                    >
                      <FilePlus2 className="w-4 h-4" />
                      Selecionar arquivos
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectFolderClick}
                      className="cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Selecionar pasta
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClearFiles}
                      disabled={!selectedFiles.length}
                      className="cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border bg-white overflow-hidden">
                  {selectedFiles.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500">
                      Nenhum arquivo selecionado.
                    </div>
                  ) : (
                    <div className="max-h-[380px] overflow-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Arquivo</th>
                            <th className="px-4 py-3">Pasta relativa</th>
                            <th className="px-4 py-3">Tamanho</th>
                            <th className="px-4 py-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFiles.map((item) => (
                            <tr
                              key={item.id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-4 py-3 text-sm text-slate-800">
                                {item.display}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {item.pasta_relativa || "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {formatBytes(item.file.size)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => handleRemoveFile(item.id)}
                                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Remover
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              {validationIssues.length > 0 ? (
                <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                  <h3 className="text-sm font-semibold text-red-800">
                    Inconsistências encontradas
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-red-700">
                    {validationIssues.slice(0, 8).map((issue, index) => (
                      <div key={index}>• {issue}</div>
                    ))}
                    {validationIssues.length > 8 ? (
                      <div>• ... e mais {validationIssues.length - 8} item(ns)</div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isReadyToSubmit || saving}
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Enviar documentos
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="text-lg font-semibold text-slate-800 mt-1">{value}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}