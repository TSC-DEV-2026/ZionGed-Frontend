import api from "@/utils/axiosInstance";
import type {
  UploadDesktopBatchPayload,
  UploadDesktopBatchResponse,
} from "@/types/document-upload";

export async function uploadDesktopBatch(
  payload: UploadDesktopBatchPayload,
  files: File[]
): Promise<UploadDesktopBatchResponse> {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));

  for (const file of files) {
    formData.append("files", file, file.name);
  }

  const response = await api.post<UploadDesktopBatchResponse>(
    "/documents-desktop/upload-massa",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}