import type { JourneyDocument, JourneyDefinition } from '../domain/definitions';
import { JourneyArtwork } from './JourneyArtwork';
export function JourneyCard({
  document,
  definition,
}: {
  document: Pick<JourneyDocument, 'kind' | 'title' | 'data'> & { id?: string };
  compact?: boolean;
  definition?: JourneyDefinition;
}) {
  return <JourneyArtwork document={document} definition={definition} />;
}
