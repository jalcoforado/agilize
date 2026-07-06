function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, null, total];
  if (current >= total - 3) return [1, null, total - 4, total - 3, total - 2, total - 1, total];
  return [1, null, current - 1, current, current + 1, null, total];
}

export default function Pagination({ pagina, totalPaginas, total, contagem, onChange }) {
  if (totalPaginas <= 1) return null;

  const pages = buildPages(pagina, totalPaginas);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-xs text-neutral-500 flex-wrap gap-2">
      <span>
        {contagem != null && (
          <><strong className="text-neutral-700">{contagem}</strong> de </>
        )}
        <strong className="text-neutral-700">{total}</strong>{' '}
        registro{total !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, pagina - 1))}
          disabled={pagina === 1}
          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs disabled:opacity-40 hover:bg-neutral-50 transition"
        >
          Anterior
        </button>

        {totalPaginas > 2 && pages.map((p, i) =>
          p === null
            ? <span key={`el-${i}`} className="px-1 text-neutral-400 select-none">…</span>
            : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-8 h-8 rounded-lg border text-xs transition ${
                  p === pagina
                    ? 'bg-tce-700 text-white border-tce-700 font-semibold'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {p}
              </button>
            )
        )}

        <button
          onClick={() => onChange(Math.min(totalPaginas, pagina + 1))}
          disabled={pagina === totalPaginas}
          className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs disabled:opacity-40 hover:bg-neutral-50 transition"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
