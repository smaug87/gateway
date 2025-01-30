import { PluginHandler } from '../types';
import {
  getCurrentContentPart,
  HttpError,
  setCurrentContentPart,
} from '../utils';
import { BedrockAccessKeyCreds, BedrockBody, BedrockParameters } from './type';
import { bedrockPost, getAssumedRoleCredentials, redactPii } from './util';

const REQUIRED_CREDENTIAL_KEYS = [
  'awsAccessKeyId',
  'awsSecretAccessKey',
  'awsRegion',
];

export const validateCreds = (
  credentials?: BedrockParameters['credentials']
) => {
  return REQUIRED_CREDENTIAL_KEYS.every((key) =>
    Boolean(credentials?.[key as keyof BedrockParameters['credentials']])
  );
};
export const handleCredentials = async (
  options: Record<string, any>,
  credentials: BedrockParameters['credentials'] | null
) => {
  const finalCredentials = {} as BedrockAccessKeyCreds;
  if (credentials?.awsAuthType === 'assumedRole') {
    try {
      // Assume the role in the source account
      const sourceRoleCredentials = await getAssumedRoleCredentials(
        options.getFromCacheByKey,
        options.putInCacheWithValue,
        options.env,
        options.env.AWS_ASSUME_ROLE_SOURCE_ARN, // Role ARN in the source account
        options.env.AWS_ASSUME_ROLE_SOURCE_EXTERNAL_ID || '', // External ID for source role (if needed)
        credentials.awsRegion || ''
      );

      if (!sourceRoleCredentials) {
        throw new Error('Server Error while assuming internal role');
      }

      // Assume role in destination account using temporary creds obtained in first step
      const { accessKeyId, secretAccessKey, sessionToken } =
        (await getAssumedRoleCredentials(
          options.getFromCacheByKey,
          options.putInCacheWithValue,
          options.env,
          credentials.awsRoleArn || '',
          credentials.awsExternalId || '',
          credentials.awsRegion || '',
          {
            accessKeyId: sourceRoleCredentials.accessKeyId,
            secretAccessKey: sourceRoleCredentials.secretAccessKey,
            sessionToken: sourceRoleCredentials.sessionToken,
          }
        )) || {};
      finalCredentials.awsAccessKeyId = accessKeyId;
      finalCredentials.awsSecretAccessKey = secretAccessKey;
      finalCredentials.awsSessionToken = sessionToken;
      finalCredentials.awsRegion = credentials.awsRegion || '';
    } catch {}
  } else {
    finalCredentials.awsAccessKeyId = credentials?.awsAccessKeyId || '';
    finalCredentials.awsSecretAccessKey = credentials?.awsSecretAccessKey || '';
    finalCredentials.awsSessionToken = credentials?.awsSessionToken || '';
    finalCredentials.awsRegion = credentials?.awsRegion || '';
  }
  return finalCredentials;
};

export const pluginHandler: PluginHandler<
  BedrockParameters['credentials']
> = async (context, parameters, eventType, options) => {
  const transformedData: Record<string, any> = {
    request: {
      json: null,
    },
    response: {
      json: null,
    },
  };
  let transformed = false;
  const credentials = parameters.credentials || null;
  const finalCredentials = await handleCredentials(
    options as Record<string, any>,
    credentials
  );
  const validate = validateCreds(finalCredentials);

  const guardrailVersion = parameters.guardrailVersion;
  const guardrailId = parameters.guardrailId;
  const redact = parameters?.redact as boolean;

  let verdict = true;
  let error = null;
  let data = null;
  if (!validate || !guardrailVersion || !guardrailId) {
    return {
      verdict,
      error: { message: 'Missing required credentials' },
      data,
      transformed,
      transformedData,
    };
  }

  const body = {} as BedrockBody;

  if (eventType === 'beforeRequestHook') {
    body.source = 'INPUT';
  } else {
    body.source = 'OUTPUT';
  }

  try {
    const { content, textArray } = getCurrentContentPart(context, eventType);

    if (!content) {
      return {
        error: { message: 'request or response json is empty' },
        verdict: true,
        data: null,
        transformedData,
        transformed,
      };
    }

    const results = await Promise.all(
      textArray.map((text) =>
        text
          ? bedrockPost(
              { ...(finalCredentials as any), guardrailId, guardrailVersion },
              {
                content: [{ text: { text } }],
                source: body.source,
              }
            )
          : null
      )
    );

    const interventionData =
      results.find(
        (result) => result && result.action === 'GUARDRAIL_INTERVENED'
      ) ?? results[0];

    const flaggedCategories = new Set();

    results.forEach((result) => {
      if (!result) return;
      if (result.assessments[0].contentPolicy?.filters?.length > 0) {
        flaggedCategories.add('contentFilter');
      }
      if (result.assessments[0].wordPolicy?.customWords?.length > 0) {
        flaggedCategories.add('wordFilter');
      }
      if (result.assessments[0].wordPolicy?.managedWordLists?.length > 0) {
        flaggedCategories.add('wordFilter');
      }
      if (
        result.assessments[0].sensitiveInformationPolicy?.piiEntities?.length >
        0
      ) {
        flaggedCategories.add('piiFilter');
      }
    });

    let hasPii = flaggedCategories.has('piiFilter');
    if (hasPii && redact) {
      const maskedTexts = textArray.map((text, index) =>
        redactPii(text, results[index])
      );

      setCurrentContentPart(context, eventType, transformedData, maskedTexts);
      transformed = true;
    }

    if (hasPii && flaggedCategories.size === 1 && redact) {
      verdict = true;
    } else if (flaggedCategories.size > 0) {
      verdict = false;
    }
    data = interventionData;
  } catch (e) {
    if (e instanceof HttpError) {
      error = { message: e.response.body };
    } else {
      error = { message: (e as Error).message };
    }
  }
  return {
    verdict,
    error,
    data,
    transformedData,
    transformed,
  };
};
