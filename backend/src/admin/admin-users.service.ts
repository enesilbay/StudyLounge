import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { extendPremiumUntil } from '../payments/plans';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { assertCanManage, escapeLike, toCsv } from './admin-users.rules';
import type {
  PremiumGrant,
  UserFilter,
  UserRole,
  UserSort,
} from './admin-users.rules';
import { UsersQueryDto } from './dto/admin-users.dto';

const TZ = 'Europe/Istanbul';
const EXPORT_LIMIT = 5000;

/** Listede ve dışa aktarmada her kullanıcı için dönen alanlar. */
export interface AdminUserRow {
  id: number;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
  premiumUntil: Date | null;
  isEmailVerified: boolean;
  google: boolean;
  mutedUntil: Date | null;
  bannedAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  totalFocusMinutes: number;
  lastFocusAt: Date | null;
}

const FILTER_SQL: Record<UserFilter, string> = {
  premium: `u."isPremium" = true`,
  admin: `u."role" = 'admin'`,
  muted: `u."mutedUntil" > now()`,
  banned: `u."bannedAt" IS NOT NULL`,
  unverified: `u."isEmailVerified" = false`,
  google: `u."googleId" IS NOT NULL`,
};

const SORT_SQL: Record<UserSort, string> = {
  createdAt: `u."createdAt"`,
  lastFocus: `lf."lastFocusAt"`,
  totalFocus: `u."totalFocusMinutes"`,
  lastSeen: `u."lastSeenAt"`,
};

const ROW_SELECT = `
  u."id", u."username", u."fullName", u."email", u."avatarUrl", u."role", u."isPremium", u."premiumUntil",
  u."isEmailVerified", (u."googleId" IS NOT NULL) AS "google", u."mutedUntil", u."bannedAt", u."createdAt",
  u."lastSeenAt", u."totalFocusMinutes", lf."lastFocusAt"`;

const LAST_FOCUS_JOIN = `
  LEFT JOIN LATERAL (SELECT MAX(s."endedAt") AS "lastFocusAt" FROM "study_sessions" s WHERE s."userId" = u."id") lf ON true`;

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly storage: StorageService,
    private readonly audit: AdminAuditService,
  ) {}

  /** Arama, filtre ve sıralama için WHERE/ORDER parçaları ve parametreleri. */
  private buildQuery(query: UsersQueryDto) {
    const params: unknown[] = [];
    const where: string[] = [];
    if (query.q) {
      params.push(`%${escapeLike(query.q)}%`);
      const p = `$${params.length}`;
      where.push(
        `(u."username" ILIKE ${p} OR u."fullName" ILIKE ${p} OR u."email" ILIKE ${p})`,
      );
    }
    for (const filter of new Set(query.filters ?? []))
      where.push(FILTER_SQL[filter]);
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const direction = query.order === 'asc' ? 'ASC' : 'DESC';
    const orderSql = `ORDER BY ${SORT_SQL[query.sort ?? 'createdAt']} ${direction} NULLS LAST, u."id" DESC`;
    return { params, whereSql, orderSql };
  }

  async list(query: UsersQueryDto) {
    const pageSize = query.pageSize ?? 25;
    const page = query.page ?? 1;
    const { params, whereSql, orderSql } = this.buildQuery(query);
    const [items, [count]] = await Promise.all([
      this.dataSource.query<AdminUserRow[]>(
        `SELECT ${ROW_SELECT} FROM "users" u ${LAST_FOCUS_JOIN} ${whereSql} ${orderSql}
         LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        params,
      ),
      this.dataSource.query<{ total: string }[]>(
        `SELECT COUNT(*) AS "total" FROM "users" u ${whereSql}`,
        params,
      ),
    ]);
    return { items, total: Number(count?.total ?? 0), page, pageSize };
  }

  /** Görünen filtrenin sonucunu CSV olarak verir (en fazla 5000 satır); dışa aktarma kayda yazılır. */
  async exportCsv(adminId: number, query: UsersQueryDto): Promise<string> {
    const { params, whereSql, orderSql } = this.buildQuery(query);
    const rows = await this.dataSource.query<AdminUserRow[]>(
      `SELECT ${ROW_SELECT} FROM "users" u ${LAST_FOCUS_JOIN} ${whereSql} ${orderSql} LIMIT ${EXPORT_LIMIT}`,
      params,
    );
    await this.audit.record({
      adminId,
      action: 'export_users',
      details: {
        count: rows.length,
        q: query.q ?? null,
        filters: query.filters ?? [],
      },
    });
    const yesNo = (value: boolean) => (value ? 'evet' : 'hayır');
    return toCsv(
      [
        'id',
        'kullanıcı adı',
        'ad',
        'e-posta',
        'rol',
        'premium',
        'premium bitişi',
        'e-posta doğrulandı',
        'google',
        'kayıt',
        'son görülme',
        'son odak',
        'toplam odak (dk)',
        'susturma bitişi',
        'yasaklandı',
      ],
      rows.map((row) => [
        row.id,
        row.username,
        row.fullName,
        row.email,
        row.role,
        yesNo(row.isPremium),
        row.premiumUntil,
        yesNo(row.isEmailVerified),
        yesNo(row.google),
        row.createdAt,
        row.lastSeenAt,
        row.lastFocusAt,
        row.totalFocusMinutes,
        row.mutedUntil,
        row.bannedAt,
      ]),
    );
  }

  async detail(id: number) {
    const q = <T>(sql: string, params: unknown[]) =>
      this.dataSource.query<T[]>(sql, params);
    const [
      [user],
      focus,
      sessions,
      reportsAgainst,
      reportCounts,
      payments,
      actions,
    ] = await Promise.all([
      q<
        AdminUserRow & {
          currentStreak: number;
          bestStreak: number;
          coins: number;
          dailyGoalMinutes: number;
          weeklyGoalMinutes: number;
          isOnline: boolean;
          currentRoom: string | null;
        }
      >(
        `SELECT ${ROW_SELECT}, u."currentStreak", u."bestStreak", u."coins", u."dailyGoalMinutes", u."weeklyGoalMinutes",
                u."isOnline", u."currentRoom"
         FROM "users" u ${LAST_FOCUS_JOIN} WHERE u."id" = $1`,
        [id],
      ),
      q<{ date: string; minutes: string }>(
        `WITH days AS (
           SELECT generate_series((now() AT TIME ZONE $2)::date - 29, (now() AT TIME ZONE $2)::date, interval '1 day')::date AS "day"
         )
         SELECT to_char(days."day", 'YYYY-MM-DD') AS "date", COALESCE(SUM(s."minutes"), 0) AS "minutes"
         FROM days
         LEFT JOIN "study_sessions" s ON s."userId" = $1 AND (s."endedAt" AT TIME ZONE $2)::date = days."day"
         GROUP BY days."day" ORDER BY days."day"`,
        [id, TZ],
      ),
      q<{
        id: number;
        startedAt: Date;
        endedAt: Date;
        minutes: number;
        roomName: string | null;
        subject: string | null;
        source: string;
      }>(
        `SELECT s."id", s."startedAt", s."endedAt", s."minutes", s."roomName", sub."name" AS "subject", s."source"
         FROM "study_sessions" s LEFT JOIN "subjects" sub ON sub."id" = s."subjectId"
         WHERE s."userId" = $1 ORDER BY s."endedAt" DESC LIMIT 5`,
        [id],
      ),
      q<{
        id: number;
        reason: string;
        status: string;
        details: string | null;
        messageText: string | null;
        createdAt: Date;
        reporterUsername: string | null;
      }>(
        `SELECT r."id", r."reason", r."status", r."details", r."messageText", r."createdAt", rep."username" AS "reporterUsername"
         FROM "reports" r LEFT JOIN "users" rep ON rep."id" = r."reporterId"
         WHERE r."targetId" = $1 ORDER BY r."createdAt" DESC LIMIT 5`,
        [id],
      ),
      q<{ against: string; againstOpen: string; filed: string }>(
        `SELECT
           (SELECT COUNT(*) FROM "reports" WHERE "targetId" = $1) AS "against",
           (SELECT COUNT(*) FROM "reports" WHERE "targetId" = $1 AND "status" = 'open') AS "againstOpen",
           (SELECT COUNT(*) FROM "reports" WHERE "reporterId" = $1) AS "filed"`,
        [id],
      ),
      q<{
        id: number;
        planId: string;
        amount: string;
        currency: string;
        status: string;
        createdAt: Date;
        premiumUntil: Date | null;
      }>(
        `SELECT "id", "planId", "amount", "currency", "status", "createdAt", "premiumUntil"
         FROM "payments" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 5`,
        [id],
      ),
      this.audit.list({ targetId: id, pageSize: 10 }),
    ]);
    if (!user)
      throw new NotFoundException('Bu hesap bulunamadı; silinmiş olabilir.');
    const counts = reportCounts[0];
    return {
      user,
      focusDaily: focus.map((row) => ({
        date: row.date,
        minutes: Number(row.minutes),
      })),
      recentSessions: sessions,
      reports: {
        against: Number(counts?.against ?? 0),
        againstOpen: Number(counts?.againstOpen ?? 0),
        filed: Number(counts?.filed ?? 0),
        recent: reportsAgainst,
      },
      payments,
      actions: actions.items,
    };
  }

  private async findTarget(id: number) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id },
      select: {
        id: true,
        username: true,
        role: true,
        isPremium: true,
        premiumUntil: true,
        isEmailVerified: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');
    return user;
  }

  /**
   * Rol ve silme için: işlemi yapan yönetici ile hedefin satırlarını (id sırasıyla, kilitlenme
   * olmasın diye) kilitler ve güncel değerlerle kontrol eder. Böylece iki yönetici aynı anda
   * birbirinin rolünü düşüremez, kontrolden sonra yönetici yapılan biri de silinemez.
   */
  private async lockForManage(
    manager: EntityManager,
    adminId: number,
    id: number,
    action: 'role' | 'delete_user',
  ) {
    const rows = await manager.query<
      { id: number; role: string; username: string }[]
    >(
      `SELECT "id", "role", "username" FROM "users" WHERE "id" = ANY($1::int[]) ORDER BY "id" FOR UPDATE`,
      [[adminId, id]],
    );
    const actor = rows.find((row) => row.id === adminId);
    const target = rows.find((row) => row.id === id);
    if (actor?.role !== 'admin')
      throw new ForbiddenException('Bu işlem için yönetici yetkin yok.');
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');
    assertCanManage(adminId, target, action);
    return target;
  }

  async setRole(adminId: number, id: number, role: UserRole, reason?: string) {
    // Yetki vermek kayıtta gerekçesiz kalmasın.
    if (role === 'admin' && (reason?.trim().length ?? 0) < 3) {
      throw new BadRequestException('Yönetici yapmak için gerekçe yaz.');
    }
    await this.dataSource.transaction(async (manager) => {
      const target = await this.lockForManage(manager, adminId, id, 'role');
      if (target.role === role)
        throw new BadRequestException('Kullanıcının rolü zaten bu.');
      await manager.update(User, id, { role });
      await this.audit.record(
        {
          adminId,
          targetId: id,
          targetLabel: target.username,
          action: 'role',
          reason,
          details: { from: target.role, to: role },
        },
        manager,
      );
    });
    return { success: true, role };
  }

  async grantPremium(
    adminId: number,
    id: number,
    plan: PremiumGrant,
    reason?: string,
  ) {
    const target = await this.findTarget(id);
    const unlimited = target.isPremium && !target.premiumUntil;
    if (unlimited)
      throw new BadRequestException("Bu kullanıcının Premium'u zaten süresiz.");
    const premiumUntil =
      plan === 'unlimited'
        ? null
        : extendPremiumUntil(
            target.isPremium ? target.premiumUntil : null,
            plan === 'month' ? 1 : 12,
          );
    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, id, { isPremium: true, premiumUntil });
      await this.audit.record(
        {
          adminId,
          targetId: id,
          targetLabel: target.username,
          action: 'premium_grant',
          reason,
          details: {
            plan,
            from: target.isPremium
              ? (target.premiumUntil?.toISOString() ?? 'süresiz')
              : null,
            until: premiumUntil?.toISOString() ?? 'süresiz',
          },
        },
        manager,
      );
    });
    return { success: true, premiumUntil };
  }

  async revokePremium(adminId: number, id: number, reason?: string) {
    const target = await this.findTarget(id);
    if (!target.isPremium)
      throw new BadRequestException("Bu kullanıcının Premium'u yok.");
    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, id, { isPremium: false, premiumUntil: null });
      await this.audit.record(
        {
          adminId,
          targetId: id,
          targetLabel: target.username,
          action: 'premium_revoke',
          reason,
          details: { until: target.premiumUntil?.toISOString() ?? 'süresiz' },
        },
        manager,
      );
    });
    return { success: true };
  }

  async verifyEmail(adminId: number, id: number, reason?: string) {
    const target = await this.findTarget(id);
    if (target.isEmailVerified)
      throw new BadRequestException('E-posta zaten doğrulanmış.');
    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        codeAttempts: 0,
      });
      await this.audit.record(
        {
          adminId,
          targetId: id,
          targetLabel: target.username,
          action: 'verify_email',
          reason,
        },
        manager,
      );
    });
    return { success: true };
  }

  /** Hesabı siler. Kayıt silmeden önce aynı transaction'da yazılır; hedef boşalsa da adı kayıtta kalır. */
  async deleteUser(
    adminId: number,
    id: number,
    confirmation: string,
    reason: string,
  ) {
    const target = await this.findTarget(id);
    await this.dataSource.transaction(async (manager) => {
      const locked = await this.lockForManage(
        manager,
        adminId,
        id,
        'delete_user',
      );
      if (confirmation.trim() !== locked.username) {
        throw new BadRequestException(
          'Onay için kullanıcı adını aynen yazmalısın.',
        );
      }
      await this.audit.record(
        {
          adminId,
          targetId: id,
          targetLabel: target.username,
          action: 'delete_user',
          reason,
        },
        manager,
      );
      await this.usersService.purgeAccount(id, manager);
    });
    await this.storage.removeByUrl(target.avatarUrl);
    return { success: true };
  }
}
