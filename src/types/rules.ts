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

export type RegraCampoPayload = {
  nome_campo: string;
  chave_tag: string;
  tipo: string;
  obrigatorio: boolean;
  ordem: number;
  posicao_nome: number | null;
  placeholder: string | null;
  mascara: string | null;
};

export type RegraPayload = {
  user_id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  campos: RegraCampoPayload[];
};

export type RegraFormCampo = {
  id: string;
  nome_campo: string;
  chave_tag: string;
  tipo: string;
  obrigatorio: boolean;
  ordem: string;
  posicao_nome: string;
  placeholder: string;
  mascara: string;
};

export type RegraFormValues = {
  nome: string;
  descricao: string;
  ativo: boolean;
  campos: RegraFormCampo[];
};