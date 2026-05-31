export type ImageGenerationRequest = {
  prompt: string;
  aspect: '16:9' | '9:16';
  referenceImageUrls?: string[];
  styleHints?: Record<string, unknown>;
};

export type ImageGenerationResult = {
  imageBytes: Buffer;
  mimeType: string;
  width: number;
  height: number;
};

export type ImageGenerationPort = {
  readonly providerKey: string;
  isConfigured(): boolean;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
};

/** 1×1 PNG — deterministic stub output for local dev. */
const STUB_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

export const stubImageGenerationPort: ImageGenerationPort = {
  providerKey: 'stub',
  isConfigured() {
    return true;
  },
  async generate() {
    return {
      imageBytes: STUB_PNG,
      mimeType: 'image/png',
      width: 1280,
      height: 720,
    };
  },
};

export const notConfiguredImageGenerationPort: ImageGenerationPort = {
  providerKey: 'none',
  isConfigured() {
    return false;
  },
  async generate() {
    throw new Error('IMAGE_PROVIDER_NOT_CONFIGURED');
  },
};

export function createImageGenerationPort(
  env: NodeJS.ProcessEnv = process.env,
): ImageGenerationPort {
  if (env.THUMBNAIL_IMAGE_PROVIDER === 'none') {
    return notConfiguredImageGenerationPort;
  }
  return stubImageGenerationPort;
}
