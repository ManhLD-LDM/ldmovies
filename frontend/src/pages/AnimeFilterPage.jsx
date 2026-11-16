import CategoryFilterPage from '../components/CategoryFilterPage';
import { kkphimApi } from '../services/kkphimApi';

function AnimeFilterPage() {
  return (
    <CategoryFilterPage
      title="Bộ Lọc Anime"
      subtitle="Chọn các thể loại để tìm anime phù hợp"
      itemNoun="anime"
      backPath="/anime"
      filterPath="/anime/filter"
      contentType="anime"
      fetchCategories={kkphimApi.getAllCategories}
      fetchFilteredItems={kkphimApi.filterAnimeByCategories}
    />
  );
}

export default AnimeFilterPage;
