import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';
import { createAnthropic } from '@ai-sdk/anthropic';

export default class AnthropicProvider extends BaseProvider {
  name = 'Anthropic';
  getApiKeyLink = 'https://console.anthropic.com/settings/keys';

  config = {
    apiTokenKey: 'ANTHROPIC_API_KEY',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'claude-3-7-sonnet-20250219',
      label: 'Anthropic Claude 4 Sonnet',
      provider: 'Anthropic',
      maxTokenAllowed: 64000,
    },
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
      defaultApiTokenKey: 'ANTHROPIC_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    // Note: Anthropic doesn't provide a models endpoint, so we return commonly available models
    const anthropicModels = [
      { name: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Anthropic)', maxTokenAllowed: 64000 },
      { name: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Anthropic)', maxTokenAllowed: 64000 },
      { name: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Anthropic)', maxTokenAllowed: 64000 },
      { name: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Anthropic)', maxTokenAllowed: 64000 },
      { name: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Anthropic)', maxTokenAllowed: 64000 },
      { name: 'claude-3-7-sonnet-20250219', label: 'Claude 4 Sonnet (Anthropic)', maxTokenAllowed: 64000 },
    ];

    return anthropicModels.map((model) => ({
      ...model,
      provider: this.name,
    }));
  }

  getModelInstance: (options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }) => LanguageModelV1 = (options) => {
    const { apiKeys, providerSettings, serverEnv, model } = options;
    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'ANTHROPIC_API_KEY',
    });
    const anthropic = createAnthropic({
      apiKey,
      headers: { 'anthropic-beta': 'output-128k-2025-02-19' },
    });

    return anthropic(model);
  };
}
