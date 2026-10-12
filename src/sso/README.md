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

## 写入参数：`writeUrlSearchParams`

需要把参数**写回**地址时，请使用 `writeUrlSearchParams`，不要自己拼字符串。

字符串拼接无法安置参数的正确落点：`#` 之后的内容一律属于锚点，
把参数追加到字符串末尾会把凭据写进锚点（`/page#detail?access_token=…`），
导致锚点失效、且只读 `location.search` 的应用读不到凭据。

`writeUrlSearchParams` 按「`#` 锚点是否是 `hash` 路由」分流落点：

| 目标形态                | 落点             | 结果               |
| ----------------------- | ---------------- | ------------------ |
| 无锚点 `/orders`        | 查询串           | `/orders?a=1`      |
| 普通锚点 `/page#detail` | 查询串，锚点不动 | `/page?a=1#detail` |
| `hash` 路由 `/#/orders` | 锚点内的查询段   | `/#/orders?a=1`    |

```ts
import { writeUrlSearchParams } from '@vue-spark/app-helpers/sso'

// 普通锚点：参数进查询串，锚点保留可用
writeUrlSearchParams('https://h/page?from=menu#detail', [['access_token', t]])
// => 'https://h/page?from=menu&access_token=t#detail'

// hash 路由：参数进锚点内的查询段，路由的 route.query 可读
writeUrlSearchParams('https://h/#/orders?tab=1', [['access_token', t]])
// => 'https://h/#/orders?tab=1&access_token=t'
```

除写入的键以外，其余参数与锚点按**原始文本**保留，不会被搬到别的分段，
也不会改写 `%20`、`+` 等既有写法。`removeUrlSearchParams` 同样按原始文本保留
未被移除的参数，因此移除未命中的参数不会改动其它参数的写法
（仅当移除后查询串为空时，孤立的 `?` 会被去掉）。

### 已知限制

若目标带普通锚点且锚点内已有查询串（如 `#detail?x=1`，通常由历史错误拼接产生），
写入会把参数放进真实查询串，但 `resolveUrlSearchParams` 遵循 `hash` 优先，
会读锚点内的查询串而读不到这些参数。该形态与合法 `hash` 路由在字符串上不可区分，
因此不做自动纠正。
