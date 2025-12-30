import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalCustomerAuthGuard extends AuthGuard('customer-jwt') {
  handleRequest(err: any, user: any) {
    // If no user, return null instead of throwing error
    return user || null;
  }
}

