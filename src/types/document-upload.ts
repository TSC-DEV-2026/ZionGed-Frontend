export type UploadMode = "manual" | "arquivo" | "hibrido";
export type FieldSource = "manual" | "arquivo" | "pasta";

export type RegraCampo = {
  id: number;
  regra_id: number;
  nome_campo: string;
  chave_tag: string;
  tipo: string;
  obrigatorio: boolean;
  ordem: number;
  posicao_nome: number | null;
  placeholder: string | null;
  mascara: string | null;
};

export type RegraResumo = {
  id: number;
  user_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type RegraDetalhe = RegraResumo & {
  campos: RegraCampo[];
};

export type DynamicFieldState = {
  campo: RegraCampo;
  origem: FieldSource;
  valor_manual: string;
  posicao: string;
  separador: string;
  pasta_nivel: string;
};

export type UploadSelectedFile = {
  id: string;
  file: File;
  display: string;
  pasta_relativa: string;
};

export type UploadTag = {
  chave: string;
  valor: string;
};

export type MapaNomeArquivoItem = {
  chave: string;
  origem: FieldSource;
  posicao: number;
  separador: string;
  pasta_nivel: number;
  valor_manual: string | null;
};

export type UploadDesktopBatchItemPayload = {
  client_file_name: string;
  pasta_relativa: string;
  tags: UploadTag[];
  mapa_nome_arquivo: MapaNomeArquivoItem[];
};

export type UploadDesktopBatchPayload = {
  user_id: number;
  regra_id: number;
  modo_tags: UploadMode;
  itens: UploadDesktopBatchItemPayload[];
};

export type UploadDesktopBatchItemResult = {
  client_file_name: string;
  sucesso: boolean;
  documento_id?: number | null;
  uuid?: string | null;
  filename?: string | null;
  filepath?: string | null;
  bucket_key?: string | null;
  erro?: string | null;
};

export type UploadDesktopBatchResponse = {
  message: string;
  user_id: number;
  regra_id: number;
  total_recebidos: number;
  total_processados: number;
  total_sucesso: number;
  total_erro: number;
  resultados: UploadDesktopBatchItemResult[];
};

export type FileWithRelativePath = File;