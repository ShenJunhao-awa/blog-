import { AwsClient } from "aws4fetch";
import { path_join } from "./path";

export function createS3Client(env: Env): AwsClient {
    const accessKeyId = env.S3_ACCESS_KEY_ID;
    const secretAccessKey = env.S3_SECRET_ACCESS_KEY;

    if (!accessKeyId) {
        throw new Error("S3_ACCESS_KEY_ID is not defined");
    }
    if (!secretAccessKey) {
        throw new Error("S3_SECRET_ACCESS_KEY is not defined");
    }
    
    return new AwsClient({
        accessKeyId,
        secretAccessKey,
        service: "s3",
    });
}

export async function putObject(
    client: AwsClient,
    env: Env,
    key: string,
    body: Blob | ArrayBuffer | Uint8Array | string,
    contentType?: string
) {
    const endpoint = env.S3_ENDPOINT;
    const bucket = env.S3_BUCKET;
    const forcePathStyle = env.S3_FORCE_PATH_STYLE === 'true';

    if (!endpoint) {
        throw new Error("S3_ENDPOINT is not defined");
    }
    if (!bucket) {
        throw new Error("S3_BUCKET is not defined");
    }

    // Construct URL based on path-style or virtual-hosted style
    let url: string;
    if (forcePathStyle) {
        url = path_join(endpoint, bucket, key);
    } else {
        // Virtual-hosted style: https://bucket.endpoint/key
        const urlObj = new URL(endpoint);
        url = `${urlObj.protocol}//${bucket}.${urlObj.host}/${key}`;
    }
    
    const headers: Record<string, string> = {};
    if (contentType) {
        headers["Content-Type"] = contentType;
    }
    
    const response = await client.fetch(url, {
        method: "PUT",
        body: body as BodyInit,
        headers,
    });
    
    if (!response.ok) {
        throw new Error(`Failed to upload to S3: ${response.status} ${response.statusText}`);
    }
    
    return response;
}

export function buildS3ObjectUrl(env: Env, key: string): string {
    const endpoint = env.S3_ENDPOINT;
    const bucket = env.S3_BUCKET;
    const forcePathStyle = env.S3_FORCE_PATH_STYLE === 'true';

    if (!endpoint) {
        throw new Error("S3_ENDPOINT is not defined");
    }
    if (!bucket) {
        throw new Error("S3_BUCKET is not defined");
    }

    if (forcePathStyle) {
        return path_join(endpoint, bucket, key);
    }

    const urlObj = new URL(endpoint);
    return `${urlObj.protocol}//${bucket}.${urlObj.host}/${key}`;
}
