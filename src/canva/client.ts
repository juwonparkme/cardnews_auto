import { readFile } from "node:fs/promises";
import path from "node:path";

import { getCanvaAccessToken } from "./auth.js";
import type { CanvaAutofillData, CanvaExportResult, CanvaRenderResult } from "../types.js";

type CanvaDatasetResponse = {
  dataset?: {
    fields?: Record<string, { type: string }>;
  };
};

type CanvaAssetUploadJobResponse = {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    asset?: {
      id: string;
      name?: string;
    };
    error?: {
      message?: string;
    };
  };
};

type CanvaAutofillJobResponse = {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    result?: {
      design: {
        id: string;
        title?: string;
        url?: string;
        thumbnail?: { url?: string };
        urls?: {
          edit_url?: string;
          view_url?: string;
        };
      };
    };
    error?: {
      message?: string;
    };
  };
};

type CanvaExportJobResponse = {
  job: {
    id: string;
    status: "in_progress" | "success" | "failed";
    result?: {
      urls?: string[];
      download_urls?: string[];
    };
    error?: {
      message?: string;
    };
  };
};

export class CanvaClient {
  private readonly baseUrl = "https://api.canva.com/rest/v1";

  async getBrandTemplateDataset(brandTemplateId: string): Promise<Record<string, { type: string }>> {
    const response = await this.request<CanvaDatasetResponse>(`/brand-templates/${brandTemplateId}/dataset`);
    return response.dataset?.fields ?? {};
  }

  async uploadAsset(filePath: string): Promise<string> {
    const body = await readFile(filePath);
    const fileName = path.basename(filePath);
    const metadata = Buffer.from(
      JSON.stringify({
        name_base64: Buffer.from(fileName).toString("base64"),
      }),
    ).toString("base64");

    const created = await this.request<CanvaAssetUploadJobResponse>("/asset-uploads", {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "asset-upload-metadata": metadata,
      },
      body,
    });

    const jobId = created.job.id;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const current = await this.request<CanvaAssetUploadJobResponse>(`/asset-uploads/${jobId}`);

      if (current.job.status === "success" && current.job.asset?.id) {
        return current.job.asset.id;
      }

      if (current.job.status === "failed") {
        throw new Error(`Canva asset upload 실패: ${current.job.error?.message ?? "unknown error"}`);
      }

      await delay(1000);
    }

    throw new Error("Canva asset upload timeout");
  }

  async createAutofillJob(
    brandTemplateId: string,
    title: string,
    data: CanvaAutofillData,
  ): Promise<CanvaRenderResult> {
    const created = await this.request<CanvaAutofillJobResponse>("/autofills", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        brand_template_id: brandTemplateId,
        title,
        data,
      }),
    });

    const jobId = created.job.id;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const current = await this.request<CanvaAutofillJobResponse>(`/autofills/${jobId}`);

      if (current.job.status === "success" && current.job.result?.design) {
        const design = current.job.result.design;

        return {
          designId: design.id,
          designTitle: design.title,
          editUrl: design.urls?.edit_url,
          viewUrl: design.urls?.view_url,
          designUrl: design.url,
          thumbnailUrl: design.thumbnail?.url,
          jobId,
        };
      }

      if (current.job.status === "failed") {
        throw new Error(`Canva autofill 실패: ${current.job.error?.message ?? "unknown error"}`);
      }

      await delay(1500);
    }

    throw new Error("Canva autofill timeout");
  }

  async createPdfExportJob(designId: string): Promise<CanvaExportResult> {
    const created = await this.request<CanvaExportJobResponse>("/exports", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        design_id: designId,
        format: {
          type: "pdf",
        },
      }),
    });

    const jobId = created.job.id;

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const current = await this.request<CanvaExportJobResponse>(`/exports/${jobId}`);
      const downloadUrl = current.job.result?.download_urls?.[0] ?? current.job.result?.urls?.[0];

      if (current.job.status === "success" && downloadUrl) {
        return {
          jobId,
          downloadUrl,
        };
      }

      if (current.job.status === "failed") {
        throw new Error(`Canva export 실패: ${current.job.error?.message ?? "unknown error"}`);
      }

      await delay(1500);
    }

    throw new Error("Canva export timeout");
  }

  private async request<T>(pathname: string, init: RequestInit = {}, forceRefresh = false): Promise<T> {
    const accessToken = await getCanvaAccessToken({ forceRefresh });
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
      signal: init.signal ?? AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const body = await response.text();

      if (!forceRefresh && response.status === 401 && isRetriableTokenError(body)) {
        return this.request(pathname, init, true);
      }

      throw new Error(`Canva API 실패 ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableTokenError(body: string): boolean {
  return body.includes("invalid_access_token") || body.includes("revoked_access_token");
}
