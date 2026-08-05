/**
 * schemas/enums.schema.ts
 */
import { z } from 'zod';
import { EB2BRole } from '../domain/enums/EB2BRole';
import { EConeReference } from '../domain/enums/EConeReference';
import { ELiquorCategory } from '../domain/enums/ELiquorCategory';

export const EB2BRoleSchema = z.nativeEnum(EB2BRole);
export const EConeReferenceSchema = z.nativeEnum(EConeReference);
export const ELiquorCategorySchema = z.nativeEnum(ELiquorCategory);