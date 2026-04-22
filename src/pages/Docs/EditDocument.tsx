import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { DocumentRecord } from "@/components/search-input";
import api from "@/utils/axiosInstance";
import { Button } from "@/components/ui/button";

type LocationState = {
  doc?: DocumentRecord;
};

type EditableTag = {
  id?: number;
  chave: string;
  valor: string;
};

function onlyDigits(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9
  )}-${digits.slice(9, 11)}`;
}

function formatCompetenciaForInput(value: string) {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  const digits = onlyDigits(raw);

  if (digits.length === 6) {
    const first4 = digits.slice(0, 4);
    const last2 = digits.slice(4, 6);

    if (Number(first4) >= 1900) {
      return `${first4}-${last2}`;
    }

    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    return `${yyyy}-${mm}`;
  }

  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
}

function normalizeCompetenciaForSave(value: string) {
  const raw = (value ?? "").trim();

  if (!raw) return "";

  if (/^\d{4}-\d{2}$/.test(raw)) {
    return raw;
  }

  const digits = onlyDigits(raw);

  if (digits.length === 6) {
    const first4 = digits.slice(0, 4);

    if (Number(first4) >= 1900) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
    }

    return `${digits.slice(2, 6)}-${digits.slice(0, 2)}`;
  }

  return raw;
}

function formatTagLabel(tag: string) {
  const raw = (tag ?? "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  const acronyms = new Set([
    "cpf",
    "cnpj",
    "id",
    "rg",
    "pis",
    "nsr",
    "pdf",
    "xml",
    "json",
    "csv",
    "api",
    "url",
    "uuid",
  ]);

  return raw
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();

      if (acronyms.has(lower)) {
        return lower.toUpperCase();
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function isCpfTag(chave: string) {
  return /\bcpf\b/i.test(chave);
}

function isCompetenciaTag(chave: string) {
  return /competenc/i.test(chave);
}

function isReadonlyTag(chave: string) {
  const normalized = (chave ?? "")
    .toLowerCase()
    .replace(/[_\s]+/g, "");

  return normalized === "regraid";
}

function getInitialTagValue(chave: string, valor: string) {
  if (isCpfTag(chave)) {
    return formatCpf(valor);
  }

  if (isCompetenciaTag(chave)) {
    return formatCompetenciaForInput(valor);
  }

  return valor ?? "";
}

function normalizeTagValueForSave(chave: string, valor: string) {
  if (isCpfTag(chave)) {
    return onlyDigits(valor).slice(0, 11);
  }

  if (isCompetenciaTag(chave)) {
    return normalizeCompetenciaForSave(valor);
  }

  return (valor ?? "").trim();
}

export default function DocumentEditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { doc } = (location.state as LocationState) || {};

  const [isSaving, setIsSaving] = useState(false);
  const [filename, setFilename] = useState("");
  const [tags, setTags] = useState<EditableTag[]>([]);

  useEffect(() => {
    if (!doc) {
      toast.error("Nenhum documento selecionado para edição.");
      return;
    }

    setFilename(doc.filename ?? "");

    const dynamicTags: EditableTag[] = (doc.tags ?? []).map((tag) => ({
      id: tag.id,
      chave: tag.chave,
      valor: getInitialTagValue(tag.chave, tag.valor),
    }));

    setTags(dynamicTags);
  }, [doc]);

  const handleTagChange = (index: number, value: string) => {
    setTags((prev) =>
      prev.map((tag, currentIndex) => {
        if (currentIndex !== index) return tag;
        if (isReadonlyTag(tag.chave)) return tag;

        if (isCpfTag(tag.chave)) {
          return {
            ...tag,
            valor: formatCpf(value),
          };
        }

        if (isCompetenciaTag(tag.chave)) {
          return {
            ...tag,
            valor: formatCompetenciaForInput(value),
          };
        }

        return {
          ...tag,
          valor: value,
        };
      })
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!doc) return;

    const normalizedTags = tags
      .map((tag) => ({
        chave: tag.chave,
        valor: normalizeTagValueForSave(tag.chave, tag.valor),
      }))
      .filter((tag) => tag.chave.trim() !== "" && tag.valor !== "");

    const payload = {
      filename: filename.trim(),
      tags: normalizedTags,
    };

    try {
      setIsSaving(true);

      await api.put(`/documents/${doc.uuid}/update`, payload);

      toast.success("Documento atualizado com sucesso.");
      navigate(-1);
    } catch (err) {
      console.error("Erro ao atualizar documento", err);
      toast.error("Não foi possível atualizar o documento. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const isFormValid = useMemo(() => {
    return filename.trim() !== "";
  }, [filename]);

  if (!doc) {
    return (
      <div className="w-full min-h-screen bg-white flex flex-col">
        <Header />

        <div>
          <SideMenu topClass="top-20" />
        </div>

        <main className="flex-1 flex items-center justify-center px-4 bg-slate-50">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-md text-center transition-transform duration-300 hover:-translate-y-1">
            <p className="mb-4 text-sm text-slate-600">
              Nenhum documento foi informado para edição.
            </p>
            <Button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full px-5 py-2.5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <Header />

      <div>
        <SideMenu topClass="top-20" />
      </div>

      <main className="flex-1 bg-slate-50">
        <section className="w-full max-w-6xl mx-auto px-4 lg:px-6 pt-8 lg:pt-10 pb-12 flex flex-col">
          <div className="mb-6 sm:mb-8 flex flex-col gap-4">
            <div className="flex justify-start">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 mt-10"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-center sm:text-left text-xl sm:text-2xl font-semibold text-slate-800">
                  Edição de documento
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-right">
                  Atualize as informações deste arquivo conforme os campos enviados pelo backend.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-6 sm:px-10 py-6 sm:py-8 space-y-5 sm:space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <FormRow label="Nome do arquivo">
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    placeholder="nome_do_arquivo.pdf"
                  />
                </FormRow>

                {tags.map((tag, index) => {
                  const isCpf = isCpfTag(tag.chave);
                  const isCompetencia = isCompetenciaTag(tag.chave);
                  const isReadonly = isReadonlyTag(tag.chave);

                  return (
                    <FormRow
                      key={`${tag.chave}-${tag.id ?? index}`}
                      label={formatTagLabel(tag.chave)}
                    >
                      <input
                        type="text"
                        value={tag.valor}
                        onChange={(e) => handleTagChange(index, e.target.value)}
                        disabled={isReadonly}
                        className={`w-full rounded-xl border px-4 py-3 text-sm sm:text-base transition-all duration-200 ${
                          isReadonly
                            ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                            : "bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        }`}
                        placeholder={
                          isCpf
                            ? "000.000.000-00"
                            : isCompetencia
                            ? "YYYY-MM"
                            : `Informe ${formatTagLabel(tag.chave).toLowerCase()}`
                        }
                        maxLength={isCpf ? 14 : isCompetencia ? 7 : undefined}
                      />
                    </FormRow>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  type="submit"
                  disabled={isSaving || !isFormValid}
                  className="w-full sm:w-56 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>Concluir ✓</>
                  )}
                </Button>

                <Button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="outline"
                  className="w-full sm:w-56 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold border-red-500 text-red-600 bg-white hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  Cancelar ✕
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-[11px] sm:text-xs font-medium tracking-wide text-slate-600 uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}