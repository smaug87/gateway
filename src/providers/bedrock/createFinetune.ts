import { ErrorResponse, FinetuneRequest, ProviderConfig } from '../types';
import { BedrockErrorResponseTransform } from './chatComplete';
import { BedrockErrorResponse } from './embed';

export const BedrockCreateFinetuneConfig: ProviderConfig = {
  model: {
    param: 'baseModelIdentifier',
    required: true,
  },
  suffix: {
    param: 'customModelName',
    required: true,
  },
  hyperparameters: {
    param: 'hyperParameters',
    required: false,
    transform: (value: FinetuneRequest) => {
      const epochCount = value.hyperparameters?.n_epochs;
      const learningRateMultiplier =
        value.hyperparameters?.learning_rate_multiplier;
      const batchSize = value.hyperparameters?.batch_size;
      return {
        epochCount: epochCount ? String(epochCount) : undefined,
        learningRateMultiplier: learningRateMultiplier
          ? String(learningRateMultiplier)
          : undefined,
        batchSize: batchSize ? String(batchSize) : undefined,
      };
    },
  },
  training_file: {
    param: 'trainingDataConfig',
    required: true,
    transform: (value: FinetuneRequest) => {
      return {
        s3Uri: decodeURIComponent(value.training_file),
      };
    },
  },
  validation_file: {
    param: 'validationDataConfig',
    required: false,
    transform: (value: FinetuneRequest) => {
      return {
        s3Uri: decodeURIComponent(value.validation_file ?? ''),
      };
    },
  },
  output_file: {
    param: 'outputDataConfig',
    required: true,
    default: (value: FinetuneRequest) => {
      const trainingFile = decodeURIComponent(value.training_file);
      const uri =
        trainingFile.substring(0, trainingFile.lastIndexOf('/') + 1) +
        value.suffix;
      return {
        s3Uri: uri,
      };
    },
  },
  job_name: {
    param: 'jobName',
    required: true,
    default: (value: FinetuneRequest & { job_name: string }) => {
      return value.job_name ?? `portkey-finetune-${crypto.randomUUID()}`;
    },
  },
  role_arn: {
    param: 'roleArn',
    required: true,
  },
  customization_type: {
    param: 'customizationType',
    required: true,
    default: 'FINE_TUNING',
  },
};

export const BedrockCreateFinetuneResponseTransform: (
  response: Response | ErrorResponse,
  responseStatus: number
) => Record<string, unknown> | ErrorResponse = (response, responseStatus) => {
  Response;
  if (responseStatus !== 201 || 'error' in response) {
    return (
      BedrockErrorResponseTransform(response as BedrockErrorResponse) ||
      (response as ErrorResponse)
    );
  }

  return { id: encodeURIComponent((response as any).jobArn) };
};
