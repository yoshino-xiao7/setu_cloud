// 阿里云ESA验证码类型声明
declare global {
    interface Window {
        AliyunCaptchaConfig?: {
            region: string
            prefix: string
        }
        initAliyunCaptcha?: (config: AliyunCaptchaConfig) => void
    }
}

interface AliyunCaptchaConfig {
    SceneId: string
    mode: 'popup' | 'embed' | 'inline'
    element: string
    button?: string
    // 验证成功回调
    success?: (captchaVerifyParam: string) => void
    // 验证失败回调
    fail?: (result: any) => void
    // 旧版回调（兼容）
    captchaVerifyCallback?: (captchaVerifyParam: string) => Promise<{
        captchaResult: boolean
        bizResult: boolean
    }>
    onBizResultCallback?: (bizResult: boolean) => void
    getInstance?: (instance: AliyunCaptchaInstance) => void
    server?: string[]
    slideStyle?: {
        width: number
        height: number
    }
    language?: string
    region?: string
}

interface AliyunCaptchaInstance {
    reset: () => void
    destroy: () => void
    getSessionId: () => string
}

export { }
