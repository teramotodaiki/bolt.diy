import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  getApiKeyLink = 'https://platform.openai.com/api-keys';

  config = {
    apiTokenKey: 'OPENAI_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'o3-mini', label: 'OpenAI o3-mini', provider: 'OpenAI', maxTokenAllowed: 8000 },
    { name: 'gpt-5', label: 'OpenAI GPT-5', provider: 'OpenAI', maxTokenAllowed: 8000 },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://api.openai.com/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const res = (await response.json()) as any;

    const data = res.data.filter(
      (model: any) =>
        (model.object === 'model' && model.id.startsWith('gpt-')) ||
        model.id.startsWith('o1-') ||
        model.id.startsWith('o3-'),
    );

    return data.map((m: any) => ({
      name: m.id,
      label: `${m.id} (OpenAI)`,
      provider: this.name,
      maxTokenAllowed: m.id.includes('32k') ? 32000 : m.id.includes('16k') ? 16000 : 8000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'OPENAI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const openai = createOpenAI({
      apiKey,
    });

    const baseModel = openai(model);

    // GPT-5 特別対応: max_tokens -> max_completion_tokens
    if (model === 'gpt-5') {
      const originalDoGenerate = baseModel.doGenerate;

      baseModel.doGenerate = async function (options) {
        const modifiedOptions = { ...options } as any;

        // GPT-5の制約に対応
        if (options.maxTokens) {
          delete modifiedOptions.maxTokens;
          modifiedOptions.max_completion_tokens = options.maxTokens;
        }

        // GPT-5はtemperature=1のみサポート
        if (modifiedOptions.temperature !== undefined && modifiedOptions.temperature !== 1) {
          delete modifiedOptions.temperature;
        }

        return originalDoGenerate.call(this, modifiedOptions);
      };

      const originalDoStream = baseModel.doStream;

      baseModel.doStream = async function (options) {
        const modifiedOptions = { ...options } as any;

        // GPT-5の制約に対応
        if (options.maxTokens) {
          delete modifiedOptions.maxTokens;
          modifiedOptions.max_completion_tokens = options.maxTokens;
        }

        // GPT-5はtemperature=1のみサポート
        if (modifiedOptions.temperature !== undefined && modifiedOptions.temperature !== 1) {
          delete modifiedOptions.temperature;
        }

        return originalDoStream.call(this, modifiedOptions);
      };
    }

    return baseModel;
  }
}
