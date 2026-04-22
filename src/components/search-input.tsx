import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import api from "@/utils/axiosInstance";

export interface DocumentTag {
  id: number;
  chave: string;
  valor: string;
}

export interface DocumentRecord {
  id: number;
  uuid: string;
  cliente_id: number;
  bucket_key: string;
  filename: string;
  content_type: string;
  tamanho_bytes: number;
  hash_sha256: string;
  criado_em: string;
  tags: DocumentTag[];
}

export type SearchFilters = {
  cliente_id?: number | null;
  tag_chave?: string | null;
  tag_valor?: string | null;
  q?: string | null;
};

type SearchInputProps = {
  onSearch?: (filters: SearchFilters) => void | Promise<void>;
  onSearchingChange?: (isSearching: boolean) => void;
};

const FREE_SEARCH_KEY = "__free_search__";


function normalizeTagsResponse(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (
    data &&
    typeof data === "object" &&
    "tags" in data &&
    Array.isArray((data as { tags?: unknown }).tags)
  ) {
    return (data as { tags: unknown[] }).tags
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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

export default function SearchInput({
  onSearch,
  onSearchingChange,
}: SearchInputProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>(FREE_SEARCH_KEY);
  const [loadingTags, setLoadingTags] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchTags = async () => {
      try {
        setLoadingTags(true);
        setError(null);

        const res = await api.get("/documents/tags");
        const tags = normalizeTagsResponse(res.data);

        setTagOptions(tags);

        // Sempre iniciar em busca livre
        setSelectedTag(FREE_SEARCH_KEY);
      } catch (err) {
        console.error("Erro ao carregar tags", err);
        setError("Não foi possível carregar as opções de pesquisa.");
        setSelectedTag(FREE_SEARCH_KEY);
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  useEffect(() => {
    setSearchQuery("");
    setError(null);
  }, [selectedTag]);

  useEffect(() => {
    onSearchingChange?.(searching);
  }, [searching, onSearchingChange]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const value = searchQuery.trim();
    if (!value || !selectedTag) return;

    setError(null);
    setSearching(true);

    try {
      if (selectedTag === FREE_SEARCH_KEY) {
        await onSearch?.({
          q: value,
        });
        return;
      }

      await onSearch?.({
        tag_chave: selectedTag,
        tag_valor: value,
      });
    } catch (err) {
      console.error("Erro ao pesquisar", err);
      setError("Não foi possível realizar a pesquisa.");
    } finally {
      setSearching(false);
    }
  };

  const placeholder = useMemo(() => {
    if (selectedTag === FREE_SEARCH_KEY) return "Digite para pesquisar";
    return "Digite o valor";
  }, [selectedTag]);

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch bg-white rounded-xl shadow-xl overflow-hidden">
        <Select
          value={selectedTag}
          onValueChange={(value) => setSelectedTag(value)}
          disabled={loadingTags}
        >
          <SelectTrigger
            className="
              w-full sm:w-auto sm:min-w-[180px]
              bg-[#f3f3f3]
              px-4
              py-7 sm:py-13
              text-sm md:text-base
              text-[#000000]
              border-0 shadow-none rounded-none
              focus:ring-0 focus:ring-offset-0 focus:outline-none
              data-placeholder:text-slate-400
              cursor-pointer
            "
          >
            <SelectValue
              placeholder={loadingTags ? "Carregando..." : "Campo de pesquisa"}
            />
          </SelectTrigger>

          <SelectContent>
            <SelectItem className="cursor-pointer" value={FREE_SEARCH_KEY}>
              Busca livre
            </SelectItem>

            {tagOptions.map((tag) => (
              <SelectItem className="cursor-pointer" key={tag} value={tag}>
                {formatTagLabel(tag)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex w-full items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="
                peer w-full
                px-4 py-4 text-sm
                sm:px-6 sm:py-10 md:text-base
                text-[#000000] placeholder:text-[#b1b0b0]
                focus:outline-none bg-transparent
              "
              disabled={loadingTags}
            />

            <span
              className="
                pointer-events-none absolute
                left-4 right-3 bottom-3 h-0.5
                sm:left-6 sm:right-4 sm:bottom-9
                bg-[#D9D9D9] peer-focus:bg-[#b1b0b0] transition-colors
              "
            />
          </div>

          <button
            type="submit"
            disabled={searching || loadingTags}
            className="w-20 sm:w-36 bg-linear-to-r from-[#42F51F] via-[#48cf3e] to-[#318844] hover:to-green-800 hover:from-green-300 hover:via-green-500 text-white flex flex-col items-center justify-center gap-1 hover:cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Search className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.4} />
            <span className="text-[10px] md:text-xs tracking-wide">
              {searching ? "Buscando..." : "Pesquisar"}
            </span>
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs sm:text-sm text-red-600">{error}</p>}
    </form>
  );
}