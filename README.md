# FanTV

FanTV 是一款基于 Next.js 与新型苹果CMS (MacCMS) JSON API 接口构建的现代化、高性能、双模式自适应影视应用。
项目以极致的用户体验、美观的毛玻璃 (Glassmorphism) UI 形态以及强大的后台管控为核心，支持全渠道多源数据智能聚合与展示。

## 🌟 核心特性
- **双模式生态**：内置标准“普通源”展示视图与受权限控制的“圣贤模式”，全方位囊括各维度的资源配置。
- **动态白名单/访客权限**：一键控制全站的开放注册与免登录浏览能力，完全满足私有化或开放式部署需求。
- **云端与本地数据同步**：支持播放历史、收藏夹全自动多机云端漫游合并与清理。
- **自定义网站品牌**：通过自带后台可以直接无极配置网站名称、SEO介绍与 Base64/外链站点 Logo。
- **零依赖单体架构**：采用 Prisma + SQLite 数据栈，内置防呆化管理员自动装载与完善的动态全站角色控制。
- **极致体验优化**：支持全局黑夜/白昼自适应、支持全键盘快捷键+移动手势交互、全站防切边布局，内置实验性播放器去广告过滤。

## 🛠️ 技术栈
- **框架**：[Next.js 14/15 App Router](https://nextjs.org/) (React Server Components)
- **样式体系**：[Tailwind CSS](https://tailwindcss.com/)
- **全局状态池**：Zustand
- **数据库 ORM**：[Prisma](https://www.prisma.io/)
- **数据库底层引擎**：SQLite (零配置原生嵌入持久化)
- **无状态验证**：轻量级自签发 JWT (jose)

## 🐳 Docker 极速部署 (推荐)
FanTV 已经完全配置好 Github Actions 的自动化 CI 流水线且支持 Docker Standalone 极速分离构建。您可以直接通过 Docker Compose 拉取并部署。

创建并保留一份 `docker-compose.yml` 节点文件：
```yaml
version: '3.8'

services:
  fantv:
    image: ghcr.io/akasls/fantv:main # 拉取自动化构建的主分支镜像分支
    container_name: fantv
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # 挂载 SQLite 数据库文件夹至宿主机，防止容器销毁时数据回档及 WAL 缓存丢失
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:./data/fantv.db
```

在同级目录下执行启动指令一键拉起后端节点：
```bash
docker-compose up -d
```

> ⚠️ **老用户升级必读（数据迁移）**：如果您以前使用的是单文件挂载（`- ./fantv.db:/app/fantv.db`），请在更新镜像前执行：`mkdir data && mv fantv.db data/`，然后修改您的 `docker-compose.yml` 按照上述格式挂载 `./data` 文件夹。这是为了保护 SQLite 的 `-wal` 事务缓存机制。

如果您不想使用 Docker Compose，也可以直接通过 `docker run` 命令部署：
```bash
docker run -d \
  --name fantv \
  --restart unless-stopped \
  -p 3000:3000 \
  -e DATABASE_URL="file:./data/fantv.db" \
  -v $(pwd)/data:/app/data \
  ghcr.io/akasls/fantv:main
```


> ⚠️ **初始管理员账号机制**：系统在首次热启动检测到全库不存在超管等级帐户时，将会自动为您极速硬编码部署超管账号：`admin`，密码 `admin123`。强烈建议您成功上线部署后立即前往“设置中心 - 用户管理”面板更新用户名及密码安全配置！

## 🙏 鸣谢与架构致敬
本项目在开发与架构演进过程中，深受开源社区的启发，特别感谢以下技术的支持与奉献：
- 沉重感悟于 [Apple CMS (苹果CMS)](https://www.maccms.la/) 开阔的跨界聚合视频接口分发规范，本应用核心资源爬取与检索机制全面兼容并构建于其强大的行业协议之上。
- 致敬核心基础设施工厂：Next.js 与 Vercel 的顶尖开源奉献，使得 React Server Components 与灵活高效全栈边缘流渲染架构的构筑化为无尽可能。
- 感谢广大的前端 UI/UX 提供节点 (Tailwind / Heroicons) 及无私贡献 JSON 接口解析通道的源头站长网络体系，维持着数字宇宙间内容的高速流动。

## 📃 版权与开源协议
本文档及主干代码库仅作为 Next.js 前沿全栈技术开发深度交流与学习案例开放参考。使用者应对通过接口拉取的分发及资源请求网络拥有自主审理决断权，遵守各地运营法规安全规范。
