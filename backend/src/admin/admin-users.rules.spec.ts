import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  assertCanManage,
  csvCell,
  escapeLike,
  toCsv,
} from './admin-users.rules';

describe('assertCanManage', () => {
  it('yönetici kendi rolünü değiştiremez', () => {
    expect(() => assertCanManage(1, { id: 1, role: 'admin' }, 'role')).toThrow(
      BadRequestException,
    );
  });

  it('yönetici kendini silemez', () => {
    expect(() =>
      assertCanManage(1, { id: 1, role: 'admin' }, 'delete_user'),
    ).toThrow(BadRequestException);
  });

  it('başka bir yönetici, rolü düşürülmeden silinemez', () => {
    expect(() =>
      assertCanManage(1, { id: 2, role: 'admin' }, 'delete_user'),
    ).toThrow(ForbiddenException);
  });

  it('başka bir yöneticinin rolü değiştirilebilir', () => {
    expect(() =>
      assertCanManage(1, { id: 2, role: 'admin' }, 'role'),
    ).not.toThrow();
  });

  it('normal kullanıcı silinebilir', () => {
    expect(() =>
      assertCanManage(1, { id: 2, role: 'user' }, 'delete_user'),
    ).not.toThrow();
  });
});

describe('csv', () => {
  it('formül gibi başlayan metni etkisizleştirir', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@kim')).toBe(`'@kim`);
  });

  it('ayraç ve tırnak içeren metni tırnaklar', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('Ali "Kaptan"')).toBe('"Ali ""Kaptan"""');
  });

  it('boş ve sayısal değerleri olduğu gibi yazar', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(-5)).toBe('-5');
  });

  it('BOM ile başlar ve satırları CRLF ile ayırır', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a;b\r\n1;x');
  });
});

describe('escapeLike', () => {
  it('joker karakterleri kaçırır', () => {
    expect(escapeLike('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });
});
