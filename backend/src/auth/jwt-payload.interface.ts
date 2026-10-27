export interface JwtPayload {
  sub: number;
  email: string;
  username: string;
  /** Token sürümü (`users.tokenVersion`). Eski token'larda yoktur, 0 sayılır. */
  tv?: number;
}

/** Oturum token'ının içeriği; her token üretimi buradan geçer. */
export function buildJwtPayload(user: {
  id: number;
  email: string;
  username: string;
  tokenVersion?: number;
}): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    username: user.username,
    tv: user.tokenVersion ?? 0,
  };
}
