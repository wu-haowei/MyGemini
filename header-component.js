const headerComponent = {
    props: {
        pageType: {
            type: String,
            required: true
        }
    },
    template: `
    <header class="app-header-fixed">
        <div class="app-header-content">
            <h1 v-if="pageType === 'index'">{{ $t('shopName') }}</h1>
            <h1 v-else-if="pageType === 'admin'">{{ $t('managerName') }}</h1>

            <div class="header-controls">
                <div  class="language-selector">
                    <label for="language-select">{{ $t('language') }}: </label>
                    <select id="language-select" :value="$i18n.locale" @change="$i18n.locale = $event.target.value">
                        <option value="zh-TW">繁體中文</option>
                        <option value="zh-CN">简体中文</option>
                        <option value="ja">日本語</option>
                        <option value="ko">한국어</option>
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                    </select>
                </div>
                <a v-if="pageType === 'index'" href="admin.html" class="admin-button">
                    <i class="material-icons">admin_panel_settings</i>
                    <span>{{ $t('adminBackend') }}</span>
                </a>
                
                <a v-if="pageType === 'admin'" href="index.html" class="admin-button back-button">
                    <i class="material-icons">storefront</i>
                    <span>{{ $t('storeBackend') }}</span>
                </a>
            </div>
        </div>
    </header>
    `
};