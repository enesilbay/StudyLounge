import { Allow, IsIn, IsString, MaxLength } from 'class-validator';
import { SHOP_ITEM_TYPES } from '../shop-catalog';
import type { ShopItemType } from '../shop-catalog';

/** Satın alma ve kuşanma isteği. */
export class ShopItemDto {
  @IsIn(SHOP_ITEM_TYPES)
  itemType: ShopItemType;

  @IsString()
  @MaxLength(32)
  itemId: string;

  /**
   * Eski mobil istemci fiyatı da gönderiyor. forbidNonWhitelisted isteği reddetmesin
   * diye alan kabul edilir ama hiçbir yerde kullanılmaz; fiyat katalogdan okunur.
   */
  @Allow()
  price?: unknown;
}
