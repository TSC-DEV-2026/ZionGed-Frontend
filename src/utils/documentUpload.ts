import { z } from "zod";
import type {
  DynamicFieldState,
  FileWithRelativePath,
  FieldSource,
  MapaNomeArquivoItem,
  RegraDetalhe,
  UploadDesktopBatchItemPayload,
  UploadMode,
  UploadSelectedFile,
  UploadTag,
} from "@/types/document-upload";

export const createDocumentSchema = z.object({
  regra_id: z.number().int().positive("Selecione uma regra."),
  modo_tags: z.enum(["manual", "arquivo", "hibrido"]),
  total_arquivos: z.number().int().positive("Selecione ao menos um arquivo PDF."),
});

export function normalizePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").trim();
}

export function splitText(value: string, separator: string): string[] {
  if (separator === "") return [value];
  return value.split(separator);
}

export function extractPartFromFilename(
  fileName: string,
  position: number,
  separator: string
): string {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const parts = splitText(baseName, separator);
  const index = position - 1;

  if (index < 0 || index >= parts.length) return "";
  return parts[index]?.trim() || "";
}

export function extractPartFromFolder(
  relativeFolder: string,
  folderLevel: number,
  position: number,
  separator: string
): string {
  if (!relativeFolder) return "";

  const normalized = normalizePath(relativeFolder);
  if (!normalized) return "";

  const folders = normalized.split("/").filter((item) => item.trim());
  if (!folders.length) return "";

  const folderIndex = folders.length - 1 - folderLevel;
  if (folderIndex < 0 || folderIndex >= folders.length) return "";

  const targetFolder = folders[folderIndex];
  const parts = splitText(targetFolder, separator);
  const partIndex = position - 1;

  if (partIndex < 0 || partIndex >= parts.length) return "";
  return parts[partIndex]?.trim() || "";
}

export function getEffectiveFieldSource(
  mode: UploadMode,
  source: FieldSource
): FieldSource {
  if (mode === "manual") return "manual";
  if (mode === "arquivo" && source === "manual") return "arquivo";
  return source;
}

export function buildDynamicFieldsFromRule(
  rule: RegraDetalhe
): DynamicFieldState[] {
  const sortedFields = [...(rule.campos || [])].sort(
    (a, b) => (a.ordem || 0) - (b.ordem || 0)
  );

  return sortedFields.map((campo, index) => ({
    campo,
    origem: "manual",
    valor_manual: "",
    posicao: String(campo.posicao_nome ?? campo.ordem ?? index + 1),
    separador: "_",
    pasta_nivel: "0",
  }));
}

export function coerceSelectedFiles(files: File[]): UploadSelectedFile[] {
  const accepted = files.filter((file) =>
    file.name.toLowerCase().endsWith(".pdf")
  );

  const uniqueMap = new Map<string, UploadSelectedFile>();

  accepted.forEach((file, index) => {
    const fileWithRelative = file as FileWithRelativePath;
    const normalizedRelativePath = normalizePath(
      fileWithRelative.webkitRelativePath || ""
    );

    let pasta_relativa = "";
    let display = file.name;

    if (normalizedRelativePath) {
      const pathParts = normalizedRelativePath.split("/").filter(Boolean);
      display = normalizedRelativePath;

      if (pathParts.length > 1) {
        pasta_relativa = normalizePath(pathParts.slice(0, -1).join("/"));
      }
    }

    const dedupeKey = `${display}::${file.size}::${file.lastModified}`;

    if (!uniqueMap.has(dedupeKey)) {
      uniqueMap.set(dedupeKey, {
        id: `${Date.now()}-${index}-${file.lastModified}`,
        file,
        display,
        pasta_relativa,
      });
    }
  });

  return Array.from(uniqueMap.values());
}

export function mergeSelectedFiles(
  currentFiles: UploadSelectedFile[],
  incomingFiles: UploadSelectedFile[]
): UploadSelectedFile[] {
  const map = new Map<string, UploadSelectedFile>();

  [...currentFiles, ...incomingFiles].forEach((item) => {
    const key = `${item.display}::${item.file.size}::${item.file.lastModified}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

export function buildTagsForFile(
  item: UploadSelectedFile,
  mode: UploadMode,
  dynamicFields: DynamicFieldState[]
): {
  tags: UploadTag[];
  mapa_nome_arquivo: MapaNomeArquivoItem[];
} {
  const tags: UploadTag[] = [];
  const mapa_nome_arquivo: MapaNomeArquivoItem[] = [];

  for (const field of dynamicFields) {
    const chaveTag = (field.campo.chave_tag || "").trim();
    if (!chaveTag) continue;

    const origem = getEffectiveFieldSource(mode, field.origem);
    const valorManual = field.valor_manual.trim();
    const separator = field.separador ?? "_";

    const position = Number.parseInt(field.posicao || "1", 10);
    if (!Number.isFinite(position) || position < 1) {
      throw new Error(`Posição inválida para a tag "${chaveTag}".`);
    }

    const folderLevel = Number.parseInt(field.pasta_nivel || "0", 10);
    if (!Number.isFinite(folderLevel) || folderLevel < 0) {
      throw new Error(`Nível de pasta inválido para a tag "${chaveTag}".`);
    }

    let autoValue = "";

    if (origem === "arquivo") {
      autoValue = extractPartFromFilename(item.file.name, position, separator);
    } else if (origem === "pasta") {
      autoValue = extractPartFromFolder(
        item.pasta_relativa,
        folderLevel,
        position,
        separator
      );
    } else {
      autoValue = valorManual;
    }

    let finalValue = "";

    if (mode === "manual") {
      finalValue = valorManual;
    } else if (mode === "arquivo") {
      finalValue = autoValue;
    } else {
      finalValue = valorManual || autoValue;
    }

    if (finalValue) {
      tags.push({
        chave: chaveTag,
        valor: finalValue,
      });
    }

    mapa_nome_arquivo.push({
      chave: chaveTag,
      origem,
      posicao: position,
      separador: separator,
      pasta_nivel: folderLevel,
      valor_manual: valorManual || null,
    });
  }

  return { tags, mapa_nome_arquivo };
}

export function validateRequiredFieldsPreview(
  rule: RegraDetalhe,
  mode: UploadMode,
  dynamicFields: DynamicFieldState[],
  files: UploadSelectedFile[]
): string[] {
  if (!rule.campos?.length || !files.length) return [];

  const errors: string[] = [];

  for (const file of files) {
    for (const field of dynamicFields) {
      if (!field.campo.obrigatorio) continue;

      const { tags } = buildTagsForFile(file, mode, [field]);
      const found = tags.find(
        (tag) => tag.chave === field.campo.chave_tag && tag.valor.trim() !== ""
      );

      if (!found) {
        errors.push(
          `${file.display}: campo obrigatório "${field.campo.nome_campo}" (${field.campo.chave_tag}) não foi preenchido`
        );
      }
    }
  }

  return errors;
}

export function buildBatchItemsPayload(
  files: UploadSelectedFile[],
  mode: UploadMode,
  dynamicFields: DynamicFieldState[]
): UploadDesktopBatchItemPayload[] {
  return files.map((item) => {
    const { tags, mapa_nome_arquivo } = buildTagsForFile(
      item,
      mode,
      dynamicFields
    );

    return {
      client_file_name: item.display || item.file.name,
      pasta_relativa: item.pasta_relativa || "",
      tags,
      mapa_nome_arquivo,
    };
  });
}