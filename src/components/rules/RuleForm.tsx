import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Save, Trash2 } from "lucide-react";
import type {
  RegraCampo,
  RegraFormCampo,
  RegraFormValues,
  RegraPayload,
} from "@/types/rules";

type RuleFormProps = {
  userId: number;
  initialData?: {
    nome: string;
    descricao: string | null;
    ativo: boolean;
    campos: RegraCampo[];
  };
  submitLabel?: string;
  saving?: boolean;
  onSubmit: (payload: RegraPayload) => Promise<void>;
};

const TIPOS_CAMPO = [
  "text",
  "string",
  "number",
  "date",
  "cpf",
  "cnpj",
  "competencia",
];

function createEmptyField(order: number): RegraFormCampo {
  return {
    id: crypto.randomUUID(),
    nome_campo: "",
    chave_tag: "",
    tipo: "text",
    obrigatorio: false,
    ordem: String(order),
    posicao_nome: "",
    placeholder: "",
    mascara: "",
  };
}

function mapInitialFields(fields: RegraCampo[]): RegraFormCampo[] {
  if (!fields.length) {
    return [createEmptyField(1)];
  }

  return [...fields]
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    .map((field, index) => ({
      id: `${field.id}-${index}`,
      nome_campo: field.nome_campo || "",
      chave_tag: field.chave_tag || "",
      tipo: field.tipo || "text",
      obrigatorio: !!field.obrigatorio,
      ordem: String(field.ordem ?? index + 1),
      posicao_nome:
        field.posicao_nome === null || field.posicao_nome === undefined
          ? ""
          : String(field.posicao_nome),
      placeholder: field.placeholder || "",
      mascara: field.mascara || "",
    }));
}

function validateForm(form: RegraFormValues): string[] {
  const errors: string[] = [];

  if (!form.nome.trim()) {
    errors.push("Informe o nome da regra.");
  }

  if (!form.campos.length) {
    errors.push("Adicione ao menos um campo na regra.");
  }

  const tagKeys = new Set<string>();

  form.campos.forEach((field, index) => {
    const line = index + 1;

    if (!field.nome_campo.trim()) {
      errors.push(`Linha ${line}: informe o nome do campo.`);
    }

    if (!field.chave_tag.trim()) {
      errors.push(`Linha ${line}: informe a chave da tag.`);
    }

    if (field.chave_tag.trim()) {
      const normalizedTag = field.chave_tag.trim().toLowerCase();

      if (tagKeys.has(normalizedTag)) {
        errors.push(
          `Linha ${line}: a chave_tag "${field.chave_tag}" está repetida.`
        );
      }

      tagKeys.add(normalizedTag);
    }

    if (!field.ordem.trim()) {
      errors.push(`Linha ${line}: informe a ordem.`);
    } else {
      const ordem = Number(field.ordem);

      if (!Number.isInteger(ordem) || ordem < 1) {
        errors.push(
          `Linha ${line}: ordem deve ser um inteiro maior ou igual a 1.`
        );
      }
    }

    if (field.posicao_nome.trim()) {
      const posicao = Number(field.posicao_nome);

      if (!Number.isInteger(posicao) || posicao < 1) {
        errors.push(
          `Linha ${line}: posicao_nome deve ser um inteiro maior ou igual a 1.`
        );
      }
    }
  });

  return errors;
}

export default function RuleForm({
  userId,
  initialData,
  submitLabel = "Salvar regra",
  saving = false,
  onSubmit,
}: RuleFormProps) {
  const [form, setForm] = useState<RegraFormValues>({
    nome: initialData?.nome || "",
    descricao: initialData?.descricao || "",
    ativo: initialData?.ativo ?? true,
    campos: mapInitialFields(initialData?.campos || []),
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const updateField = (index: number, patch: Partial<RegraFormCampo>) => {
    setForm((current) => ({
      ...current,
      campos: current.campos.map((item, idx) =>
        idx === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const addField = () => {
    setForm((current) => ({
      ...current,
      campos: [...current.campos, createEmptyField(current.campos.length + 1)],
    }));
  };

  const removeField = (id: string) => {
    setForm((current) => {
      const next = current.campos.filter((item) => item.id !== id);

      return {
        ...current,
        campos: next.length ? next : [createEmptyField(1)],
      };
    });
  };

  const normalizePayload = (): RegraPayload => {
    return {
      user_id: userId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      ativo: form.ativo,
      campos: form.campos.map((field, index) => ({
        nome_campo: field.nome_campo.trim(),
        chave_tag: field.chave_tag.trim(),
        tipo: field.tipo.trim() || "text",
        obrigatorio: field.obrigatorio,
        ordem: Number(field.ordem || index + 1),
        posicao_nome: field.posicao_nome.trim()
          ? Number(field.posicao_nome)
          : null,
        placeholder: field.placeholder.trim() || null,
        mascara: field.mascara.trim() || null,
      })),
    };
  };

  const handleSubmit = async () => {
    const errors = validateForm(form);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    await onSubmit(normalizePayload());
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome da regra
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) =>
                setForm((current) => ({ ...current, nome: e.target.value }))
              }
              className="w-full rounded-xl bg-white border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ex.: Holerite padrão"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) =>
                  setForm((current) => ({ ...current, ativo: e.target.checked }))
                }
                className="h-4 w-4"
              />
              Regra ativa
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Descrição
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) =>
              setForm((current) => ({ ...current, descricao: e.target.value }))
            }
            className="w-full min-h-[100px] rounded-xl bg-white border border-slate-300 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            placeholder="Descreva a finalidade desta regra"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">
              Campos / Tags da regra
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Aqui você define quais tags existirão para a regra e como cada
              campo será tratado no upload.
            </p>
          </div>

          <Button
            type="button"
            onClick={addField}
            className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Adicionar campo
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1300px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nome campo</th>
                <th className="px-4 py-3">Chave tag</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Obrigatório</th>
                <th className="px-4 py-3">Ordem</th>
                <th className="px-4 py-3">Posição nome</th>
                <th className="px-4 py-3">Placeholder</th>
                <th className="px-4 py-3">Máscara</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>

            <tbody>
              {form.campos.map((field, index) => (
                <tr
                  key={field.id}
                  className="border-t border-slate-100 align-top"
                >
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={field.nome_campo}
                      onChange={(e) =>
                        updateField(index, { nome_campo: e.target.value })
                      }
                      className="w-[200px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={field.chave_tag}
                      onChange={(e) =>
                        updateField(index, { chave_tag: e.target.value })
                      }
                      className="w-[180px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <Select
                      value={field.tipo}
                      onValueChange={(value) =>
                        updateField(index, { tipo: value })
                      }
                    >
                      <SelectTrigger className="w-[150px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_CAMPO.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={field.obrigatorio}
                        onChange={(e) =>
                          updateField(index, { obrigatorio: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      Sim
                    </label>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={field.ordem}
                      onChange={(e) =>
                        updateField(index, { ordem: e.target.value })
                      }
                      className="w-[90px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={field.posicao_nome}
                      onChange={(e) =>
                        updateField(index, { posicao_nome: e.target.value })
                      }
                      className="w-[120px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={field.placeholder}
                      onChange={(e) =>
                        updateField(index, { placeholder: e.target.value })
                      }
                      className="w-[200px] rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={field.mascara}
                      onChange={(e) =>
                        updateField(index, { mascara: e.target.value })
                      }
                      className="w-40 rounded-xl bg-white border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeField(field.id)}
                      className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {validationErrors.length > 0 ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
          <h3 className="text-sm font-semibold text-red-800">
            Inconsistências encontradas
          </h3>
          <div className="mt-2 space-y-1 text-sm text-red-700">
            {validationErrors.map((issue, index) => (
              <div key={index}>• {issue}</div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Save className="w-4 h-4" />
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}