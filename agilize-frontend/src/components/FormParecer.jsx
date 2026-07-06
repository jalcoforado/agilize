import { useState, useRef } from 'react';
import { Paperclip, FileText, File, X, AlertTriangle, Info } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_ANEXOS = 3;
const MAX_MB     = 5;

const EXT_CONFIG = {
  pdf:  { label: 'PDF',  cor: 'text-red-500',     fundo: 'bg-red-50 border-red-200'         },
  doc:  { label: 'DOC',  cor: 'text-blue-600',    fundo: 'bg-blue-50 border-blue-200'       },
  docx: { label: 'DOCX', cor: 'text-blue-600',    fundo: 'bg-blue-50 border-blue-200'       },
  xls:  { label: 'XLS',  cor: 'text-emerald-600', fundo: 'bg-emerald-50 border-emerald-200' },
  xlsx: { label: 'XLSX', cor: 'text-emerald-600', fundo: 'bg-emerald-50 border-emerald-200' },
  ppt:  { label: 'PPT',  cor: 'text-orange-500',  fundo: 'bg-orange-50 border-orange-200'   },
  pptx: { label: 'PPTX', cor: 'text-orange-500',  fundo: 'bg-orange-50 border-orange-200'   },
  txt:  { label: 'TXT',  cor: 'text-neutral-500', fundo: 'bg-neutral-100 border-neutral-200' },
  csv:  { label: 'CSV',  cor: 'text-teal-600',    fundo: 'bg-teal-50 border-teal-200'       },
  png:  { label: 'PNG',  cor: 'text-violet-500',  fundo: 'bg-violet-50 border-violet-200'   },
  jpg:  { label: 'JPG',  cor: 'text-violet-500',  fundo: 'bg-violet-50 border-violet-200'   },
  jpeg: { label: 'JPEG', cor: 'text-violet-500',  fundo: 'bg-violet-50 border-violet-200'   },
  gif:  { label: 'GIF',  cor: 'text-violet-500',  fundo: 'bg-violet-50 border-violet-200'   },
  webp: { label: 'WEBP', cor: 'text-violet-500',  fundo: 'bg-violet-50 border-violet-200'   },
};

const TIPOS_DOC = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'csv'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExt(nome) {
  return nome.split('.').pop()?.toLowerCase() || '';
}

function getConfig(nome) {
  const ext = getExt(nome);
  return (
    EXT_CONFIG[ext] || {
      label: ext.toUpperCase() || 'ARQ',
      cor:   'text-neutral-400',
      fundo: 'bg-neutral-50 border-neutral-200',
    }
  );
}

function fmtBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1_048_576)   return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

// ─── Ícone por extensão ───────────────────────────────────────────────────────

function IconeArquivo({ nome, size = 15 }) {
  const ext  = getExt(nome);
  const { cor } = getConfig(nome);
  const Icone = TIPOS_DOC.includes(ext) ? FileText : File;
  return <Icone size={size} className={`${cor} shrink-0`} />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

const ic =
  'w-full px-3.5 py-2.5 border border-neutral-300 rounded-lg text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-tce-500 focus:border-tce-500 transition resize-none';

export default function FormParecer({
  parecer              = '',
  onParecerChange,
  onTextChange,
  comentario           = '',
  onComentarioChange,
  onAnexosChange,
  minChars             = 20,
  minRows              = 5,
  placeholder          = 'Descreva sua análise ou decisão...',
  label                = 'Parecer',
  showComentario       = true,
  comentarioPlaceholder = 'Observações internas...',
  disabled             = false,
  defaultText          = '',
}) {
  const [charCount,  setCharCount]  = useState(defaultText.length);
  const [isDefault,  setIsDefault]  = useState(!!defaultText);
  const [anexos,     setAnexos]     = useState([]);
  const [erroAnexo,  setErroAnexo]  = useState('');
  const fileRef = useRef(null);

  // ── Parecer ──────────────────────────────────────────────────────────────

  const handleTextChange = (text) => {
    setCharCount(text.trim().length);
    setIsDefault(!!defaultText && text.trim() === defaultText.trim());
    onTextChange?.(text);
  };

  // ── Anexos ───────────────────────────────────────────────────────────────

  const handleFileSelect = (e) => {
    const selecionados = Array.from(e.target.files || []);
    e.target.value = '';
    if (!selecionados.length) return;

    const vagos = MAX_ANEXOS - anexos.length;
    const candidatos = selecionados.slice(0, vagos);

    let erro = '';
    const validos = [];

    for (const f of candidatos) {
      if (f.size > MAX_MB * 1_048_576) {
        erro = `"${f.name}" excede ${MAX_MB} MB e foi ignorado.`;
      } else if (anexos.some(a => a.name === f.name && a.size === f.size)) {
        erro = `"${f.name}" já está anexado.`;
      } else {
        validos.push(f);
      }
    }

    setErroAnexo(erro);

    if (validos.length) {
      const novos = [...anexos, ...validos];
      setAnexos(novos);
      onAnexosChange?.(novos);
    }
  };

  const remover = (idx) => {
    const novos = anexos.filter((_, i) => i !== idx);
    setAnexos(novos);
    setErroAnexo('');
    onAnexosChange?.(novos);
  };

  const podeAnexar = !disabled && anexos.length < MAX_ANEXOS;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">

      {/* Parecer */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {label}{' '}
          <span className="text-red-500">*</span>
          <span className="font-normal text-neutral-400 ml-1">(mín. {minChars} caracteres)</span>
        </label>
        <RichTextEditor
          value={parecer}
          onChange={onParecerChange}
          onTextChange={handleTextChange}
          minRows={minRows}
          placeholder={placeholder}
          disabled={disabled}
        />
        <div className="flex items-center justify-between mt-0.5">
          {isDefault ? (
            <p className="flex items-center gap-1 text-[11px] text-amber-500">
              <Info size={11} className="shrink-0" />
              Texto sugerido — edite se necessário.
            </p>
          ) : (
            <span />
          )}
          <p className="text-[11px] text-neutral-400">{charCount} / 5000</p>
        </div>
      </div>

      {/* Documentos anexados */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-neutral-700">
            Documentos anexados{' '}
            <span className="font-normal text-neutral-400">
              (opcional · máx. {MAX_ANEXOS} arquivos · {MAX_MB} MB cada)
            </span>
          </label>

          {podeAnexar && anexos.length > 0 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-xs text-tce-600 hover:text-tce-800 font-medium transition"
            >
              <Paperclip size={12} />
              Adicionar
            </button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Lista de arquivos */}
        {anexos.length > 0 && (
          <div className="space-y-1.5 mb-1.5">
            {anexos.map((file, i) => {
              const { label: extLabel, cor, fundo } = getConfig(file.name);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 bg-white border border-neutral-200 rounded-lg px-3 py-2 group"
                >
                  <IconeArquivo nome={file.name} size={15} />

                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wide ${cor} ${fundo}`}>
                    {extLabel}
                  </span>

                  <p className="flex-1 text-xs font-medium text-neutral-700 truncate min-w-0" title={file.name}>
                    {file.name}
                  </p>

                  <p className="text-[11px] text-neutral-400 shrink-0 tabular-nums">
                    {fmtBytes(file.size)}
                  </p>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => remover(i)}
                      title="Remover anexo"
                      className="text-neutral-300 hover:text-red-500 transition shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Zona de drop / botão principal (só quando lista vazia ou < max) */}
        {podeAnexar && anexos.length === 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border border-dashed border-neutral-300 hover:border-tce-400 hover:bg-tce-50 rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-tce-600 transition"
          >
            <Paperclip size={13} />
            Clique para anexar — PDF, Word, Excel, PowerPoint, imagens...
          </button>
        )}

        {/* Contador quando há arquivos */}
        {anexos.length > 0 && anexos.length < MAX_ANEXOS && !disabled && (
          <p className="text-[11px] text-neutral-400 mt-1">
            {MAX_ANEXOS - anexos.length} {MAX_ANEXOS - anexos.length === 1 ? 'vaga restante' : 'vagas restantes'}
          </p>
        )}
        {anexos.length === MAX_ANEXOS && (
          <p className="text-[11px] text-neutral-400 mt-1">Limite de {MAX_ANEXOS} documentos atingido.</p>
        )}

        {erroAnexo && (
          <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1.5">
            <AlertTriangle size={11} className="shrink-0" />
            {erroAnexo}
          </p>
        )}
      </div>

      {/* Comentário interno (opcional) */}
      {showComentario && (
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            Comentário interno{' '}
            <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          <textarea
            className={ic}
            rows={2}
            value={comentario}
            onChange={e => onComentarioChange?.(e.target.value)}
            placeholder={comentarioPlaceholder}
            disabled={disabled}
          />
        </div>
      )}

    </div>
  );
}
