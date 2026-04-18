import { path_join } from "./path";
import { buildS3ObjectUrl, createS3Client, putObject as putS3Object } from "./s3";
import { files } from "../db/schema";
import { eq } from "drizzle-orm";

type StorageTarget =
  | {
      type: "r2";
      bucket: R2Bucket;
      folder: string;
      publicBaseUrl: string;
    }
  | {
      type: "s3";
      env: Env;
      folder: string;
      publicBaseUrl: string;
    }
  | {
      type: "database";
      env: Env;
      folder: string;
      publicBaseUrl: string;
    };

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function resolveStorageTarget(env: Env): StorageTarget {
  const folder = env.S3_FOLDER || "";
  const publicBaseUrl = trimTrailingSlash(env.S3_ACCESS_HOST || env.S3_ENDPOINT || "");

  // 检查是否使用数据库存储
  if (env.STORAGE_MODE === 'database' || env.CACHE_STORAGE_MODE === 'database') {
    return {
      type: "database",
      env,
      folder,
      publicBaseUrl,
    };
  }

  if (env.R2_BUCKET) {
    return {
      type: "r2",
      bucket: env.R2_BUCKET,
      folder,
      publicBaseUrl,
    };
  }

  if (!env.S3_ENDPOINT) {
    throw new Error("S3_ENDPOINT is not defined");
  }
  if (!env.S3_ACCESS_KEY_ID) {
    throw new Error("S3_ACCESS_KEY_ID is not defined");
  }
  if (!env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3_SECRET_ACCESS_KEY is not defined");
  }
  if (!env.S3_BUCKET) {
    throw new Error("S3_BUCKET is not defined");
  }

  return {
    type: "s3",
    env,
    folder,
    publicBaseUrl,
  };
}

function encodeStorageKey(key: string) {
  return key
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildBlobUrl(storageKey: string, baseUrl?: string) {
  const encodedKey = encodeStorageKey(storageKey);
  const path = `/api/blob/${encodedKey}`;

  if (!baseUrl) {
    return path;
  }

  return `${trimTrailingSlash(baseUrl)}${path}`;
}

function createStorageResponse(object: R2ObjectBody | R2Object, body?: BodyInit | null) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);

  if (object.httpEtag) {
    headers.set("ETag", object.httpEtag);
  }

  if (!headers.has("Content-Length")) {
    headers.set("Content-Length", String(object.size));
  }

  if (!headers.has("Last-Modified")) {
    headers.set("Last-Modified", object.uploaded.toUTCString());
  }

  return new Response(body ?? null, {
    status: 200,
    headers,
  });
}

export async function getStorageObject(env: Env, storageKey: string): Promise<Response | null> {
  const target = resolveStorageTarget(env);

  if (target.type === "database") {
    throw new Error("Database storage requires context. Use getStorageObjectWithContext instead.");
  }

  if (env.R2_BUCKET) {
    const object = await env.R2_BUCKET.get(storageKey);
    if (!object) {
      return null;
    }
    return createStorageResponse(object, object.body);
  }

  const client = createS3Client(env);
  const response = await client.fetch(buildS3ObjectUrl(env, storageKey), {
    method: "GET",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch storage object: ${response.status} ${response.statusText}`);
  }

  return response;
}

// 专门用于有上下文的版本，例如在路由处理器中使用
export async function getStorageObjectWithContext(c: any, storageKey: string): Promise<Response | null> {
  const env = c.get('env');
  const target = resolveStorageTarget(env);

  if (target.type === "database") {
    const db = c.get('db');

    const fileRecord = await db.query.files.findFirst({
      where: eq(files.key, storageKey),
    });

    if (!fileRecord) {
      return null;
    }

    // 解码base64内容
    const buffer = Uint8Array.from(atob(fileRecord.content), c => c.charCodeAt(0));

    // 创建响应
    const headers = new Headers();
    headers.set("Content-Type", fileRecord.mimeType);
    headers.set("Content-Length", String(fileRecord.size));
    headers.set("ETag", `"${fileRecord.updatedAt?.getTime() || Date.now()}"`);
    headers.set("Last-Modified", new Date(fileRecord.updatedAt || Date.now()).toUTCString());

    return new Response(buffer, {
      status: 200,
      headers,
    });
  }

  // 对于非数据库存储，回退到原始实现
  if (env.R2_BUCKET) {
    const object = await env.R2_BUCKET.get(storageKey);
    if (!object) {
      return null;
    }
    return createStorageResponse(object, object.body);
  }

  const client = createS3Client(env);
  const response = await client.fetch(buildS3ObjectUrl(env, storageKey), {
    method: "GET",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch storage object: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function headStorageObject(env: Env, storageKey: string): Promise<Response | null> {
  if (env.R2_BUCKET) {
    const object = await env.R2_BUCKET.head(storageKey);
    if (!object) {
      return null;
    }
    return createStorageResponse(object);
  }

  const client = createS3Client(env);
  const response = await client.fetch(buildS3ObjectUrl(env, storageKey), {
    method: "HEAD",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to inspect storage object: ${response.status} ${response.statusText}`);
  }

  return response;
}

export function getStoragePublicUrl(env: Env, storageKey: string, baseUrl?: string) {
  if (env.S3_ACCESS_HOST) {
    return `${trimTrailingSlash(env.S3_ACCESS_HOST)}/${storageKey}`;
  }

  return buildBlobUrl(storageKey, baseUrl);
}

export async function putStorageObject(
  env: Env,
  key: string,
  body: Blob | ArrayBuffer | Uint8Array | string,
  contentType?: string,
  baseUrl?: string,
) {
  const target = resolveStorageTarget(env);
  const storageKey = path_join(target.folder, key);

  return putStorageObjectAtKey(env, storageKey, body, contentType, baseUrl);
}

// 专门用于有上下文的版本，例如在路由处理器中使用
export async function putStorageObjectWithContext(
  c: any,
  key: string,
  body: Blob | ArrayBuffer | Uint8Array | string,
  contentType?: string,
  baseUrl?: string,
) {
  const env = c.get('env');
  const target = resolveStorageTarget(env);
  const storageKey = path_join(target.folder, key);

  return putStorageObjectAtKeyWithContext(c, storageKey, body, contentType, baseUrl);
}

export async function putStorageObjectAtKey(
  env: Env,
  storageKey: string,
  body: Blob | ArrayBuffer | Uint8Array | string,
  contentType?: string,
  baseUrl?: string,
) {
  const target = resolveStorageTarget(env);

  if (target.type === "database") {
    throw new Error("Database storage requires context. Use putStorageObjectAtKeyWithContext instead.");
  }

  if (env.R2_BUCKET) {
    await env.R2_BUCKET.put(storageKey, body, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  } else {
    const client = createS3Client(env);
    await putS3Object(client, env, storageKey, body, contentType);
  }

  return {
    key: storageKey,
    url: getStoragePublicUrl(env, storageKey, baseUrl),
  };
}

export async function putStorageObjectAtKeyWithContext(
  c: any,
  storageKey: string,
  body: Blob | ArrayBuffer | Uint8Array | string,
  contentType?: string,
  baseUrl?: string,
) {
  const env = c.get('env');
  const target = resolveStorageTarget(env);
  const db = c.get('db');
  const uid = c.get('uid'); // 获取当前用户ID

  if (target.type === "database") {
    // 将文件内容转换为base64编码
    let contentBuffer: ArrayBuffer;
    if (body instanceof Blob) {
      contentBuffer = await body.arrayBuffer();
    } else if (body instanceof ArrayBuffer) {
      contentBuffer = body;
    } else if (body instanceof Uint8Array) {
      const copy = new Uint8Array(body.byteLength);
      copy.set(body);
      contentBuffer = copy.buffer;
    } else if (typeof body === 'string') {
      const encoded = new TextEncoder().encode(body);
      const copy = new Uint8Array(encoded.byteLength);
      copy.set(encoded);
      contentBuffer = copy.buffer;
    } else {
      throw new Error('Unsupported body type for database storage');
    }

    const base64Content = btoa(String.fromCharCode(...new Uint8Array(contentBuffer)));
    const size = contentBuffer.byteLength;

    // 保存到数据库
    await db.insert(files).values({
      key: storageKey,
      filename: storageKey.split('/').pop() || storageKey, // 使用路径的最后一部分作为文件名
      mimeType: contentType || 'application/octet-stream',
      content: base64Content,
      size: size,
      uid: uid, // 关联到当前用户
    });

    return {
      key: storageKey,
      url: getStoragePublicUrl(env, storageKey, baseUrl),
    };
  }

  // 对于非数据库存储，使用原始实现
  if (env.R2_BUCKET) {
    await env.R2_BUCKET.put(storageKey, body, {
      httpMetadata: contentType ? { contentType } : undefined,
    });
  } else {
    const client = createS3Client(env);
    await putS3Object(client, env, storageKey, body, contentType);
  }

  return {
    key: storageKey,
    url: getStoragePublicUrl(env, storageKey, baseUrl),
  };
}
