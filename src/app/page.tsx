import { listLinks } from '@/lib/links';
import { listCategories } from '@/lib/categories';
import { allTags } from '@/lib/links';
import HomeClient from './components/HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let links: Awaited<ReturnType<typeof listLinks>> = [];
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let tags: string[] = [];
  let loadError = false;

  try {
    [links, categories, tags] = await Promise.all([
      listLinks({}),
      listCategories(),
      allTags(),
    ]);
  } catch {
    loadError = true;
  }

  return (
    <HomeClient
      initialLinks={links}
      initialCategories={categories}
      initialTags={tags}
      loadError={loadError}
    />
  );
}
