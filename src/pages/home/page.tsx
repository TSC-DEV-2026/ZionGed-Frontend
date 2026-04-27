import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/header";
import ImagePasta from "@/assets/Rectangle 8.jpg";
import SearchInput, {
  type DocumentRecord,
  type SearchFilters,
} from "@/components/search-input";
import Footer from "@/components/footer";
import SideMenu from "@/components/side-menu";
import { useUser } from "@/contexts/UserContext";
import {
  Download,
  Loader2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/utils/axiosInstance";

type PaginationMeta = {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
};

type DocumentoSearchResponse = {
  items: DocumentRecord[];
  meta: PaginationMeta;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildPageList(current: number, total: number) {
  if (total <= 0) return [];

  const pages: (number | "...")[] = [];
  const start = clamp(current, 1, total);
  const end = Math.min(total, start + 2);

  for (let p = start; p <= end; p++) pages.push(p);

  if (end < total) pages.push("...");

  return pages;
}

export default function Home() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [results, setResults] = useState<DocumentRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(
    null
  );

  const [filters, setFilters] = useState<SearchFilters>({});
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pessoaId = user?.pessoa?.id ?? null;

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const datePart = iso.slice(0, 10);
    const [year, month, day] = datePart.split("-");
    if (!year || !month || !day) return datePart;
    return `${day}-${month}-${year}`;
  };

  const fetchDocuments = useCallback(
    async (f: SearchFilters = {}, p: number = 1, ps: number = 10) => {
      setIsSearching(true);

      try {
        const params: Record<string, unknown> = {
          page: p,
          page_size: ps,
        };

        if (f.user_id) params.user_id = f.user_id;
        if (f.cliente_id) params.cliente_id = f.cliente_id;
        if (f.q) params.q = f.q;
        if (f.tag_chave) params.tag_chave = f.tag_chave;
        if (f.tag_valor) params.tag_valor = f.tag_valor;

        const res = await api.get<DocumentoSearchResponse>("/documents/search", {
          params,
        });

        setResults(res.data.items ?? []);
        setMeta(res.data.meta ?? null);
        setFilters(f);
        setPage(res.data.meta?.page ?? p);
        setPageSize(res.data.meta?.page_size ?? ps);
      } catch (err) {
        console.error("Erro ao buscar documentos", err);
        toast.error("Não foi possível buscar documentos. Tente novamente.");
        setResults([]);
        setMeta(null);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!pessoaId) return;

    fetchDocuments(
      {
        user_id: pessoaId,
      },
      1,
      pageSize
    );
  }, [pessoaId, fetchDocuments, pageSize]);

  const handleSearch = useCallback(
    async (f: SearchFilters) => {
      await fetchDocuments(f, 1, pageSize);
    },
    [fetchDocuments, pageSize]
  );

  const goToPage = useCallback(
    async (p: number) => {
      if (!meta) return;

      const total = meta.total_pages || 1;
      const safe = clamp(p, 1, total);

      await fetchDocuments(filters, safe, pageSize);
    },
    [fetchDocuments, filters, meta, pageSize]
  );

  const changePageSize = useCallback(
    async (ps: number) => {
      setPageSize(ps);
      await fetchDocuments(filters, 1, ps);
    },
    [fetchDocuments, filters]
  );

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      setDownloadingId(doc.id);

      const res = await api.get(`/documents/${doc.uuid}/download`, {
        responseType: "blob",
      });

      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = doc.filename ?? "documento.pdf";

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao baixar documento", err);
      toast.error("Não foi possível baixar o documento. Tente novamente.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEdit = (doc: DocumentRecord) => {
    navigate(`/documents/${doc.uuid}/edit`, { state: { doc } });
  };

  const deleteDocument = async (doc: DocumentRecord) => {
    try {
      await api.delete(`/documents/${doc.uuid}/delete`);
      setResults((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success("Documento excluído com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir documento", err);
      toast.error("Não foi possível excluir o documento. Tente novamente.");
    }
  };

  const handleDelete = (doc: DocumentRecord) => {
    const created = formatDate(doc.criado_em);

    toast("Deseja realmente excluir este documento?", {
      description: `${doc.filename || "Documento"} criado em ${created}.`,
      action: {
        label: "Excluir",
        onClick: () => deleteDocument(doc),
      },
      dismissible: true,
      style: {
        backgroundColor: "#dea003",
        color: "#fff",
        border: "none",
      },
    });
  };

  const totalPages = meta?.total_pages ?? 0;

  const pageList = useMemo(
    () => buildPageList(page, totalPages),
    [page, totalPages]
  );

  const showPagination = Boolean(meta && meta.total_pages > 1);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <Header />

      <div>
        <SideMenu topClass="top-20" />
      </div>

      <main className="flex-1">
        <section className="relative w-full pb-16 sm:pb-20 md:pb-24 lg:pb-28">
          <img
            src={ImagePasta}
            alt="imagem de uma pessoa segurando uma pasta"
            className="w-full h-[220px] md:h-[260px] lg:h-[300px] object-cover select-none"
          />

          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[85%] md:w-[70%] max-w-3xl px-3">
            <SearchInput
              onSearch={handleSearch}
              onSearchingChange={setIsSearching}
            />
          </div>
        </section>

        <section className="w-full max-w-5xl mx-auto px-4 pb-12 mt-6 sm:mt-4">
          {isSearching && (
            <p className="mb-4 text-sm text-slate-600">
              Buscando documentos, aguarde...
            </p>
          )}

          {!isSearching && results.length === 0 && (
            <p className="mb-4 text-sm text-slate-500">
              Nenhum documento encontrado.
            </p>
          )}

          {results.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b text-sm text-slate-700">
                {meta ? (
                  <>
                    Foram encontrados <b>{meta.total_items}</b> documentos.
                  </>
                ) : (
                  <>Foram encontrados {results.length} documentos.</>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-slate-700">
                        Nome do arquivo
                      </th>
                      <th className="text-left px-6 py-3 font-semibold text-slate-700">
                        Data de criação
                      </th>
                      <th className="text-right px-32 py-3 font-semibold text-slate-700">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.map((doc) => {
                      const isThisDownloading = downloadingId === doc.id;

                      return (
                        <tr
                          key={doc.id}
                          className="border-t hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-3">{doc.filename || "—"}</td>

                          <td className="px-6 py-3">
                            {formatDate(doc.criado_em)}
                          </td>

                          <td className="px-6 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownload(doc)}
                                disabled={isThisDownloading}
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isThisDownloading ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Baixando...
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4" />
                                    Baixar
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEdit(doc)}
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-slate-200 text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDelete(doc)}
                                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {meta && (
                <div className="px-4 sm:px-6 py-4 border-t">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <div className="flex items-center gap-2">
                        {[5, 10, 20].map((n) => {
                          const active = pageSize === n;

                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => changePageSize(n)}
                              disabled={isSearching}
                              className={[
                                "h-9 w-10 rounded-md border text-sm transition-colors hover:cursor-pointer",
                                active
                                  ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                                isSearching
                                  ? "opacity-60 cursor-not-allowed"
                                  : "",
                              ].join(" ")}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-xs sm:text-sm text-slate-500 lg:hidden">
                        Página <b className="text-slate-700">{meta.page}</b> de{" "}
                        <b className="text-slate-700">{meta.total_pages}</b> (
                        {meta.total_items} itens)
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => goToPage(page - 1)}
                        disabled={!meta.has_prev || isSearching}
                        className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {showPagination && (
                        <div className="flex-1 overflow-x-auto">
                          <div className="flex items-center gap-1 min-w-max px-1">
                            {pageList.map((p, idx) => {
                              if (p === "...") {
                                return (
                                  <span
                                    key={`dots-${idx}`}
                                    className="px-2 text-slate-400"
                                  >
                                    ...
                                  </span>
                                );
                              }

                              const active = p === page;

                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => goToPage(p)}
                                  disabled={isSearching}
                                  className={[
                                    "h-9 min-w-9 px-3 rounded-md border text-sm transition-colors whitespace-nowrap hover:cursor-pointer",
                                    active
                                      ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50",
                                    isSearching
                                      ? "opacity-60 cursor-not-allowed"
                                      : "",
                                  ].join(" ")}
                                >
                                  {p}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => goToPage(page + 1)}
                        disabled={!meta.has_next || isSearching}
                        className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="hidden lg:block text-sm text-slate-500">
                      Página <b className="text-slate-700">{meta.page}</b> de{" "}
                      <b className="text-slate-700">{meta.total_pages}</b> (
                      {meta.total_items} itens)
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}