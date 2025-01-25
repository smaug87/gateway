import { handler as defaultregexMatch } from './default/regexMatch';
import { handler as defaultsentenceCount } from './default/sentenceCount';
import { handler as defaultwordCount } from './default/wordCount';
import { handler as defaultcharacterCount } from './default/characterCount';
import { handler as defaultjsonSchema } from './default/jsonSchema';
import { handler as defaultjsonKeys } from './default/jsonKeys';
import { handler as defaultcontains } from './default/contains';
import { handler as defaultvalidUrls } from './default/validUrls';
import { handler as defaultwebhook } from './default/webhook';
import { handler as defaultlog } from './default/log';
import { handler as defaultcontainsCode } from './default/containsCode';
import { handler as defaultalluppercase } from './default/alluppercase';
import { handler as defaultalllowercase } from './default/alllowercase';
import { handler as defaultendsWith } from './default/endsWith';
import { handler as defaultmodelWhitelist } from './default/modelWhitelist';
import { handler as portkeymoderateContent } from './portkey/moderateContent';
import { handler as portkeylanguage } from './portkey/language';
import { handler as portkeypii } from './portkey/pii';
import { handler as portkeygibberish } from './portkey/gibberish';
import { handler as aporiavalidateProject } from './aporia/validateProject';
import { handler as sydelabssydeguard } from './sydelabs/sydeguard';
import { handler as pillarscanPrompt } from './pillar/scanPrompt';
import { handler as pillarscanResponse } from './pillar/scanResponse';
import { handler as patronusphi } from './patronus/phi';
import { handler as patronuspii } from './patronus/pii';
import { handler as patronusisConcise } from './patronus/isConcise';
import { handler as patronusisHelpful } from './patronus/isHelpful';
import { handler as patronusisPolite } from './patronus/isPolite';
import { handler as patronusnoApologies } from './patronus/noApologies';
import { handler as patronusnoGenderBias } from './patronus/noGenderBias';
import { handler as patronusnoRacialBias } from './patronus/noRacialBias';
import { handler as patronusretrievalAnswerRelevance } from './patronus/retrievalAnswerRelevance';
import { handler as patronustoxicity } from './patronus/toxicity';
import { handler as patronuscustom } from './patronus/custom';
import { mistralGuardrailHandler } from './mistral';
import { handler as pangeatextGuard } from './pangea/textGuard';
import { handler as promptfooPii } from './promptfoo/pii';
import { handler as promptfooHarm } from './promptfoo/harm';
import { handler as promptfooGuard } from './promptfoo/guard';
import { handler as pangeapii } from './pangea/pii';
import { pluginHandler as bedrockHandler } from './bedrock/index';
import { bedrockPIIHandler } from './bedrock/redactPii';

export const plugins = {
  default: {
    regexMatch: defaultregexMatch,
    sentenceCount: defaultsentenceCount,
    wordCount: defaultwordCount,
    characterCount: defaultcharacterCount,
    jsonSchema: defaultjsonSchema,
    jsonKeys: defaultjsonKeys,
    contains: defaultcontains,
    validUrls: defaultvalidUrls,
    webhook: defaultwebhook,
    log: defaultlog,
    containsCode: defaultcontainsCode,
    alluppercase: defaultalluppercase,
    alllowercase: defaultalllowercase,
    endsWith: defaultendsWith,
    modelWhitelist: defaultmodelWhitelist,
  },
  portkey: {
    moderateContent: portkeymoderateContent,
    language: portkeylanguage,
    pii: portkeypii,
    gibberish: portkeygibberish,
  },
  aporia: {
    validateProject: aporiavalidateProject,
  },
  sydelabs: {
    sydeguard: sydelabssydeguard,
  },
  pillar: {
    scanPrompt: pillarscanPrompt,
    scanResponse: pillarscanResponse,
  },
  patronus: {
    phi: patronusphi,
    pii: patronuspii,
    isConcise: patronusisConcise,
    isHelpful: patronusisHelpful,
    isPolite: patronusisPolite,
    noApologies: patronusnoApologies,
    noGenderBias: patronusnoGenderBias,
    noRacialBias: patronusnoRacialBias,
    retrievalAnswerRelevance: patronusretrievalAnswerRelevance,
    toxicity: patronustoxicity,
    custom: patronuscustom,
  },
  mistral: {
    moderateContent: mistralGuardrailHandler,
  },
  pangea: {
    textGuard: pangeatextGuard,
    pii: pangeapii,
  },
  promptfoo: {
    pii: promptfooPii,
    harm: promptfooHarm,
    guard: promptfooGuard,
  },
  bedrock: {
    pii: bedrockHandler.bind({ fn: 'pii' }),
    contentFilter: bedrockHandler.bind({ fn: 'contentFilter' }),
    wordFilter: bedrockHandler.bind({ fn: 'wordFilter' }),
    redactPii: bedrockPIIHandler,
  },
};
