import React from 'react';
import { GenerationPage } from './GenerationPage';

/**
 * @deprecated Route-обёртка оставлена для обратной совместимости.
 * GenerationPage теперь сам резолвит шаблон и модели через URL и стор.
 * Используйте напрямую: `<Route path="/generate" element={<GenerationPage />} />`.
 */
export const GenerationRoutePage: React.FC = () => <GenerationPage />;