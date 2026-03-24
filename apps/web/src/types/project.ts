export enum ProjectStatus {
    PLANNING = 'PLANNING',
    IN_PROGRESS = 'IN_PROGRESS',
    ON_HOLD = 'ON_HOLD',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    REVIEW = 'REVIEW',
    DONE = 'DONE',
    CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum DependencyType {
    FINISH_TO_START = 'FINISH_TO_START',
    START_TO_START = 'START_TO_START',
    FINISH_TO_FINISH = 'FINISH_TO_FINISH',
    START_TO_FINISH = 'START_TO_FINISH'
}

export interface Project {
    id: string;
    code: string;
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    status: ProjectStatus;
    managerId: string;
    createdAt: string;
    updatedAt: string;
    manager?: {
        id: string;
        fullName: string;
        avatar?: string;
    };
    _count?: {
        tasks: number;
        members: number;
    };
}

export interface ProjectTask {
    id: string;
    projectId: string;
    parentId?: string;
    title: string;
    description?: string;
    startDate?: string;
    dueDate?: string;
    duration?: number;
    progress: number;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId?: string;
    position: number;
    createdAt: string;
    updatedAt: string;
    assignee?: {
        id: string;
        fullName: string;
        avatar?: string;
    };
    predecessors?: TaskDependency[];
    children?: ProjectTask[];
}

export interface TaskDependency {
    id: string;
    predecessorId: string;
    successorId: string;
    type: DependencyType;
}

export interface ProjectMember {
    projectId: string;
    employeeId: string;
    role: string;
    joinedAt: string;
    employee: {
        id: string;
        fullName: string;
        avatar?: string;
        jobTitle?: {
            name: string;
        };
    };
}
