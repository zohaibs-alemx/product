import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable()
export class OptionalJwtGuard extends AuthGuard(['jwt', 'customer-jwt']) {
  // This guard allows requests to proceed even if authentication fails
  // Useful for guest checkout where auth is optional
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Try to authenticate, but allow request to proceed if it fails
    try {
      const result = super.canActivate(context);
      
      // Handle Observable
      if (result && typeof (result as any).pipe === 'function') {
        return (result as Observable<boolean>).pipe(
          catchError(() => {
            // If auth fails, allow request to proceed (guest checkout)
            return of(true);
          }),
        );
      }
      
      // Handle Promise
      if (result instanceof Promise) {
        return result.catch(() => {
          // If auth fails, allow request to proceed (guest checkout)
          return true;
        });
      }
      
      // Handle boolean (synchronous)
      return result as boolean;
    } catch (error) {
      // If authentication fails synchronously, allow request to proceed
      return true;
    }
  }

  handleRequest(err: any, user: any, info: any) {
    // If no user (guest), return null instead of throwing error
    if (err || !user) {
      return null; // Guest user - no error thrown
    }
    return user;
  }
}

