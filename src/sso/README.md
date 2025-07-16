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
  const parsed = parseUrl({ params: ['access_token'] })
  if (parsed) {
    localStorage.setItem('access_token', parsed.data.access_token)
    history.replaceState(null, '', parsed.cleanUrl)
    app.mount('#app')
    return
  }
  location.replace(
    `http://sso-url/?redirect_uri=${removeUrlSearchParams(location.href, true)}`,
  )
}

mount()
```
