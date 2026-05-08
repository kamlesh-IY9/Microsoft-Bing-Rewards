import path from 'path'
import rebrowser, { BrowserContext } from 'patchright'
import { BrowserFingerprintWithHeaders, FingerprintGenerator } from 'fingerprint-generator'

import type { MicrosoftRewardsBot } from '../index'
import { UserAgentManager } from './UserAgent'

import type { Account, AccountProxy } from '../interface/Account'

interface BrowserCreationResult {
    context: BrowserContext
    fingerprint: BrowserFingerprintWithHeaders
}

class Browser {
    private readonly bot: MicrosoftRewardsBot
    private static readonly BROWSER_ARGS = [
        '--no-sandbox',
        '--mute-audio',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        '--ignore-ssl-errors',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-web-authentication-ui',
        '--disable-external-intent-requests',
        '--disable-blink-features=Attestation',
        '--disable-features=WebAuthentication,PasswordManagerOnboarding,PasswordManager,EnablePasswordsAccountStorage,Passkeys,WebAuthenticationProxy,U2F',
        '--disable-save-password-bubble'
    ] as const

    constructor(bot: MicrosoftRewardsBot) {
        this.bot = bot
    }

    async createBrowser(account: Account): Promise<BrowserCreationResult> {
        // Every account gets its own dedicated profile so it never conflicts with the user's open Edge windows.
        const userDataDir = path.join(this.bot.config.sessionPath, account.email)
        const isFirstAccount = account.email === 'jke360@outlook.com' // Keep for logging context if needed

        try {
            this.bot.logger.info(
                this.bot.isMobile,
                'BROWSER',
                `Launching with dedicated profile: ${userDataDir}`
            )

            const proxyConfig = account.proxy.url
                ? {
                      server: this.formatProxyServer(account.proxy),
                      ...(account.proxy.username &&
                          account.proxy.password && {
                              username: account.proxy.username,
                              password: account.proxy.password
                          })
                  }
                : undefined

            const context = await rebrowser.chromium.launchPersistentContext(userDataDir, {
                headless: this.bot.config.headless,
                channel: 'msedge',
                args: [...Browser.BROWSER_ARGS],
                viewport: { width: 1366, height: 768 },
                ...(proxyConfig && { proxy: proxyConfig })
            })

            // Generate fingerprint
            const fingerprint = await this.generateFingerprint(!isFirstAccount)

            this.bot.logger.info(
                this.bot.isMobile,
                'BROWSER',
                `Browser ready | User-Agent: "${fingerprint.fingerprint.navigator.userAgent}"`
            )

            return { context: context as unknown as BrowserContext, fingerprint }
        } catch (error) {
            this.bot.logger.error(
                this.bot.isMobile,
                'BROWSER',
                `Launch failed: ${error instanceof Error ? error.message : String(error)}`
            )
            throw error
        }
    }

    private formatProxyServer(proxy: AccountProxy): string {
        try {
            const urlObj = new URL(proxy.url)
            const protocol = urlObj.protocol.replace(':', '')
            return `${protocol}://${urlObj.hostname}:${proxy.port}`
        } catch {
            return `${proxy.url}:${proxy.port}`
        }
    }

    async generateFingerprint(isMobile: boolean) {
        const fingerPrintData = new FingerprintGenerator().getFingerprint({
            devices: isMobile ? ['mobile'] : ['desktop'],
            operatingSystems: isMobile ? ['android', 'ios'] : ['windows', 'linux'],
            browsers: [{ name: 'edge' }]
        })

        const userAgentManager = new UserAgentManager(this.bot)
        const updatedFingerPrintData = await userAgentManager.updateFingerprintUserAgent(fingerPrintData, isMobile)

        return updatedFingerPrintData
    }
}

export default Browser
