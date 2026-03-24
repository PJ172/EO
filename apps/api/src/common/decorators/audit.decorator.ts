import { Action } from '../../modules/audit/audit.enums';
import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';
export const Audit = (action: Action) => SetMetadata(AUDIT_ACTION_KEY, action);
