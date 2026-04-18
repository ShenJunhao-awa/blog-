import type { QueueTask } from "./queue";

declare global {
  interface Env {
    TASK_QUEUE?: Queue<QueueTask>;
    R2_BUCKET?: R2Bucket;
    // Storage configuration
    STORAGE_MODE?: string;
    CACHE_STORAGE_MODE?: string;
    S3_FOLDER?: string;
    S3_CACHE_FOLDER?: string;
    S3_REGION?: string;
    S3_ENDPOINT?: string;
    S3_ACCESS_HOST?: string;
    S3_BUCKET?: string;
    S3_FORCE_PATH_STYLE?: string;
    S3_ACCESS_KEY_ID?: string;
    S3_SECRET_ACCESS_KEY?: string;
  }
}

export {};
