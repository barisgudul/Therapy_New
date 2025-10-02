// supabase/functions/_shared/contexts/session.context.service.ts
// Bu dosya artık sadece backward compatibility için re-export yapıyor

export {
  getUserRecentActivities,
  prepareEnhancedUserDossier,
  prepareWarmStartContext,
  type RecentActivity,
  type UserDossier,
  type WarmStartContext,
} from "./session.data.service.ts";

export {
  buildActivityContext,
  extractThemes,
  getTimeAgo,
  norm,
  smartFilterMemories,
} from "./session.logic.service.ts";

export {
  buildTextSessionContext as buildTextSessionContextWithDependencies,
  type TextSessionContext,
} from "./session.context.builder.ts";
