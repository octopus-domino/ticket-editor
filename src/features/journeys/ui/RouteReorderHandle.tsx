import { t } from '@/shared/i18n';
import { PointerReorderHandle } from '@/presentation/components/PointerReorderHandle';

export function RouteReorderHandle(props: { index: number; onMove: (from: number, to: number) => void; disabled: boolean }) {
  return <PointerReorderHandle {...props} itemAttribute="data-route-stop" className="journey-secondary route-reorder-handle"
    label={t('Move stop {0}. Drag or use the up and down arrow keys.', props.index + 1)} />;
}