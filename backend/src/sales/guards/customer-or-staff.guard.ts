import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CustomerOrStaffGuard extends AuthGuard(['jwt', 'customer-jwt']) {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Try customer-jwt first, then jwt
    if (user) {
      return user;
    }
    if (err) {
      throw err;
    }
    throw new UnauthorizedException('Authentication required');
  }
}

