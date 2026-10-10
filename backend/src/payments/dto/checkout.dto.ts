import { IsIn } from 'class-validator';
import { PREMIUM_PLAN_IDS } from '../plans';
import type { PremiumPlanId } from '../plans';

export class CheckoutDto {
  @IsIn(PREMIUM_PLAN_IDS)
  planId: PremiumPlanId;
}
