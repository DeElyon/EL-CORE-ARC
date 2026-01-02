import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { VerseTokenPayload } from '../auth-bridge.service';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): VerseTokenPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);


