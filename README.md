# 🎫 Advanced Discord Ticket Bot v2.0

<div align="center">

[![Discord](https://img.shields.io/badge/Discord-Bot-blue?style=for-the-badge&logo=discord)](https://discord.com)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb)](https://mongodb.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Professional Discord Ticket Management System**

[🇻🇳 Tiếng Việt](#vi) | [🇺🇸 English](#en)

</div>

---

<a id="vi"></a>
# 🇻🇳 TIẾNG VIỆT

## 📖 Giới Thiệu

**Advanced Discord Ticket Bot v2.0** là một hệ thống quản lý ticket Discord chuyên nghiệp với đầy đủ tính năng enterprise-grade. Được thiết kế dành cho các server cần hỗ trợ khách hàng chuyên nghiệp và quản lý yêu cầu hiệu quả.

### 🚀 Điểm Nổi Bật v2.0
- ✅ **Hoàn toàn loại bỏ web dashboard** - Tối ưu hiệu năng 100%
- ✅ **Enterprise-grade features** - Tính năng cấp doanh nghiệp
- ✅ **Advanced analytics** - Phân tích chi tiết và báo cáo
- ✅ **Smart automation** - Tự động hóa thông minh
- ✅ **Performance monitoring** - Theo dõi hiệu năng realtime

## ✨ Tính Năng Chính

### 🎫 **Quản Lý Ticket Toàn Diện**
- 📝 Tạo ticket với chủ đề và priority tùy chỉnh
- 🏷️ Hệ thống đánh số ticket tự động (TK-0001, TK-0002...)
- 👥 Claim và assign ticket cho staff
- 🔄 Đóng, mở lại, và transfer ticket
- 🗑️ Xóa ticket vĩnh viễn với confirmation
- 📋 Danh sách ticket với filter và pagination
- 💬 Theo dõi activity và participants realtime

### 📊 **Analytics & Báo Cáo Nâng Cao**
- 📈 **Thống kê server**: Total tickets, resolution time, top users
- 👤 **Phân tích user**: Performance metrics, ticket history
- 📉 **Trend analysis**: 7-day activity, category breakdown
- 📊 **SLA tracking**: Response time, breach detection
- 📤 **Export data**: CSV, JSON, Excel formats
- 🎯 **Performance insights**: Staff efficiency, workload balance

### 🛠️ **Công Cụ Admin Chuyên Nghiệp**
- 🔧 **Bulk operations**: Mass close, cleanup, transfer
- 🕒 **Auto-close management**: Smart timeout với warnings
- 📋 **Advanced filtering**: Status, user, date range
- 💾 **Database maintenance**: Cleanup old tickets, optimization
- 📤 **Mass export**: Flexible data export options
- ⚙️ **Configuration management**: Per-guild settings

### 🤖 **Tự Động Hóa Thông Minh**
- ⏰ **Smart auto-close**: Inactivity detection với multiple warnings
- 📄 **Auto-transcript**: Tự động tạo transcript với attachments
- 🔔 **Notification system**: DM alerts, role mentions
- 📊 **Weekly digests**: Automated reports cho administrators
- 🎯 **Priority escalation**: Auto-escalate high priority tickets
- 🔄 **Status management**: Dynamic bot status với realtime stats

### 🎨 **Giao Diện & UX**
- 🌟 **Interactive help system**: Button-based navigation
- 🎛️ **Settings management**: GUI configuration panels
- 📱 **Responsive embeds**: Beautiful, informative displays
- 🎯 **Smart buttons**: Context-aware action buttons
- 🏷️ **Category management**: Organized ticket categories
- 🎨 **Custom branding**: Configurable colors và messages

## 🚀 Cài Đặt & Thiết Lập

### 📋 Yêu Cầu Hệ Thống
- **Node.js**: v18.0.0 trở lên
- **MongoDB**: v4.4 trở lên (Atlas hoặc self-hosted)
- **Discord Bot**: Token và permissions
- **RAM**: Tối thiểu 512MB
- **Storage**: 1GB cho logs và transcripts

### 🔧 Bước 1: Tạo Discord Bot

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
2. Tạo **New Application** và đặt tên bot
3. Vào tab **Bot** và tạo bot token
4. **Lưu ý**: Copy token ngay, chỉ hiển thị 1 lần!
5. Bật các **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 📡 Bước 2: Setup MongoDB

**Option A: MongoDB Atlas (Recommended)**
1. Tạo account tại [MongoDB Atlas](https://cloud.mongodb.com)
2. Tạo free cluster
3. Setup database user và whitelist IP
4. Copy connection string

**Option B: Local MongoDB**
```bash
# Ubuntu/Debian
sudo apt install mongodb

# Windows: Download from mongodb.com
# macOS: brew install mongodb-community
```

### 💻 Bước 3: Cài Đặt Bot

```bash
# Clone repository
git clone https://github.com/Hoocs151/discord-ticket-bot.git
cd discord-ticket-bot

# Cài đặt dependencies
npm install

# Copy và chỉnh sửa environment file
cp .env.example .env
```

### ⚙️ Bước 4: Cấu Hình Environment

Chỉnh sửa file `.env`:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_bot_client_id_here
DISCORD_CLIENT_SECRET=your_bot_client_secret_here

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Bot Configuration
NODE_ENV=production
MAX_TICKETS_PER_USER=5
TICKET_CLOSE_TIMEOUT=24
TRANSCRIPT_ENABLED=true
```

### 🚀 Bước 5: Khởi Chạy Bot

```bash
# Chạy development mode
npm run dev

# Chạy production mode
npm start

# Deploy slash commands
npm run deploy-commands

# Chạy tests
npm test
```

### 🔐 Bước 6: Invite Bot Vào Server

1. Vào Discord Developer Portal → OAuth2 → URL Generator
2. Chọn scopes: `bot` và `applications.commands`
3. Chọn permissions:
   - ✅ Manage Channels
   - ✅ Manage Roles
   - ✅ View Channels
   - ✅ Send Messages
   - ✅ Manage Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Use Slash Commands

## 📝 Hướng Dẫn Sử Dụng Chi Tiết

### 🎯 **Setup Ban Đầu**

1. **Invite bot** vào server với đầy đủ permissions
2. Chạy `/settings category create` để tạo category tickets
3. Setup support roles với `/settings automation`
4. Cấu hình auto-close với `/ticket-admin auto-close`

### 🎫 **Lệnh Ticket Cơ Bản**

| Lệnh | Mô Tả | Cách Sử Dụng |
|------|-------|--------------|
| `/ticket create` | Tạo ticket mới | `/ticket create subject:Cần hỗ trợ payment` |
| `/ticket close` | Đóng ticket hiện tại | `/ticket close reason:Đã giải quyết` |
| `/ticket reopen` | Mở lại ticket đã đóng | `/ticket reopen` |
| `/ticket claim` | Claim ticket (staff only) | `/ticket claim` |
| `/ticket list` | Danh sách ticket của bạn | `/ticket list status:open` |
| `/ticket info` | Thông tin ticket hiện tại | `/ticket info` |

### 📊 **Lệnh Thống Kê & Analytics**

| Lệnh | Mô Tả | Cách Sử Dụng |
|------|-------|--------------|
| `/stats server` | Thống kê toàn server | `/stats server` |
| `/stats user` | Thống kê người dùng | `/stats user user:@username` |
| `/analytics overview` | Báo cáo tổng quan | `/analytics overview` |
| `/analytics performance` | Phân tích hiệu suất | `/analytics performance` |
| `/analytics trends` | Xu hướng và pattern | `/analytics trends` |
| `/analytics export` | Xuất dữ liệu | `/analytics export format:csv` |

### 🛠️ **Lệnh Admin Nâng Cao**

| Lệnh | Mô Tả | Quyền Yêu Cầu |
|------|-------|---------------|
| `/ticket-admin list` | Liệt kê tất cả tickets | Administrator |
| `/ticket-admin force-close` | Force close ticket | Manage Channels |
| `/ticket-admin cleanup` | Dọn dẹp tickets cũ | Administrator |
| `/ticket-admin export` | Xuất dữ liệu hàng loạt | Administrator |
| `/ticket-admin transfer` | Chuyển ownership | Manage Channels |
| `/ticket-admin auto-close` | Cấu hình auto-close | Administrator |

### ⚙️ **Lệnh Settings & Configuration**

| Lệnh | Mô Tả | Cách Sử Dụng |
|------|-------|--------------|
| `/settings category` | Quản lý categories | `/settings category create name:Support` |
| `/settings automation` | Cấu hình tự động | `/settings automation auto-assignment` |
| `/settings notifications` | Setup thông báo | `/settings notifications dm-notifications` |

### 🔧 **Lệnh Monitoring & Debug**

| Lệnh | Mô Tả | Quyền Yêu Cầu |
|------|-------|---------------|
| `/status-admin performance` | Xem metrics bot | Administrator |
| `/status-admin refresh` | Force refresh stats | Administrator |
| `/status-admin custom` | Set custom status | Administrator |
| `/status-admin maintenance` | Toggle maintenance mode | Administrator |

### 💡 **Lệnh Hỗ Trợ**

| Lệnh | Mô Tả |
|------|-------|
| `/help` | Menu trợ giúp tương tác |
| `/help setup` | Hướng dẫn setup |
| `/help features` | Danh sách tính năng |

## 🎨 Tính Năng Nổi Bật Chi Tiết

### 🤖 **Smart Auto-Close System**

```yaml
Workflow:
1. Detect inactivity (default: 24 hours)
2. Send warning message (2 hours before)
3. Final warning (30 minutes before)
4. Auto-close với transcript
5. Move to closed category
6. Send summary to staff
```

**Cấu hình:**
```bash
/ticket-admin auto-close enabled:true hours:48
```

### 📋 **Advanced Transcript System**

**Tính năng:**
- 📝 Complete message history
- 📎 All attachments preserved
- 👥 Participant tracking
- 🕐 Timestamp accuracy
- 📊 Activity metrics
- 🔍 Searchable content

### 🎯 **Smart Status Management**

Bot hiển thị status động với thông tin realtime:
- 🎫 `/help | v2.0 Advanced Ticket System`
- 👀 `12 active tickets | /ticket create`
- 📊 `1.2K total tickets processed`
- ✅ `15 tickets closed today`
- 🚀 `enterprise-grade support system`

### 📈 **Performance Monitoring**

**Metrics theo dõi:**
- ⚡ Response time trung bình
- 🔄 Status update frequency
- ❌ Error rate và recovery
- 💾 Cache hit ratio
- 🎯 Database query performance

## 🚨 Troubleshooting & FAQ

### ❓ **Câu Hỏi Thường Gặp**

**Q: Bot không phản hồi slash commands?**
```
A: Kiểm tra:
1. Bot có permissions Use Slash Commands
2. Commands đã được deploy: npm run deploy-commands
3. Bot đang online và kết nối database
4. Kiểm tra logs: npm run logs
```

**Q: Không thể tạo ticket?**
```
A: Có thể do:
1. Đã đạt giới hạn MAX_TICKETS_PER_USER
2. Category chưa được setup
3. Bot thiếu permission Manage Channels
4. Database connection issue
```

**Q: Auto-close không hoạt động?**
```
A: Kiểm tra:
1. Cấu hình: /ticket-admin auto-close
2. TICKET_CLOSE_TIMEOUT trong .env
3. Bot process đang chạy liên tục
4. Database có thể ghi được
```

---

<a id="en"></a>
# 🇺🇸 ENGLISH

## 📖 Introduction

**Advanced Discord Ticket Bot v2.0** is a professional Discord ticket management system with enterprise-grade features. Designed for servers requiring professional customer support and efficient request management.

### 🚀 v2.0 Highlights
- ✅ **Complete web dashboard removal** - 100% performance optimization
- ✅ **Enterprise-grade features** - Business-level functionality
- ✅ **Advanced analytics** - Detailed analysis and reporting
- ✅ **Smart automation** - Intelligent automation systems
- ✅ **Performance monitoring** - Real-time performance tracking

## ✨ Core Features

### 🎫 **Comprehensive Ticket Management**
- 📝 Create tickets with custom subjects and priorities
- 🏷️ Automatic ticket numbering system (TK-0001, TK-0002...)
- 👥 Claim and assign tickets to staff
- 🔄 Close, reopen, and transfer tickets
- 🗑️ Permanent ticket deletion with confirmation
- 📋 Ticket listing with filters and pagination
- 💬 Real-time activity and participant tracking

### 📊 **Advanced Analytics & Reporting**
- 📈 **Server statistics**: Total tickets, resolution time, top users
- 👤 **User analysis**: Performance metrics, ticket history
- 📉 **Trend analysis**: 7-day activity, category breakdown
- 📊 **SLA tracking**: Response time, breach detection
- 📤 **Data export**: CSV, JSON, Excel formats
- 🎯 **Performance insights**: Staff efficiency, workload balance

### 🛠️ **Professional Admin Tools**
- 🔧 **Bulk operations**: Mass close, cleanup, transfer
- 🕒 **Auto-close management**: Smart timeout with warnings
- 📋 **Advanced filtering**: Status, user, date range
- 💾 **Database maintenance**: Cleanup old tickets, optimization
- 📤 **Mass export**: Flexible data export options
- ⚙️ **Configuration management**: Per-guild settings

### 🤖 **Smart Automation**
- ⏰ **Smart auto-close**: Inactivity detection with multiple warnings
- 📄 **Auto-transcript**: Automatic transcript generation with attachments
- 🔔 **Notification system**: DM alerts, role mentions
- 📊 **Weekly digests**: Automated reports for administrators
- 🎯 **Priority escalation**: Auto-escalate high priority tickets
- 🔄 **Status management**: Dynamic bot status with real-time stats

## 🚀 Installation & Setup

### 📋 System Requirements
- **Node.js**: v18.0.0 or higher
- **MongoDB**: v4.4 or higher (Atlas or self-hosted)
- **Discord Bot**: Token and permissions
- **RAM**: Minimum 512MB
- **Storage**: 1GB for logs and transcripts

### 🔧 Step 1: Create Discord Bot

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Create **New Application** and name your bot
3. Go to **Bot** tab and create bot token
4. **Important**: Copy token immediately, only shown once!
5. Enable **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 📡 Step 2: Setup MongoDB

**Option A: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://cloud.mongodb.com)
2. Create free cluster
3. Setup database user and whitelist IP
4. Copy connection string

**Option B: Local MongoDB**
```bash
# Ubuntu/Debian
sudo apt install mongodb

# Windows: Download from mongodb.com
# macOS: brew install mongodb-community
```

### 💻 Step 3: Install Bot

```bash
# Clone repository
git clone https://github.com/Hoocs151/discord-ticket-bot.git
cd discord-ticket-bot

# Install dependencies
npm install

# Copy and edit environment file
cp .env.example .env
```

### ⚙️ Step 4: Configure Environment

Edit `.env` file:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_bot_client_id_here
DISCORD_CLIENT_SECRET=your_bot_client_secret_here

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string

# Bot Configuration
NODE_ENV=production
MAX_TICKETS_PER_USER=5
TICKET_CLOSE_TIMEOUT=24
TRANSCRIPT_ENABLED=true
```

### 🚀 Step 5: Start Bot

```bash
# Run development mode
npm run dev

# Run production mode
npm start

# Deploy slash commands
npm run deploy-commands

# Run tests
npm test
```

## 📝 Detailed Usage Guide

### 🎯 **Initial Setup**

1. **Invite bot** to server with full permissions
2. Run `/settings category create` to create ticket categories
3. Setup support roles with `/settings automation`
4. Configure auto-close with `/ticket-admin auto-close`

### 🎫 **Basic Ticket Commands**

| Command | Description | Usage |
|---------|-------------|-------|
| `/ticket create` | Create new ticket | `/ticket create subject:Need payment support` |
| `/ticket close` | Close current ticket | `/ticket close reason:Issue resolved` |
| `/ticket reopen` | Reopen closed ticket | `/ticket reopen` |
| `/ticket claim` | Claim ticket (staff only) | `/ticket claim` |
| `/ticket list` | List your tickets | `/ticket list status:open` |
| `/ticket info` | Current ticket info | `/ticket info` |

### 📊 **Statistics & Analytics Commands**

| Command | Description | Usage |
|---------|-------------|-------|
| `/stats server` | Server statistics | `/stats server` |
| `/stats user` | User statistics | `/stats user user:@username` |
| `/analytics overview` | Overview report | `/analytics overview` |
| `/analytics performance` | Performance analysis | `/analytics performance` |
| `/analytics trends` | Trends and patterns | `/analytics trends` |
| `/analytics export` | Export data | `/analytics export format:csv` |

### 🛠️ **Advanced Admin Commands**

| Command | Description | Required Permission |
|---------|-------------|-------------------|
| `/ticket-admin list` | List all tickets | Administrator |
| `/ticket-admin force-close` | Force close ticket | Manage Channels |
| `/ticket-admin cleanup` | Cleanup old tickets | Administrator |
| `/ticket-admin export` | Bulk data export | Administrator |
| `/ticket-admin transfer` | Transfer ownership | Manage Channels |
| `/ticket-admin auto-close` | Configure auto-close | Administrator |

## 🔄 Updates & Changelog

### v2.0.0 - Major Upgrade
- ✅ Complete web dashboard removal
- ✅ Comprehensive help system
- ✅ Advanced statistics & analytics
- ✅ Auto-close system with warnings
- ✅ Advanced admin tools
- ✅ Enhanced transcript system
- ✅ Message activity tracking
- ✅ Export functionality
- ✅ Ticket transfer system
- ✅ Improved error handling
- ✅ Performance optimization & caching
- ✅ Status management system
- ✅ Settings management GUI
- ✅ Validation & security enhancements

## 📄 License

MIT License - Free to use and modify.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## ⭐ Support the Project

If this bot helps your server, please:
- ⭐ Star the repository
- 🐛 Report issues
- 💡 Suggest features
- 🤝 Contribute code
- 📢 Share with others

---

<div align="center">

## 👥 Authors

- **Hoocshi** – *Contribution: 1%* – [GitHub Profile](https://github.com/Hoocs151)
- **AI** – *Contribution: 99%*

[![GitHub Stars](https://img.shields.io/github/stars/Hoocs151/discord-ticket-bot?style=social)](https://github.com/Hoocs151/discord-ticket-bot)

</div> 