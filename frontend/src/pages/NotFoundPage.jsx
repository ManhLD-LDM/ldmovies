import { FiArrowLeft, FiFilm, FiHome } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';

function NotFoundPage() {
  useDocumentTitle('404 - Không Tìm Thấy Trang');
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-dark-200/80 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-500/15 border border-primary-500/30 flex items-center justify-center">
          <FiFilm className="text-primary-400" size={36} />
        </div>
        <p className="text-sm font-bold uppercase tracking-widest text-primary-400 mb-2">
          Lỗi 404
        </p>
        <h1 className="text-3xl font-black text-white mb-3">
          Không tìm thấy trang
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi. Hãy quay lại trang chủ để tiếp tục khám phá.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary-600/30"
          >
            <FiHome size={18} />
            <span>Về Trang Chủ</span>
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-200 font-semibold rounded-xl border border-white/10 transition-colors"
          >
            <FiArrowLeft size={18} />
            <span>Quay Lại</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
