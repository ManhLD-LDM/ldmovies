export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'a-z', label: 'A - Z' },
  { value: 'z-a', label: 'Z - A' },
];

export const sortMovies = (movies, sortOption = 'newest') => {
  if (!movies || !Array.isArray(movies)) return [];
  
  const copy = [...movies];

  switch (sortOption) {
    case 'newest':
      return copy.sort((a, b) => {
        const yearA = parseInt(a.year || '0', 10);
        const yearB = parseInt(b.year || '0', 10);
        if (yearB !== yearA) return yearB - yearA;
        return (b.name || '').localeCompare(a.name || '', 'vi');
      });
    case 'oldest':
      return copy.sort((a, b) => {
        const yearA = parseInt(a.year || '0', 10);
        const yearB = parseInt(b.year || '0', 10);
        if (yearA !== yearB) return yearA - yearB;
        return (a.name || '').localeCompare(b.name || '', 'vi');
      });
    case 'a-z':
      return copy.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    case 'z-a':
      return copy.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'vi'));
    default:
      return copy;
  }
};
