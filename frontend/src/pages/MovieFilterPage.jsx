import CategoryFilterPage from '../components/CategoryFilterPage';
import { kkphimApi } from '../services/kkphimApi';

function MovieFilterPage() {
  return (
    <CategoryFilterPage
      title="Bộ Lọc Phim"
      subtitle="Chọn các thể loại để tìm phim phù hợp"
      itemNoun="phim"
      backPath="/movies"
      filterPath="/movies/filter"
      contentType="movie"
      fetchCategories={kkphimApi.getAllMovieCategories}
      fetchFilteredItems={kkphimApi.filterMoviesByCategories}
    />
  );
}

export default MovieFilterPage;
