import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class CustomerJwtGuard extends AuthGuard('customer-jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest(err: any, customer: any, info: any) {
    if (err || !customer) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return customer;
  }
}


