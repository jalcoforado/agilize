import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ titulo, children, onFechar, largura = 'max-w-lg' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${largura} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">{titulo}</h3>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
