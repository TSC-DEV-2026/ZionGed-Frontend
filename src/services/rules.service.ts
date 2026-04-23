import api from "@/utils/axiosInstance";
import type { RegraDetalhe, RegraPayload, RegraResumo } from "@/types/rules";

export async function listRules(userId: number): Promise<RegraResumo[]> {
  const response = await api.get<RegraResumo[]>("/regras/", {
    params: { user_id: userId },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getRuleDetail(regraId: number): Promise<RegraDetalhe> {
  const response = await api.get<RegraDetalhe>(`/regras/${regraId}`);
  return response.data;
}

export async function createRule(payload: RegraPayload): Promise<RegraDetalhe> {
  const response = await api.post<RegraDetalhe>("/regras/", payload);
  return response.data;
}

export async function updateRule(
  regraId: number,
  payload: RegraPayload
): Promise<RegraDetalhe> {
  const response = await api.put<RegraDetalhe>(`/regras/${regraId}`, payload);
  return response.data;
}

export async function deleteRule(regraId: number): Promise<void> {
  await api.delete(`/regras/${regraId}`);
}