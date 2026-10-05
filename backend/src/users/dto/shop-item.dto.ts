import { IsIn, IsString, MaxLength } from 'class-validator';
import { SHOP_ITEM_TYPES } from '../shop-catalog';
import type { ShopItemType } from '../shop-catalog';

/** Satın alma ve kuşanma isteği. Eski mobil istemcinin gönderdiği `price` alanı whitelist ile atılır. */
export class ShopItemDto {
  @IsIn(SHOP_ITEM_TYPES)
  itemType: ShopItemType;

  @IsString()
  @MaxLength(32)
  itemId: string;
}
