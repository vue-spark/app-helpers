# @vue-spark/app-helpers/sso

为应用适配单点登录功能提供辅助工具。

## 安装

```sh
npm i @vue-spark/app-helpers
```

## 使用方式

```ts
// src/main.ts
import { parseUrl, removeUrlSearchParams } from '@vue-spark/app-helpers/sso'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)

function mount() {
  const parsed = parseUrl({ paramGroups: ['access_token'] })
  if (parsed) {
    localStorage.setItem('access_token', parsed.data.access_token!)
    history.replaceState(null, '', parsed.cleanUrl)
    app.mount('#app')
    return
  }
  // `redirect_uri` 必须编码，否则地址中的 `#` 会被当作锚点而不发送给服务端
  const redirectUri = encodeURIComponent(
    removeUrlSearchParams(location.href, true),
  )
  location.replace(`http://sso-url/?redirect_uri=${redirectUri}`)
}

mount()
```
