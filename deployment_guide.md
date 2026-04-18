# Rin博客平台 - GitHub Actions部署完整指南

本指南将详细介绍如何使用GitHub Actions将Rin博客平台部署到Cloudflare，并配置数据库存储模式以避免使用R2服务。

## 第一步：准备工作

### 1.1 获取Cloudflare账户信息
- 登录Cloudflare Dashboard
- 获取 `Account ID` (在左侧边栏"Overview"页面顶部)
- 创建 `API Token` (在"Workers & Pages" -> "Account Settings" -> "API Tokens")

### 1.2 创建GitHub仓库
- Fork或复制Rin项目到您的GitHub账户
- 克隆仓库到本地进行修改（如果需要）

## 第二步：配置Cloudflare资源

### 2.1 安装Wrangler CLI
```bash
npm install -g wrangler
```

### 2.2 登录Cloudflare
```bash
wrangler login
```

## 第三步：配置环境变量

在GitHub仓库中设置以下Secrets（Settings -> Secrets and variables -> Actions）：

### 必需的Secrets：
- `CLOUDFLARE_API_TOKEN`: 您的Cloudflare API令牌
- `CLOUDFLARE_ACCOUNT_ID`: 您的Cloudflare账户ID
- `ADMIN_USERNAME`: 管理员用户名（如：admin）
- `ADMIN_PASSWORD`: 管理员密码（至少6位）
- `JWT_SECRET`: JWT密钥（随机字符串，至少32位）

### 可选的Secrets：
- `RIN_GITHUB_CLIENT_ID`: GitHub OAuth应用ID
- `RIN_GITHUB_CLIENT_SECRET`: GitHub OAuth应用密钥
- `S3_ACCESS_KEY_ID`: S3兼容服务访问密钥（使用数据库存储时可留空）
- `S3_SECRET_ACCESS_KEY`: S3兼容服务秘密密钥（使用数据库存储时可留空）

### 配置Variables（Settings -> Secrets and variables -> Actions -> Variables）：
- `NAME`: 网站名称（如：我的博客）
- `DESCRIPTION`: 网站描述
- `AVATAR`: 头像URL
- `PAGE_SIZE`: 每页文章数（默认：5）
- `RSS_ENABLE`: 是否启用RSS（true/false）
- `S3_FOLDER`: 文件夹路径（默认：images/）
- `S3_CACHE_FOLDER`: 缓存文件夹路径（默认：cache/）
- `STORAGE_MODE`: **关键配置** - 设置为 `database` 以启用数据库存储
- `CACHE_STORAGE_MODE`: 设置为 `database` 以使用数据库缓存

## 第四步：重要配置 - 启用数据库存储

由于您不想使用R2服务，需要在GitHub仓库的Variables中设置：

- `STORAGE_MODE` = `database`
- `CACHE_STORAGE_MODE` = `database`

这样就会使用D1数据库存储文件，而不会尝试连接R2或S3服务。

**注意**：如果设置了`STORAGE_MODE=database`，可以忽略以下R2相关的变量：
- `R2_BUCKET_NAME`
- `S3_ENDPOINT`
- `S3_ACCESS_HOST`
- `S3_BUCKET`

## 第五步：触发部署

### 方法一：自动部署
当您向main分支推送代码时，GitHub Actions会自动触发部署流程。

### 方法二：手动触发部署
1. 进入仓库的Actions标签页
2. 选择"Deploy"工作流
3. 点击"Run workflow"
4. 选择分支并点击"Run workflow"

## 第六步：监控部署过程

1. 进入Actions标签页查看部署进度
2. 部署成功后，您将在工作流输出中看到网站URL
3. URL格式通常为：`https://<worker-name>.<account-id>.workers.dev`

## 第七步：首次访问和配置

1. 访问生成的网站URL
2. 使用配置的管理员凭据登录
3. 在设置页面进一步配置站点信息

## 故障排除

### 常见问题：

**Q: 部署失败，提示找不到D1数据库**
A: 确保您的Cloudflare账户已启用D1数据库服务

**Q: 图片上传失败**
A: 检查`STORAGE_MODE`是否设置为`database`

**Q: 环境变量未生效**
A: 确认在GitHub仓库的Variables而非Secrets中设置了环境变量

**Q: API令牌权限不足**
A: 确保API令牌具有以下权限：
- Account.Account Settings: Edit
- Workers Scripts: Edit
- Workers Subdomain: Edit
- D1: Edit
- R2: Edit (如果使用R2)
- Queues: Edit

## 自定义域名（可选）

部署完成后，您可以在Cloudflare Dashboard中为您的Worker绑定自定义域名。

## 数据库存储优势

通过设置`STORAGE_MODE=database`，您获得了以下优势：
- 无需额外的R2或S3存储费用
- 文件直接存储在D1数据库中
- 与博客数据统一管理
- 适合轻量级使用场景

---

**注意事项**：
- 数据库存储模式适合中小型博客，对于大量高分辨率图片可能不太适用
- D1数据库有存储空间限制，请根据需要规划
- 数据库存储模式下，文件访问速度可能略慢于专用对象存储服务