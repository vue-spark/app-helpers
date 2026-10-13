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

`writeUrlSearchParams` 按「`#` 锚点是否以 `#/`、`#!` 开头」分流落点：

| 目标形态                | 落点             | 结果               |
| ----------------------- | ---------------- | ------------------ |
| 无锚点 `/orders`        | 查询串           | `/orders?a=1`      |
| 普通锚点 `/page#detail` | 查询串，锚点不动 | `/page?a=1#detail` |
| `hash` 路径 `/#/orders` | 锚点内的查询段   | `/#/orders?a=1`    |

```ts
import { writeUrlSearchParams } from '@vue-spark/app-helpers/sso'

// 普通锚点：参数进查询串，锚点保留可用
writeUrlSearchParams('https://h/page?from=menu#detail', [['access_token', t]])
// => 'https://h/page?from=menu&access_token=t#detail'

// hash 路径：参数进锚点内的查询段，应用从 location.hash 读得到
writeUrlSearchParams('https://h/#/orders?tab=1', [['access_token', t]])
// => 'https://h/#/orders?tab=1&access_token=t'
```

除写入的键以外，其余参数与锚点按**原始文本**保留，不会被搬到别的分段，
也不会改写 `%20`、`+` 等既有写法。`removeUrlSearchParams` 同样按原始文本保留
未被移除的参数，因此移除未命中的参数不会改动其它参数的写法
（仅当移除后查询串为空时，孤立的 `?` 会被去掉）。

### 生效查询串的定位（hash 路径优先）

| 地址形态                     | 目标应用读者      | 生效查询串                                     |
| ---------------------------- | ----------------- | ---------------------------------------------- |
| `/orders?a=1`                | `location.search` | 主体 `search`                                  |
| `/page#detail`               | `location.search` | 主体 `search`                                  |
| `/page#detail?x=1`           | `location.search` | **无**（`?x=1` 是锚点原文）                    |
| `/#/orders`                  | `location.hash`   | **空**（主体 `search` 不参与）                 |
| `/#/orders?tab=1`            | `location.hash`   | 锚点内查询段（主体 `search` 不参与）           |
| `/#/orders?tab=1#detail?d=3` | `location.hash`   | 锚点内查询段 `tab=1`；`#detail?d=3` 是锚点部分 |

- **`hash` 路径优先且互斥**：只要锚点以 `#/`、`#!` 开头，读写删一律以锚点内的查询段
  为准，主体 `search` **完全不参与**；锚点内没有查询段时生效查询串就是空串
  （此时应用只解析 `location.hash`，主体 `search` 对它不可见）。
- **写入落点**：`#/`、`#!` → 锚点内查询段（原本没有查询段时插在锚点内、锚点部分
  之前），否则 → 主体 `search`。写完后读写删作用于同一处。
- **锚点部分忽略**：`hash` 路径查询段之后出现**非路径形式**的 `#`（如 `#detail?d=3`），
  其后内容（含其中的 `?query`）不算参数，但逐字节保留。
- **普通锚点内的 `?` 不是查询串**：`#detail?d=3` 既不解析、不移除，也不会遮蔽
  主体 `search`（与 WHATWG URL 及主流前端框架解析 `location.hash` 的判据一致：
  `?` 落在 `#` 之后就不作为分隔符）。
- **查询值可以放完整 URL**（含 `#`、`?`，如 `c=http://x/#/cad?e=1`）：值里的
  `#/`、`#!` 是嵌套地址里的路径标记，仍属于值。写入时值按 `URLSearchParams` 规则
  编码（`#` → `%23`、`?` → `%3F`），读取时按同一规则解码；未被写入/移除的原文
  保持原样，不做二次编码。

```ts
const url =
  'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1#detail?d=3'

resolveUrlSearchParams(url)
// => { b: '2', c: 'http://xxxx/asd/#/cad?e=1' }
//    主体 ?a=1 与锚点部分 #detail?d=3 都不参与

writeUrlSearchParams(url, [['access_token', t]])
// => 'http://xxx/a/b/?a=1#/c/d?b=2&c=http://xxxx/asd/#/cad?e=1&access_token=t#detail?d=3'

removeUrlSearchParams(url, ['b'])
// => 'http://xxx/a/b/?a=1#/c/d?c=http://xxxx/asd/#/cad?e=1#detail?d=3'

// 只要有 #/ 就不看主体 search：锚点内没有查询段时生效查询串为空
resolveUrlSearchParams('https://h/?access_token=x#/orders').has('access_token')
// => false
```

普通锚点内的历史错误形态 `https://h/page#detail?access_token=x`（凭据被拼进普通
锚点）整体不作为参数来源，因此既解析不到、也不会被 `removeUrlSearchParams` 移除；
迁移期请改用 `writeUrlSearchParams` 重新生成地址。

同理，`#/`、`#!` 形态下主体 `search` 里的参数（如授权服务器按 OAuth 规范把参数
拼到 `#` 之前）也不作为参数来源；需要目标应用读到的参数请写入锚点内查询段。
