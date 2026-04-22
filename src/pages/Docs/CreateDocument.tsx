// src/pages/docs/CreateDocument.tsx
import { useState, useRef, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import api from "@/utils/axiosInstance";
import { toast } from "sonner";
import { ArrowLeft, Loader2, UploadCloud } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";

function formatCpf(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, "").slice(0, 11);

  if (onlyDigits.length <= 3) {
    return onlyDigits;
  }
  if (onlyDigits.length <= 6) {
    return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(3)}`;
  }
  if (onlyDigits.length <= 9) {
    return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(
      3,
      6
    )}.${onlyDigits.slice(6)}`;
  }
  return `${onlyDigits.slice(0, 3)}.${onlyDigits.slice(
    3,
    6
  )}.${onlyDigits.slice(6, 9)}-${onlyDigits.slice(9, 11)}`;
}

function formatCompetencia(digits: string): string {
  const onlyDigits = digits.replace(/\D/g, "").slice(0, 6);

  if (onlyDigits.length <= 4) {
    return onlyDigits;
  }
  return `${onlyDigits.slice(0, 4)}-${onlyDigits.slice(4)}`;
}

export default function CreateDocument() {
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [cpf, setCpf] = useState("");
  const [competencia, setCompetencia] = useState(""); // exibido como YYYY-MM
  const [owner, setOwner] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useUser();

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const cpfRaw = cpf.replace(/\D/g, "");
    const competenciaDigits = competencia.replace(/\D/g, "");

    if (!file) {
      toast.error("Selecione um arquivo PDF.");
      return;
    }
    if (cpfRaw.length !== 11 || competenciaDigits.length !== 6) {
      toast.error("CPF deve ter 11 dígitos e Competência no formato YYYY-MM.");
      return;
    }

    try {
      setSaving(true);

      const meta: any = {
        user_id: Number(user?.pessoa?.id || 0),
        tags: [
          { chave: "tipo", valor: tipoDocumento },
          { chave: "cpf", valor: cpfRaw },
          // aqui vai COM TRAÇO, exatamente como está na tela (YYYY-MM)
          { chave: "competencia", valor: competencia },
          { chave: "Owner", valor: owner },
        ],
      };

      const formData = new FormData();
      formData.append("meta", JSON.stringify(meta));
      formData.append("file", file);

      await api.post("/documents/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Documento criado com sucesso.");
      navigate("/home");
    } catch (err) {
      console.error("Erro ao criar documento", err);
      toast.error("Não foi possível criar o documento. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleCpfChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    setCpf(formatCpf(digits));
  };

  const handleCompetenciaChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCompetencia(formatCompetencia(digits));
  };

  const cpfDigits = cpf.replace(/\D/g, "");
  const competenciaDigits = competencia.replace(/\D/g, "");
  const isFormValid =
    !!file && cpfDigits.length === 11 && competenciaDigits.length === 6;

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <Header />

      <div>
        <SideMenu topClass="top-20" />
      </div>

      <main className="flex-1 bg-slate-50">
        <section className="w-full max-w-6xl mx-auto px-4 lg:px-6 pt-8 lg:pt-10 pb-12 flex flex-col">
          {/* topo com botão voltar */}
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

          {/* card principal no mesmo estilo da tela de edição */}
          <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden transition-transform duration-300 hover:-translate-y-1">
            <div className="px-6 sm:px-10 pt-6 sm:pt-8 pb-4 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h1 className="text-center sm:text-left text-xl sm:text-2xl font-semibold text-slate-800">
                  Criação de documento
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-right">
                  Preencha os dados principais e envie o PDF para registrar no
                  GED.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="px-6 sm:px-10 py-6 sm:py-8 space-y-5 sm:space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <FormRow label="Tipo de documento">
                  <input
                    type="text"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200"
                    placeholder="Ex: Holerite, Informe de Rendimentos..."
                  />
                </FormRow>

                <FormRow label="Cliente (ID)">
                  <input
                    type="text"
                    value={clienteId}
                    onChange={(e) =>
                      setClienteId(
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duração-200"
                    placeholder="Ex: 5238"
                    maxLength={10}
                  />
                </FormRow>

                <FormRow label="CPF">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duração-200"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </FormRow>

                <FormRow label="Competência (Ano-Mês)">
                  <input
                    type="text"
                    value={competencia}
                    onChange={(e) => handleCompetenciaChange(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duração-200"
                    placeholder="2025-07"
                    maxLength={7}
                  />
                </FormRow>

                <FormRow label="Proprietário">
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-300 px-4 py-3 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duração-200"
                    placeholder="Ex: Ariel Silva"
                  />
                </FormRow>

                <FormRow label="Arquivo PDF">
                  <div className="flex max-sm:justify-start max-sm:items-start flex-col sm:flex-row items-center gap-3 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectFileClick}
                      className="inline-flex items-center gap-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm cursor-pointer transition-transform duração-200 hover:-translate-y-0.5"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Selecionar PDF
                    </Button>
                    <span className="text-xs sm:text-sm text-slate-500 truncate max-w-[220px] sm:max-w-xs">
                      {file ? file.name : "Nenhum arquivo selecionado"}
                    </span>
                  </div>
                </FormRow>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  type="submit"
                  disabled={saving || !isFormValid}
                  className="w-full sm:w-56 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-transform duração-200 hover:-translate-y-0.5 cursor-pointer"
                >
                  {saving ? (
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
                  onClick={handleBack}
                  disabled={saving}
                  variant="outline"
                  className="w-full sm:w-56 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm sm:text-base font-semibold border-red-500 text-red-600 bg-white hover:bg-red-50 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm transition-transform duração-200 hover:-translate-y-0.5 cursor-pointer"
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
