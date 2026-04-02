import TemplatesAdminClient from './templatesAdminClient';

export default function TemplatesAdminPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const selected = typeof searchParams?.selected === 'string' ? searchParams.selected : '';

  return <TemplatesAdminClient selectedFromQuery={selected} />;
}
