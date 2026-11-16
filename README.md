# 访问复核平台 (Access Review Platform)

替代"导出 Excel 发给主管勾"的季度权限复核流程:按季度发起复核活动,把每个人在各系统的权限推给直属主管在线确认;确认撤销的权限由系统连接器**真正收回并回读核对**,全程留痕。

## 技术栈

- **后端** `server/` — NestJS + TypeScript,内存存储(重启重置,接口与持久层解耦,可平替 TypeORM/Prisma)
- **前端** `client/` — Angular(standalone 组件)
- **目标系统** — 本地 Mock 连接器(ERP / CRM / GitLab / OA / BI),`revoke()` 真删权限,`readBack()` 回读核对

## 快速开始

```bash
# 1. 启动后端 (端口 3000)
cd server && npm install && npm run start:dev

# 2. 构建前端并由后端托管 (一个端口看全栈)
cd client && npm install && npm run build
# 打开 http://localhost:3000

# 开发模式也可以前后端分离: ng serve(4200 端口,已开 CORS)
```

## 核心概念

| 概念 | 说明 |
|---|---|
| 复核活动 Campaign | 按季度发起(如 `2026Q4`)。发起时从各系统连接器拉取权限快照,为每条权限生成复核任务 |
| 复核任务 Task | 一条"某人在某系统的某权限",派给被复核人的直属主管;主管可 **确认保留 / 确认撤销 / 委托他人** |
| 撤销作业 Job | 确认撤销后生成,后台处理器调用连接器收回权限,再**回读核对**,状态: PENDING→REVOKED→VERIFIED / FAILED(自动重试 3 次) |
| 超时升级 | 按活动配置的升级规则逐级处理逾期任务(见下) |
| 组织联动 | 活动中途员工换主管 → 其未完成任务转给新主管;主管离职 → 其名下任务转给其上级 |

## 升级规则配置

创建活动时传入 `escalationRules`(不填则用默认):

```json
[
  { "afterDaysOverdue": 0, "action": "REMIND" },
  { "afterDaysOverdue": 2, "action": "ESCALATE_TO_MANAGER" },
  { "afterDaysOverdue": 4, "action": "ESCALATE_TO_OWNER" }
]
```

- `REMIND` — 给当前复核人发提醒(站内通知)
- `ESCALATE_TO_MANAGER` — 任务升级给当前复核人的上级
- `ESCALATE_TO_OWNER` — 任务升级给活动负责人

**演示加速器**: 活动的 `dayLengthSeconds` 字段定义"1 个复核日"对应多少真实秒(默认 86400)。演示时设为 `30`,就能在几分钟内看到 提醒→升级→再升级 的完整链路。

## 演示脚本(建议顺序)

1. 右上角切换身份为 **陈伟(CEO)**,创建活动:期限 2 天、`dayLengthSeconds=30`,发起活动
2. 切换为 **李峰(CTO)**,在"我的复核"处理王芳/张强的任务:确认几条、撤销几条、委托一条给何斌
3. 到"撤销作业"页看收回与回读核对进度(OA 系统的作业会失败重试一次)
4. 到"组织架构"页把王芳的主管改为何斌 → 王芳名下未完成任务自动转给何斌
5. 等 1~2 分钟,看逾期任务自动提醒、逐级升级到 CTO、最终升级到活动负责人
6. 全部处理完后由负责人关闭活动;"审计日志"页可导出全程留痕

## API 一览

```
POST   /api/campaigns                 创建活动(含升级规则)
POST   /api/campaigns/:id/start       发起(生成任务快照)
POST   /api/campaigns/:id/close       关闭(有未完成任务时拒绝)
GET    /api/campaigns/:id/stats       活动统计
GET    /api/tasks?assigneeId=&status= 查询任务
POST   /api/tasks/:id/confirm         确认保留
POST   /api/tasks/:id/revoke          确认撤销(生成撤销作业)
POST   /api/tasks/:id/delegate        委托他人
GET    /api/jobs                      撤销作业列表
PATCH  /api/org/users/:id/manager     调整主管(任务跟随转移)
POST   /api/org/users/:id/deactivate  员工离职(任务转移给上级)
GET    /api/systems/:id/permissions   查看目标系统当前权限(回读)
GET    /api/audit                     审计日志
GET    /api/notifications?userId=     站内通知
```

## 种子数据

11 个用户(CEO→CTO/CFO/销售VP/HR→员工)、5 个系统、约 30 条权限。
其中 **OA 办公系统**模拟老旧系统:每个权限第一次收回必失败,用于演示 FAILED→自动重试→VERIFIED 的路径。
