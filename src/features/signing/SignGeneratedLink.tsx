import { Link } from 'react-router-dom';
import { t } from '@/shared/i18n';

export function SignGeneratedLink() {
  return (
    <Link className="dp-btn sign-generated-link" to="/app/sign">
      {t('Sign generated document')} <span aria-hidden="true">→</span>
    </Link>
  );
}
