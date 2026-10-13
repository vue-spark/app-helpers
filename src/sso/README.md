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

### 生效查询串的定位

| 地址形态                     | 目标应用读者      | 生效查询串                                     |
| ---------------------------- | ----------------- | ---------------------------------------------- |
| `/orders?a=1`                | `location.search` | 主体 `search`                                  |
| `/page#detail`               | `location.search` | 主体 `search`                                  |
| `/page#detail?x=1`           | `location.search` | 主体 `search`（`?x=1` 是锚点原文）             |
| `/#/orders`                  | `location.hash`   | 空（主体 `search` 不参与）                     |
| `/#/orders?tab=1`            | `location.hash`   | 锚点内查询段（主体 `search` 不参与）           |
| `/#/orders?tab=1#detail?d=3` | `location.hash`   | 锚点内查询段 `tab=1`；`#detail?d=3` 是锚点部分 |

`#/`、`#!` 锚点优先且互斥：读写删一律取锚点内的查询段，主体 `search` 完全不参与，
锚点内没有查询段时生效查询串就是空串。这类地址的应用只解析 `location.hash`，主体
`search` 对它不可见，因此授权服务器拼在 `#` 之前的参数（`https://h/?access_token=x#/orders`）
既不参与解析，也不参与移除。

写入恒落在锚点内的查询段（原本没有查询段就插在锚点部分之前），所以写进去的参数一定
读得回。

普通锚点内的 `?` 落在 `#` 之后，不构成查询串，也不会遮蔽主体 `search`
（与 WHATWG URL 及主流前端框架解析 `location.hash` 的判据一致）。

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

// 有 #/ 就不看主体 search：锚点内没有查询段时生效查询串为空
resolveUrlSearchParams('https://h/?access_token=x#/orders').has('access_token')
// => false
```

### 已知限制

普通锚点内的历史错误形态 `https://h/page#detail?access_token=x`（凭据被拼进普通
锚点）里的 `?access_token=x` 是锚点原文，不构成查询串，因此既解析不到，也不会被
`removeUrlSearchParams` 移除。迁移期请改用 `writeUrlSearchParams` 重新生成地址。

查询值里的 `#` 只有在构成路径形式（`#/`、`#!`）时才属于值。写入的值会把 `#` 编码成
`%23`，读回时还原，往返总是安全的；但手工或服务端拼出、未编码的普通 `#fragment`
会被当作锚点部分，例如 `?c=http://y/#detail` 读回 `c` 得到 `http://y/`。这类值需要
自行编码成 `%23`。
