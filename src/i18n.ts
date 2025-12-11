import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface Translations {
    serverControl: {
        title: string;
        statusRunning: string;
        statusStopped: string;
        statusChecking: string;
        startButton: string;
        stopButton: string;
    };
    apiConfig: {
        title: string;
        endpoint: string;
        endpointHint: string;
        model: string;
        modelHint: string;
        apiKey: string;
        apiKeyHint: string;
    };
    contextSettings: {
        title: string;
        lineRadius: string;
        lineRadiusHint: string;
        charLimit: string;
        charLimitHint: string;
    };
    actions: {
        saveButton: string;
        saveSuccess: string;
        saveFailed: string;
    };
    commands: {
        startServer: string;
        stopServer: string;
        showActions: string;
        startServerLabel: string;
        stopServerLabel: string;
        actionsPlaceholder: string;
    };
    warnings: {
        apiKeyNotConfigured: string;
    };
}

class I18n {
    private translations: Translations;
    private locale: string;

    constructor(extensionPath: string) {
        this.locale = this.detectLocale();
        this.translations = this.loadTranslations(extensionPath);
    }

    private detectLocale(): string {
        const vscodeLocale = vscode.env.language;

        // Map VSCode locale codes to our locale files
        const localeMap: { [key: string]: string } = {
            'zh-cn': 'zh-cn',
            'zh-tw': 'zh-tw',
            'zh-hk': 'zh-tw', // Use Traditional Chinese for Hong Kong
            'ja': 'ja',
            'ko': 'ko',
            'it': 'it',
            'fr': 'fr',
            'de': 'de',
            'es': 'es',
            'pt-br': 'pt-br',
            'pt': 'pt-br', // Use Brazilian Portuguese as default
            'en': 'en',
            'en-us': 'en',
            'en-gb': 'en'
        };

        return localeMap[vscodeLocale.toLowerCase()] || 'en';
    }

    private loadTranslations(extensionPath: string): Translations {
        const localeFile = path.join(extensionPath, 'out', 'locales', `${this.locale}.json`);
        const fallbackFile = path.join(extensionPath, 'out', 'locales', 'en.json');

        try {
            // Try to load the specific locale
            if (fs.existsSync(localeFile)) {
                return JSON.parse(fs.readFileSync(localeFile, 'utf8'));
            }

            // Fall back to English
            if (fs.existsSync(fallbackFile)) {
                return JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
            }
        } catch (error) {
            console.error('Failed to load translations:', error);
        }

        // Ultimate fallback - return English strings hardcoded
        return this.getDefaultTranslations();
    }

    private getDefaultTranslations(): Translations {
        return {
            serverControl: {
                title: 'Server Control',
                statusRunning: 'Server Running',
                statusStopped: 'Server Stopped',
                statusChecking: 'Checking...',
                startButton: 'Start Server',
                stopButton: 'Stop Server'
            },
            apiConfig: {
                title: 'AI API Configuration',
                endpoint: 'API Endpoint',
                endpointHint: 'Base URL for OpenAI-compatible API',
                model: 'Model',
                modelHint: 'Vision model for OCR (e.g., gpt-4o)',
                apiKey: 'API Key',
                apiKeyHint: 'Stored in plain text in settings.json'
            },
            contextSettings: {
                title: 'Context Settings',
                lineRadius: 'Context Line Radius',
                lineRadiusHint: 'Lines of context before/after cursor',
                charLimit: 'Context Char Limit',
                charLimitHint: 'Maximum characters of context'
            },
            actions: {
                saveButton: 'Save Settings',
                saveSuccess: 'WriteTex settings saved successfully!',
                saveFailed: 'Failed to save settings: {0}'
            },
            commands: {
                startServer: 'WriteTex: Start OCR Server',
                stopServer: 'WriteTex: Stop OCR Server',
                showActions: 'WriteTex: Show Actions',
                startServerLabel: 'Start OCR Server',
                stopServerLabel: 'Stop OCR Server',
                actionsPlaceholder: 'WriteTex actions'
            },
            warnings: {
                apiKeyNotConfigured: 'WriteTex: API key not configured. Please set writetex.apiKey in settings.'
            }
        };
    }

    public t(): Translations {
        return this.translations;
    }

    public format(template: string, ...args: string[]): string {
        return template.replace(/{(\d+)}/g, (match, index) => {
            return typeof args[index] !== 'undefined' ? args[index] : match;
        });
    }

    public getLocale(): string {
        return this.locale;
    }
}

let i18nInstance: I18n | null = null;

export function initI18n(extensionPath: string): void {
    i18nInstance = new I18n(extensionPath);
}

export function getI18n(): I18n {
    if (!i18nInstance) {
        throw new Error('I18n not initialized. Call initI18n first.');
    }
    return i18nInstance;
}
