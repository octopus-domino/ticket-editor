import type { Slide, DataRoot } from '@/shared/types';

export interface TemplateBundle {
  id: string;
  name: string;
  icon: string;
  description: string;
  build: () => { slide: Slide; data: DataRoot[] };
}