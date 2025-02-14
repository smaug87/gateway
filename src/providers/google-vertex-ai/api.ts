import { Options } from '../../types/requestBody';
import { endpointStrings, ProviderAPIConfig } from '../types';
import { getModelAndProvider, getAccessToken } from './utils';

const shouldUseBeta1Version = (provider: string, inputModel: string) => {
  if (
    provider === 'meta' ||
    inputModel.includes('gemini-2.0-flash-thinking-exp')
  )
    return true;
  return false;
};

const getProjectRoute = (
  providerOptions: Options,
  inputModel: string
): string => {
  const {
    vertexProjectId: inputProjectId,
    vertexRegion,
    vertexServiceAccountJson,
  } = providerOptions;
  let projectId = inputProjectId;
  if (vertexServiceAccountJson) {
    projectId = vertexServiceAccountJson.project_id;
  }

  const { provider } = getModelAndProvider(inputModel as string);
  let routeVersion = provider === 'meta' ? 'v1beta1' : 'v1';
  if (shouldUseBeta1Version(provider, inputModel)) {
    routeVersion = 'v1beta1';
  }
  return `/${routeVersion}/projects/${projectId}/locations/${vertexRegion}`;
};

const FILE_ENDPOINTS = [
  'uploadFile',
  'retriveFileContent',
  'deleteFile',
  'listFiles',
  'retrieveFile',
];

const BATCH_ENDPOINTS = [
  'createBatch',
  'retrieveBatch',
  'getBatchOutput',
  'listBatches',
  'cancelBatch',
];
const NON_INFERENCE_ENDPOINTS = [...FILE_ENDPOINTS, ...BATCH_ENDPOINTS];

// Good reference for using REST: https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal#gemini-beginner-samples-drest
// Difference versus Studio AI: https://cloud.google.com/vertex-ai/docs/start/ai-platform-users
export const GoogleApiConfig: ProviderAPIConfig = {
  getBaseURL: ({ providerOptions, fn }) => {
    const { vertexRegion } = providerOptions;

    if (FILE_ENDPOINTS.includes(fn as string)) {
      return `https://storage.googleapis.com`;
    }

    return `https://${vertexRegion}-aiplatform.googleapis.com`;
  },
  headers: async ({ providerOptions }) => {
    const { apiKey, vertexServiceAccountJson } = providerOptions;
    let authToken = apiKey;
    if (vertexServiceAccountJson) {
      authToken = await getAccessToken(vertexServiceAccountJson);
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };
  },
  getEndpoint: ({
    fn,
    gatewayRequestBodyJSON: gatewayRequestBody,
    providerOptions,
    c,
  }) => {
    const { vertexProjectId, vertexRegion, vertexServiceAccountJson } =
      providerOptions;
    let mappedFn = fn;
    const { model: inputModel, stream } = gatewayRequestBody;
    if (stream) {
      mappedFn = `stream-${fn}` as endpointStrings;
    }

    if (NON_INFERENCE_ENDPOINTS.includes(fn)) {
      const jobId = c.req.param('id');
      let projectId = vertexProjectId;
      if (!projectId || vertexServiceAccountJson) {
        projectId = vertexServiceAccountJson?.project_id;
      }
      switch (fn) {
        case 'retrieveBatch':
          return `/v1/projects/${projectId}/locations/${vertexRegion}/batchPredictionJobs/${jobId}`;
        case 'listBatches': {
          const query = c.req.query();
          const pageSize = query['limit'] ?? 20;
          const after = query['after'] ?? '';
          return `/v1/projects/${projectId}/locations/${vertexRegion}/batchPredictionJobs?pageSize=${pageSize}&pageToken=${after}`;
        }
        case 'cancelBatch': {
          return `/v1/projects/${projectId}/locations/${vertexRegion}/batchPredictionJobs/${jobId}:cancel`;
        }
        case 'uploadFile':
          // We handle file upload in a separate request handler
          return '';
        case 'createBatch':
          return '';
        default:
          return '';
      }
    }

    const { provider, model } = getModelAndProvider(inputModel as string);
    const projectRoute = getProjectRoute(providerOptions, inputModel as string);
    const googleUrlMap = new Map<string, string>([
      [
        'chatComplete',
        `${projectRoute}/publishers/${provider}/models/${model}:generateContent`,
      ],
      [
        'stream-chatComplete',
        `${projectRoute}/publishers/${provider}/models/${model}:streamGenerateContent?alt=sse`,
      ],
      [
        'embed',
        `${projectRoute}/publishers/${provider}/models/${model}:predict`,
      ],
      [
        'imageGenerate',
        `${projectRoute}/publishers/${provider}/models/${model}:predict`,
      ],
    ]);

    switch (provider) {
      case 'google': {
        return googleUrlMap.get(mappedFn) || `${projectRoute}`;
      }

      case 'anthropic': {
        if (mappedFn === 'chatComplete') {
          return `${projectRoute}/publishers/${provider}/models/${model}:rawPredict`;
        } else if (mappedFn === 'stream-chatComplete') {
          return `${projectRoute}/publishers/${provider}/models/${model}:streamRawPredict`;
        }
      }

      case 'meta': {
        return `${projectRoute}/endpoints/openapi/chat/completions`;
      }

      case 'endpoints': {
        return `${projectRoute}/endpoints/${model}/chat/completions`;
      }

      default:
        return `${projectRoute}`;
    }
  },
};

export default GoogleApiConfig;
