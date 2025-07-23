export enum TokenScope {
  // API Access
  API_READ = 'api:read',
  API_WRITE = 'api:write',
  
  // Project Management
  PROJECTS_READ = 'projects:read',
  PROJECTS_WRITE = 'projects:write',
  
  // User Management
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  
  // Admin Access
  ADMIN = 'admin',
}

export interface ScopeDefinition {
  scope: TokenScope;
  name: string;
  description: string;
  category: 'api' | 'projects' | 'users' | 'admin';
}

export const SCOPE_DEFINITIONS: ScopeDefinition[] = [
  {
    scope: TokenScope.API_READ,
    name: 'API Read',
    description: 'Read access to proxy AI APIs',
    category: 'api',
  },
  {
    scope: TokenScope.API_WRITE,
    name: 'API Write',
    description: 'Write access to proxy AI APIs',
    category: 'api',
  },
  {
    scope: TokenScope.PROJECTS_READ,
    name: 'Projects Read',
    description: 'Read access to projects and their settings',
    category: 'projects',
  },
  {
    scope: TokenScope.PROJECTS_WRITE,
    name: 'Projects Write',
    description: 'Create, update, and delete projects',
    category: 'projects',
  },
  {
    scope: TokenScope.USERS_READ,
    name: 'Users Read',
    description: 'Read access to user profiles',
    category: 'users',
  },
  {
    scope: TokenScope.USERS_WRITE,
    name: 'Users Write',
    description: 'Update user profiles and settings',
    category: 'users',
  },
  {
    scope: TokenScope.ADMIN,
    name: 'Admin',
    description: 'Full administrative access',
    category: 'admin',
  },
];

export class ScopeValidator {
  /**
   * Check if a scope is valid
   */
  public static isValidScope(scope: string): boolean {
    return Object.values(TokenScope).includes(scope as TokenScope);
  }

  /**
   * Validate an array of scopes
   */
  public static validateScopes(scopes: string[]): boolean {
    return scopes.every(scope => this.isValidScope(scope));
  }

  /**
   * Get scope definition
   */
  public static getScopeDefinition(scope: string): ScopeDefinition | undefined {
    return SCOPE_DEFINITIONS.find(def => def.scope === scope);
  }

  /**
   * Check if scopes include a specific scope or admin
   */
  public static hasScope(userScopes: string[], requiredScope: string): boolean {
    return userScopes.includes(requiredScope) || userScopes.includes(TokenScope.ADMIN);
  }

  /**
   * Get scopes by category
   */
  public static getScopesByCategory(category: string): ScopeDefinition[] {
    return SCOPE_DEFINITIONS.filter(def => def.category === category);
  }
}