# 前端环境变量（可选）

代码里已经默认用 `/api` 作为接口前缀，**同域部署时这两个文件可以不建**。

只有在「H5 和接口不同域」时才需要，在 `web/` 目录下手工新建：

**.env.development**
```
VITE_API_BASE=/api
```

**.env.production**
```
VITE_API_BASE=https://api.你的域名.com/api
```

> 注：远程写入工具不允许直接创建 `.env*` 文件，所以这两个文件需要你本地手动建。
