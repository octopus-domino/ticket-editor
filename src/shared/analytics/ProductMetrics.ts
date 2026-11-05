import { reachGoal } from './metrika';
type ProductGoal = 'library_opened'|'preset_used'|'stamp_created'|'stamp_exported'|'lesson_started'|'lesson_completed'|'excel_import_validated'|'excel_import_failed';
interface Categories { kind?: 'documents'|'stamps'; category?: 'business'|'marketing'|'events'|'personal'; topic?: 'document'|'stamp'|'data'; format?: 'png'|'svg'|'pdf'; count?: number; errors?: number }
/** Only fixed categories and bounded counts cross the analytics boundary, never resource content or identifiers. */
export function productGoal(goal:ProductGoal,values:Categories={}) {
  const params:Record<string,string>={};
  const allowed = { kind:['documents','stamps'], category:['business','marketing','events','personal'], topic:['document','stamp','data'], format:['png','svg','pdf'] };
  for(const key of ['kind','category','topic','format'] as const)if(values[key]&&allowed[key].includes(values[key]!))params[key]=values[key]!;
  for(const key of ['count','errors'] as const)if(typeof values[key]==='number'&&Number.isFinite(values[key]))params[key]=String(Math.max(0,Math.min(10000,Math.round(values[key]!))));
  reachGoal(goal,params);
}
