export { firebaseAdmin, FirebaseAdmin } from './firebase-admin';
export { TokenValidator, AuthResult } from './token-validator';
export { UserResolver, ResolvedUser } from './user-resolver';
export { AuthMiddleware, AuthState } from './auth-middleware';

// PAT exports
export { PatGenerator, GenerateTokenOptions, GeneratedToken } from './pat/pat-generator';
export { PatMiddleware } from './pat/pat-middleware';
export { TokenScope, ScopeDefinition, SCOPE_DEFINITIONS, ScopeValidator } from './pat/pat-scopes';