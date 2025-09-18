const DEFAULT_HOST = "http://localhost:5275" as const

export const BAZARBIN_HOST = (import.meta.env.VITE_BAZARBIN_HOST as string | undefined) ?? DEFAULT_HOST

export const DATASETS_ENDPOINT = `${BAZARBIN_HOST}/datasets`

export const buildDatasetPromptEndpoint = (datasetId: string | number) => `${BAZARBIN_HOST}/prompt/${datasetId}`
