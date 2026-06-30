import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthContext {
  userId: string;
  orgId: string;
  role: string;
}

/** Injects the AuthContext attached by AuthGuard. */
export const Auth = createParamDecorator(
  (_data, ctx: ExecutionContext): AuthContext =>
    ctx.switchToHttp().getRequest().auth,
);
