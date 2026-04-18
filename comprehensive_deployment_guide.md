# Rin博客平台 - 保姆级GitHub Actions部署教程

## 目录
1. [前置条件](#前置条件)
2. [创建Cloudflare账户和获取必要信息](#创建cloudflare账户和获取必要信息)
3. [在GitHub上配置项目](#在github上配置项目)
4. [配置Cloudflare资源](#配置cloudflare资源)
5. [设置GitHub Secrets和Variables](#设置github-secrets和variables)
6. [启动自动部署](#启动自动部署)
7. [验证部署结果](#验证部署结果)
8. [常见问题解决](#常见问题解决)

## 前置条件

在开始之前，您需要准备：

- 一个GitHub账户
- 一个Cloudflare账户
- 已fork或克隆Rin项目到您的GitHub账户

## 1. 创建Cloudflare账户和获取必要信息

### 1.1 注册Cloudflare账户
1. 访问 [https://dash.cloudflare.com](https://dash.cloudflare.com)
2. 点击"Sign Up"按钮
3. 输入邮箱地址和密码
4. 完成邮箱验证

### 1.2 获取Account ID
1. 登录Cloudflare Dashboard
2. 在左侧面板中点击"Overview"
3. 在页面顶部找到您的账户信息区域
4. 找到"Account ID"字段，复制该ID（格式类似：xxx7d5273xxx944axxx2123f2exxx3）

### 1.3 创建API Token
1. 在Cloudflare Dashboard左侧面板中，点击"My Profile"
2. 在顶部菜单中选择"API Tokens"
3. 点击"Create Token"按钮
4. 在模板中选择"Edit Cloudflare Workers"
5. 在"Permissions"部分确保包含以下权限：
   - Account: Account Settings: Edit
   - Account: Cloudflare Workers: Edit
   - Account: D1: Edit
   - Account: Queues: Edit
   - Account: Workers Scripts: Edit
   - Account: Workers Subdomain: Edit
6. 在"Account Resources"部分，选择"Include" -> "All Accounts"
7. 点击"Continue to Summary"
8. 点击"Create Token"
9. **重要**：立即复制生成的API Token，因为之后将无法再次查看

## 2. 在GitHub上配置项目

### 2.1 Fork Rin项目
1. 访问Rin项目仓库：[https://github.com/openRin/Rin](https://github.com/openRin/Rin)
2. 点击右上角的"Fork"按钮
3. 选择您的账户作为目标位置
4. 等待Fork完成

### 2.2 克隆并准备代码（可选）
如果您需要修改代码：
1. 克隆仓库到本地：
   ```bash
   git clone https://github.com/你的用户名/Rin.git
   cd Rin
   ```
2. 创建新分支进行修改：
   ```bash
   git checkout -b database-storage
   ```

## 3. 配置Cloudflare资源

### 3.1 安装Wrangler CLI
1. 安装Node.js（如果尚未安装）
2. 通过npm安装wrangler：
   ```bash
   npm install -g wrangler
   ```

### 3.2 登录Cloudflare
1. 打开终端或命令提示符
2. 运行以下命令：
   ```bash
   wrangler login
   ```
3. 浏览器会打开并引导您完成登录过程
4. 授权wrangler访问您的Cloudflare账户

## 4. 设置GitHub Secrets和Variables

### 4.1 访问仓库设置
1. 进入您的Rin项目GitHub仓库
2. 点击仓库页面上方的"Settings"标签页
3. 在左侧边栏中找到"Secrets and variables"部分
4. 点击"Actions"

### 4.2 配置Secrets
在"Secrets and variables" -> "Actions" -> "Secrets"部分：

点击"New repository secret"按钮，依次添加以下密钥：

#### 必需的Secrets：

**CLOUDFLARE_API_TOKEN**
- Name: `CLOUDFLARE_API_TOKEN`
- Value: 您在1.3步骤中创建的API Token

**CLOUDFLARE_ACCOUNT_ID**
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: 您在1.2步骤中复制的Account ID

**ADMIN_USERNAME**
- Name: `ADMIN_USERNAME`
- Value: 您想要的管理员用户名（如：admin）

**ADMIN_PASSWORD**
- Name: `ADMIN_PASSWORD`
- Value: 您想要的管理员密码（至少6位，建议复杂一些）

**JWT_SECRET**
- Name: `JWT_SECRET`
- Value: 随机生成的安全密钥（建议至少32位随机字符，可以使用在线密码生成器）

### 4.3 配置Variables
在"Secrets and variables" -> "Actions" -> "Variables"部分：

点击"New repository variable"按钮，依次添加以下变量：

**NAME**
- Name: `NAME`
- Value: 您的博客名称（如：我的个人博客）

**DESCRIPTION**
- Name: `DESCRIPTION`
- Value: 博客描述（如：分享技术与生活的个人博客）

**AVATAR**（可选）
- Name: `AVATAR`
- Value: 博客头像URL

**PAGE_SIZE**
- Name: `PAGE_SIZE`
- Value: 每页显示的文章数量（如：5）

**RSS_ENABLE**
- Name: `RSS_ENABLE`
- Value: 是否启用RSS（true或false）

**STORAGE_MODE**（关键配置）
- Name: `STORAGE_MODE`
- Value: `database` （这是我们实现的关键功能，使用数据库存储替代R2）

**CACHE_STORAGE_MODE**
- Name: `CACHE_STORAGE_MODE`
- Value: `database` （使用数据库缓存）

**S3_FOLDER**（可选）
- Name: `S3_FOLDER`
- Value: `images/`

**S3_CACHE_FOLDER**（可选）
- Name: `S3_CACHE_FOLDER`
- Value: `cache/`

**重要提醒**：设置`STORAGE_MODE=database`后，系统将使用D1数据库存储文件，无需R2服务！

## 5. 启动自动部署

### 5.1 触发自动部署
如果您的代码在main分支上，提交代码后将自动触发部署。

如果不在main分支，需要合并到main分支：
1. 在GitHub仓库页面点击"Pull requests"
2. 点击"New pull request"
3. 设置base为main，compare为您的功能分支
4. 点击"Create pull request"
5. 检查更改无误后，点击"Merge pull request"

### 5.2 手动触发部署
如果需要手动触发部署：

1. 在仓库页面点击"Actions"标签页
2. 在左侧找到"Deploy"工作流
3. 点击"Deploy"
4. 点击"Run workflow"
5. 在分支选择器中选择main分支
6. 点击"Run workflow"

### 5.3 监控部署过程
1. 在Actions标签页可以看到正在运行的工作流
2. 点击当前运行的"Deploy"工作流
3. 展开各个步骤查看详细日志
4. 部署成功后，日志末尾会显示网站URL

## 6. 验证部署结果

### 6.1 查看部署URL
1. 在部署工作流完成后，点击"Summary"标签页
2. 在页面底部可以看到部署的URL
3. URL格式通常为：`https://<worker-name>.<account-id>.workers.dev`

### 6.2 访问网站
1. 点击生成的URL或在浏览器中输入该地址
2. 网站应该正常加载
3. 尝试注册或使用您设置的管理员凭据登录

### 6.3 测试文件上传功能
1. 登录到后台管理页面
2. 尝试创建新文章并上传图片
3. 验证图片是否能正常上传和显示

## 7. 常见问题解决

### 7.1 部署失败：权限错误
**症状**：部署过程中出现403错误或权限不足错误
**解决方案**：
- 检查API Token是否具有足够的权限
- 确认CLOUDFLARE_API_TOKEN Secret设置正确
- 确认CLOUDFLARE_ACCOUNT_ID设置正确

### 7.2 部署失败：D1数据库错误
**症状**：部署日志中出现D1相关错误
**解决方案**：
- 确认您的Cloudflare账户已启用D1数据库服务
- 检查是否有D1使用限制

### 7.3 图片上传失败
**症状**：上传图片时报错或图片无法显示
**解决方案**：
- 确认STORAGE_MODE设置为database
- 检查数据库迁移是否成功（应已运行0010.sql）

### 7.4 环境变量不生效
**症状**：某些配置没有按预期生效
**解决方案**：
- 确认变量是在Variables中设置，而不是Secrets中
- 检查变量名称拼写是否正确

### 7.5 管理员登录失败
**症状**：使用设置的管理员凭据无法登录
**解决方案**：
- 检查ADMIN_USERNAME和ADMIN_PASSWORD是否正确设置
- 确认密码长度符合要求

## 8. 后续维护

### 8.1 更新代码
- 当Rin项目有更新时，可以从原仓库同步到您的fork
- 更新后重新触发部署

### 8.2 备份数据
- 定期备份D1数据库中的数据
- 可以使用wrangler命令导出数据库

### 8.3 性能优化
- 根据访问量调整数据库存储策略
- 监控D1数据库使用情况

## 附录：数据库存储模式的优势

使用我们实现的数据库存储模式（STORAGE_MODE=database）有以下优势：

1. **无需R2服务**：直接使用D1数据库存储文件
2. **成本效益**：避免额外的R2存储费用
3. **数据统一**：文件与博客数据在同一数据库中
4. **易于管理**：统一的数据备份和恢复策略
5. **隐私保护**：数据完全控制在您的账户内

注意：数据库存储模式适合中小型博客，对于大量高分辨率图片可能不如专用对象存储服务高效。