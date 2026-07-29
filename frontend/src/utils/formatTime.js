export function formatTimeAgo(dateString) {
  if (!dateString) return 'Vừa cập nhật';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  // Nếu chênh lệch bị âm (do lệch múi giờ nhỏ) hoặc dưới 60 giây, hiển thị Vừa cập nhật
  if (seconds < 60) return 'Vừa cập nhật';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Cập nhật ${minutes}p trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Cập nhật ${hours}h trước`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `Cập nhật ${days}d trước`;

  const months = Math.floor(days / 30);
  if (months < 12) return `Cập nhật ${months} tháng trước`;

  const years = Math.floor(days / 365);
  return `Cập nhật ${years} năm trước`;
}
