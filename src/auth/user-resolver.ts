import { IUser } from '../database/models/user.model';
import { IProject } from '../database/models/project.model';
import { userRepository } from '../database/repositories/user.repository';
import { projectRepository } from '../database/repositories/project.repository';
import { logger } from '../utils/logger';

export interface ResolvedUser {
  user: IUser;
  project?: IProject;
  permissions: string[];
}

export class UserResolver {
  public static async resolveUserWithProject(
    userId: string,
    projectId?: string
  ): Promise<ResolvedUser | null> {
    try {
      const user = await userRepository.getUserWithDefaultProject(userId);
      if (!user) {
        return null;
      }

      let project: IProject | null = null;
      let permissions: string[] = [];

      if (projectId) {
        // Check if user has access to the specified project
        project = await projectRepository.findById(projectId);
        if (project && (await projectRepository.isMember(projectId, user._id))) {
          const role = await projectRepository.getMemberRole(projectId, user._id);
          permissions = this.getPermissionsForRole(role || 'member');
        } else {
          logger.warn(`User ${user._id} attempted to access unauthorized project ${projectId}`);
          return null;
        }
      } else if (user.defaultProject) {
        // Use default project if no project specified
        project = await projectRepository.findById(user.defaultProject);
        if (project) {
          const role = await projectRepository.getMemberRole(project._id, user._id);
          permissions = this.getPermissionsForRole(role || 'member');
        }
      }

      return {
        user,
        project: project || undefined,
        permissions,
      };
    } catch (error) {
      logger.error('Failed to resolve user with project:', error);
      return null;
    }
  }

  private static getPermissionsForRole(role: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      owner: [
        'project:read',
        'project:write',
        'project:delete',
        'members:read',
        'members:write',
        'api_keys:read',
        'api_keys:write',
        'usage:read',
        'settings:read',
        'settings:write',
      ],
      admin: [
        'project:read',
        'project:write',
        'members:read',
        'members:write',
        'api_keys:read',
        'api_keys:write',
        'usage:read',
        'settings:read',
        'settings:write',
      ],
      member: [
        'project:read',
        'members:read',
        'api_keys:read',
        'usage:read',
        'settings:read',
      ],
    };

    return rolePermissions[role] || [];
  }

  public static hasPermission(permissions: string[], requiredPermission: string): boolean {
    return permissions.includes(requiredPermission);
  }
}